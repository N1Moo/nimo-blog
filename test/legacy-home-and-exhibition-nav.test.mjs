import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homePage = readFileSync("src/pages/index.astro", "utf8");
const legacyHome = readFileSync("src/components/home/LegacyHomeDiorama.astro", "utf8");
const exhibitionPage = readFileSync("src/pages/exhibitions.astro", "utf8");

test("homepage uses the original room diorama instead of the story timeline", () => {
  assert.match(homePage, /LegacyHomeDiorama/);
  assert.doesNotMatch(homePage, /HomeStoryScene|homeStoryScenes|homeContent/);
  assert.match(legacyHome, /data-diorama-canvas/);
  assert.match(legacyHome, /Dor3iEe3\.js/);
  assert.match(legacyHome, /window\.blogGoToRoute/);
});

test("exhibition page keeps a visible site navigation above its iframe", () => {
  assert.match(exhibitionPage, /class="exhibition-nav"/);
  assert.match(exhibitionPage, /aria-current="page">展览/);
  assert.match(exhibitionPage, /height: calc\(100% - 4rem\)/);
  assert.match(exhibitionPage, /<a href="\/">首页<\/a>/);
});
