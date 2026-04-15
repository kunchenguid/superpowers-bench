import { extname, resolve } from "node:path";

export interface ChromeVersionResponse {
  webSocketDebuggerUrl?: string;
}

export interface CdpContentSize {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CdpScreenshotClip {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: 1;
}

export type CdpQuad = [number, number, number, number, number, number, number, number];

export function socialFileUrl(filePath: string): string {
  return new URL(`file://${resolve(filePath)}`).toString();
}

export function socialPngPath(filePath: string): string {
  const absolute = resolve(filePath);
  return absolute.slice(0, -extname(absolute).length) + ".png";
}

export function cdpWebSocketUrl(version: ChromeVersionResponse): string {
  if (!version.webSocketDebuggerUrl) {
    throw new Error("Chrome did not expose webSocketDebuggerUrl");
  }
  return version.webSocketDebuggerUrl;
}

export function cdpBodyClip(contentSize: CdpContentSize): CdpScreenshotClip {
  return {
    x: Math.max(0, Math.floor(contentSize.x)),
    y: Math.max(0, Math.floor(contentSize.y)),
    width: Math.ceil(contentSize.width),
    height: Math.ceil(contentSize.height),
    scale: 1,
  };
}

export function cdpClipFromQuad(quad: CdpQuad): CdpScreenshotClip {
  const xs = [quad[0], quad[2], quad[4], quad[6]];
  const ys = [quad[1], quad[3], quad[5], quad[7]];
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: Math.floor(minX),
    y: Math.floor(minY),
    width: Math.ceil(maxX - minX),
    height: Math.ceil(maxY - minY),
    scale: 1,
  };
}
