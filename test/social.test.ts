import test from "node:test";
import assert from "node:assert/strict";

import {
  cdpBodyClip,
  cdpClipFromQuad,
  cdpWebSocketUrl,
  socialFileUrl,
  socialPngPath,
} from "../src/social.ts";

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
