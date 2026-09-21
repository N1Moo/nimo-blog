import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve("dist/client");
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".woff2", "font/woff2"],
  [".json", "application/json; charset=utf-8"],
  [".webp", "image/webp"],
]);

const resolvePath = (url) => {
  const pathname = decodeURIComponent(new URL(url, "http://127.0.0.1").pathname);
  const candidate = path.join(root, pathname);
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  if (existsSync(path.join(candidate, "index.html"))) return path.join(candidate, "index.html");
  if (existsSync(`${candidate}.html`)) return `${candidate}.html`;
  return null;
};

const server = createServer((request, response) => {
  const file = resolvePath(request.url || "/");
  if (!file) {
    response.writeHead(404).end("Not Found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes.get(path.extname(file)) || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(file).pipe(response);
});

const remoteBaseUrl = process.env.VERIFY_BASE_URL?.replace(/\/$/, "");
if (!remoteBaseUrl) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}
const address = server.address();
const baseUrl = remoteBaseUrl || `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  const errors = [];
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  desktop.on("pageerror", (error) => errors.push(error.message));
  await desktop.goto(baseUrl, { waitUntil: "networkidle" });
  await desktop.waitForTimeout(2_000);
  const home = await desktop.evaluate(() => ({
    title: document.title,
    canvases: document.querySelectorAll("canvas").length,
    canvasSize: [...document.querySelectorAll("canvas")].map((canvas) => [canvas.width, canvas.height]),
    scrollHeight: document.documentElement.scrollHeight,
    hasLegacyScene: Boolean(document.querySelector(".legacy-home-diorama")),
    hasStoryScene: Boolean(document.querySelector(".home-story")),
    vendorLoaded: performance.getEntriesByType("resource").some((entry) => entry.name.includes("Dor3iEe3.js")),
  }));
  await desktop.screenshot({ path: "verify-legacy-home.png", fullPage: false });

  await desktop.goto(`${baseUrl}/exhibitions`, { waitUntil: "networkidle" });
  await desktop.waitForTimeout(1_000);
  const exhibition = await desktop.evaluate(() => {
    const nav = document.querySelector(".exhibition-nav");
    const frame = document.querySelector("iframe");
    return {
      navVisible: nav ? getComputedStyle(nav).display !== "none" : false,
      navHeight: nav?.getBoundingClientRect().height ?? 0,
      frameTop: frame?.getBoundingClientRect().top ?? 0,
      activeText: document.querySelector("[aria-current='page']")?.textContent?.trim(),
      workCount: frame?.contentWindow?._A?.config?.data?.workL ?? null,
      workItems: frame?.contentDocument?.querySelectorAll("#li > li").length ?? null,
    };
  });
  await desktop.screenshot({ path: "verify-exhibition-nav.png", fullPage: false });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on("pageerror", (error) => errors.push(error.message));
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  await mobile.waitForTimeout(1_500);
  const mobileHome = await mobile.evaluate(() => ({
    canvas: document.querySelector("canvas")?.getBoundingClientRect().toJSON(),
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  await mobile.screenshot({ path: "verify-legacy-home-mobile.png", fullPage: false });

  const criticalErrors = errors.filter((error) => !error.includes("获取搜索索引失败"));
  const result = { home, exhibition, mobileHome, errors, criticalErrors };
  console.log(JSON.stringify(result, null, 2));
  if (
    !home.hasLegacyScene ||
    home.hasStoryScene ||
    !home.vendorLoaded ||
    !exhibition.navVisible ||
    exhibition.workCount !== 12 ||
    exhibition.workItems !== 12 ||
    criticalErrors.length
  ) {
    throw new Error(`Legacy homepage verification failed: ${JSON.stringify(result)}`);
  }
} finally {
  await browser.close();
  if (!remoteBaseUrl) {
    await new Promise((resolve) => server.close(resolve));
  }
}
