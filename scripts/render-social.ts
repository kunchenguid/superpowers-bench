import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { tmpdir } from "node:os";
import {
  cdpClipFromQuad,
  cdpWebSocketUrl,
  socialFileUrl,
  socialPngPath,
  type ChromeVersionResponse,
} from "../src/social.ts";

const CHROME_BIN = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function getFreePort(): Promise<number> {
  return await new Promise((resolvePort, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to allocate a free port"));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) reject(error);
        else resolvePort(port);
      });
    });
  });
}

async function waitForDriver(baseUrl: string): Promise<void> {
  const deadline = Date.now() + 10000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/json/version`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 200));
  }
  throw new Error(`Chrome remote debugging did not become ready: ${String(lastError)}`);
}

async function webdriver<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as { value?: T; message?: string };
  if (!response.ok) {
    throw new Error(payload.message ?? `WebDriver request failed: ${response.status}`);
  }
  return payload.value as T;
}

async function cdpJson<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`CDP HTTP request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

class CdpSession {
  private socket: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  constructor(socketUrl: string) {
    this.socket = new WebSocket(socketUrl);
    this.socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: { message?: string }; method?: string };
      if (!payload.id) return;
      const waiter = this.pending.get(payload.id);
      if (!waiter) return;
      this.pending.delete(payload.id);
      if (payload.error) waiter.reject(new Error(payload.error.message ?? "CDP request failed"));
      else waiter.resolve(payload.result);
    });
    this.socket.addEventListener("close", () => {
      for (const [, waiter] of this.pending) {
        waiter.reject(new Error("CDP socket closed"));
      }
      this.pending.clear();
    });
  }

  async open(): Promise<void> {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise<void>((resolveOpen, rejectOpen) => {
      this.socket.addEventListener("open", () => resolveOpen(), { once: true });
      this.socket.addEventListener("error", () => rejectOpen(new Error("Failed to open CDP socket")), {
        once: true,
      });
    });
  }

  async send<T>(method: string, params?: object): Promise<T> {
    const id = this.nextId++;
    const response = new Promise<T>((resolveResponse, rejectResponse) => {
      this.pending.set(id, { resolve: resolveResponse as (value: unknown) => void, reject: rejectResponse });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return await response;
  }

  close(): void {
    this.socket.close();
  }
}

async function startDriver(): Promise<{ child: ChildProcess; baseUrl: string; userDataDir: string }> {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const userDataDir = mkdtempSync(`${tmpdir()}/superpowers-social-chrome-`);
  const child = spawn(CHROME_BIN, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.stderr.write(stderr);
    }
  });

  await waitForDriver(baseUrl);
  return { child, baseUrl, userDataDir };
}

async function main(): Promise<void> {
  const htmlPaths = process.argv.slice(2);
  if (htmlPaths.length === 0) {
    throw new Error("Usage: tsx scripts/render-social.ts docs/social/f1.html [more html files]");
  }

  const { child, baseUrl, userDataDir } = await startDriver();
  let pageId = "";
  let session: CdpSession | undefined;

  try {
    const version = await cdpJson<ChromeVersionResponse>(baseUrl, "/json/version");
    cdpWebSocketUrl(version);

    for (const htmlPath of htmlPaths) {
      const absoluteHtml = resolve(htmlPath);
      const pngPath = socialPngPath(absoluteHtml);
      mkdirSync(dirname(pngPath), { recursive: true });
      const fileUrl = socialFileUrl(absoluteHtml);

      const target = await cdpJson<{ id: string; webSocketDebuggerUrl: string }>(
        baseUrl,
        `/json/new?${encodeURIComponent(fileUrl)}`,
        { method: "PUT" },
      );
      pageId = target.id;
      session = new CdpSession(target.webSocketDebuggerUrl);
      await session.open();

      await session.send("Page.enable");
      await session.send("Emulation.setDeviceMetricsOverride", {
        width: 1200,
        height: 1200,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await session.send("Page.navigate", { url: fileUrl });
      await new Promise((resolveSleep) => setTimeout(resolveSleep, 250));
      await session.send("DOM.enable");
      const documentNode = await session.send<{ root: { nodeId: number } }>("DOM.getDocument", {
        depth: 0,
      });
      const bodyNode = await session.send<{ nodeId: number }>("DOM.querySelector", {
        nodeId: documentNode.root.nodeId,
        selector: "body",
      });
      const boxModel = await session.send<{ model: { border: [number, number, number, number, number, number, number, number] } }>(
        "DOM.getBoxModel",
        { nodeId: bodyNode.nodeId },
      );
      const screenshot = await session.send<{ data: string }>("Page.captureScreenshot", {
        format: "png",
        clip: cdpClipFromQuad(boxModel.model.border),
        fromSurface: true,
      });

      writeFileSync(pngPath, Buffer.from(screenshot.data, "base64"));
      process.stdout.write(`Rendered ${basename(pngPath)}\n`);

      session.close();
      session = undefined;
      await fetch(`${baseUrl}/json/close/${pageId}`).catch(() => {});
      pageId = "";
    }
  } finally {
    session?.close();
    if (pageId) await fetch(`${baseUrl}/json/close/${pageId}`).catch(() => {});
    child.kill();
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Chrome can still be releasing files briefly after process shutdown.
    }
  }
}

await main();
