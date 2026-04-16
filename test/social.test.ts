import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  cdpBodyClip,
  cdpClipFromQuad,
  cdpWebSocketUrl,
  socialFileUrl,
  socialPngPath,
} from "../src/social.ts";

const ROOT = join(import.meta.dirname, "..");

test("socialPngPath swaps html extension for png", () => {
  assert.equal(
    socialPngPath("/tmp/docs/social/f1.html"),
    "/tmp/docs/social/f1.png",
  );
});

test("socialFileUrl builds a file URL", () => {
  assert.equal(
    socialFileUrl("/tmp/docs/social/f1.html"),
    "file:///tmp/docs/social/f1.html",
  );
});

test("cdpWebSocketUrl reads Chrome debugger websocket URL", () => {
  assert.equal(
    cdpWebSocketUrl({ webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/browser/abc" }),
    "ws://127.0.0.1:9222/devtools/browser/abc",
  );
});

test("cdpBodyClip converts content size into a screenshot clip", () => {
  assert.deepEqual(
    cdpBodyClip({ x: 0, y: 0, width: 1000, height: 742 }),
    { x: 0, y: 0, width: 1000, height: 742, scale: 1 },
  );
});

test("cdpClipFromQuad builds a clip rectangle from a CDP quad", () => {
  assert.deepEqual(
    cdpClipFromQuad([24, 24, 1024, 24, 1024, 766, 24, 766]),
    { x: 24, y: 24, width: 1000, height: 742, scale: 1 },
  );
});

test("f1 social poster replaces OpenCode with Claude Opus 4.7", () => {
  const html = readFileSync(join(ROOT, "docs/social/f1.html"), "utf8");

  assert.equal(html.includes("OpenCode"), false);
  assert.equal(html.includes("opus-4-7"), true);
  assert.equal(html.includes(">70%<"), true);
  assert.equal(html.includes(">72%<"), true);
});

test("details social poster shows Claude Opus 4.7 metrics instead of OpenCode", () => {
  const html = readFileSync(join(ROOT, "docs/social/details.html"), "utf8");

  assert.equal(html.includes("OpenCode"), false);
  assert.equal(html.includes("18 TASKS, 108 RUNS TOTAL"), true);
  assert.equal(html.includes("95%"), true);
  assert.equal(html.includes("98%"), true);
  assert.equal(html.includes("72%"), true);
  assert.equal(html.includes("56%"), true);
  assert.equal(html.includes("opus-4-7"), true);
});
