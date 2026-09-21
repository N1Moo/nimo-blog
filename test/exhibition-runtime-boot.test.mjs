import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const exhibitionPage = readFileSync("src/pages/exhibitions.astro", "utf8");
const exhibitionClone = readFileSync("public/exhibition-clone.html", "utf8");
const header = readFileSync("src/components/layout/Header.astro", "utf8");

test("exhibition starts at DOM readiness and bypasses partial navigation", () => {
  assert.match(exhibitionClone, /DOMContentLoaded", mountRuntime/);
  assert.doesNotMatch(exhibitionClone, /window\.addEventListener\("load"/);
  assert.match(header, /data-no-swup=\{item\.href === "\/exhibitions"/);
  assert.match(exhibitionPage, /exhibition-clone\.html\?v=20260829-12works/);
});

test("exhibition keeps only the personalized email destination", () => {
  assert.match(exhibitionClone, /zhfnimo@gmail\.com/);
  assert.match(exhibitionClone, /data-external-disabled/);
});

test("exhibition limits the desktop carousel to twelve projects", () => {
  assert.match(exhibitionClone, /const exhibitionLimit = 12;/);
  assert.match(exhibitionClone, /payload\.data\.work = payload\.data\.work\.slice\(0, exhibitionLimit\);/);
  assert.match(exhibitionClone, /payload\.data\.workL = payload\.data\.work\.length;/);
  assert.match(exhibitionClone, /if \(index >= exhibitionLimit\) item\.remove\(\);/);
  assert.match(exhibitionClone, /String\(exhibitionLimit\)\.padStart\(2, "0"\)/);
});
