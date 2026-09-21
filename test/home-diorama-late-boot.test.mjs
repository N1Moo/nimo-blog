import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const readIfExists = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

const homeDiorama = readIfExists("src/components/home/HomeDiorama.astro");
const homeBoot = readIfExists("src/components/home/homeDioramaBoot.js");

test("home diorama keeps its loader non-blocking", () => {
  assert.match(homeDiorama, /data-home-loading[^>]*hidden/);
  assert.match(homeDiorama, /data-home-visible="false"/);
  assert.match(homeDiorama, /data-cue-mode="loading"/);
});

test("home diorama switches from idle boot to load-gated late boot", () => {
  assert.match(homeDiorama, /import\s+\{[\s\S]*mountHomeDioramaBoot[\s\S]*\}\s+from "\.\/homeDioramaBoot\.js"/);
  assert.doesNotMatch(homeDiorama, /requestIdleCallback/);
  assert.doesNotMatch(homeDiorama, /cancelIdleCallback/);
  assert.doesNotMatch(homeDiorama, /requestAnimationFrame\(\(\)\s*=>\s*\{/);
});

test("home diorama boots from DOM readiness and cancels on navigation intent", () => {
  assert.match(homeBoot, /const HOME_DIORAMA_BOOT_DELAY_MS = 180;/);
  assert.match(homeBoot, /const HOME_DIORAMA_DOM_BOOT_DELAY_MS = 0;/);
  assert.match(homeBoot, /window\.addEventListener\("load", handleWindowLoad, \{ once: true \}\);/);
  assert.match(homeBoot, /window\.setTimeout\(queueBoot, HOME_DIORAMA_DOM_BOOT_DELAY_MS\)/);
  assert.match(homeBoot, /window\.setTimeout\(startBoot, HOME_DIORAMA_BOOT_DELAY_MS\)/);
  assert.match(homeBoot, /document\.addEventListener\("click", handleNavigationIntent, true\);/);
  assert.match(homeBoot, /if \(nextUrl\.pathname !== window\.location\.pathname\) \{/);
  assert.match(homeBoot, /cancelScheduledBoot\(\);/);
  assert.match(homeBoot, /window\[HOME_DIORAMA_MODULE_KEY\] \?\?= importDiorama\(\);/);
});
