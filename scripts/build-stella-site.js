/**
 * Crawls https://stella.school/ (same-origin HTML pages only),
 * extracts main content per page, merges unique stylesheets, writes one HTML file.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { chromium } = require("playwright");

const START_URL = "https://stella.school/";
const OUT_FILE = path.join(__dirname, "..", "stella-school-site.html");
const MAX_PAGES = 200;
const PAGE_TIMEOUT_MS = 60000;

function normalizePageUrl({ urlString }) {
  let u;
  try {
    u = new URL(urlString);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./i, "").toLowerCase();
  if (host !== "stella.school") return null;
  u.protocol = "https:";
  u.hostname = "stella.school";
  u.hash = "";
  let pathname = u.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  u.pathname = pathname || "/";
  u.search = "";
  return u.href;
}

function shouldEnqueueUrl({ normalizedHref }) {
  if (!normalizedHref) return false;
  const u = new URL(normalizedHref);
  const p = u.pathname.toLowerCase();
  const deny =
    p.startsWith("/wp-admin") ||
    p.startsWith("/wp-json") ||
    p.startsWith("/wp-includes") ||
    p.includes("xmlrpc") ||
    p.endsWith(".xml") ||
    /\.(pdf|zip|rar|jpg|jpeg|png|gif|webp|svg|ico|woff2?|ttf|eot|mp4|webm)(\?|$)/i.test(
      p,
    );
  return !deny;
}

function slugFromUrl({ href }) {
  const u = new URL(href);
  let raw = u.pathname.replace(/^\/+|\/+$/g, "");
  if (!raw) return "trang-chu";
  const slug = raw
    .split("/")
    .join("-")
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "page";
}

function fetchTextUrl({ urlString }) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlString);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      urlString,
      { method: "GET", headers: { "user-agent": "stella-site-builder/1.0" } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchTextUrl({ urlString: new URL(res.headers.location, urlString).href })
            .then(resolve)
            .catch(reject);
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => resolve(data));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function collectStylesheetHrefs({ page }) {
  return page.evaluate(() =>
    [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map((l) => l.href)
      .filter(Boolean),
  );
}

async function extractMainHtml({ page }) {
  return page.evaluate(() => {
    const removeFrom = (root) => {
      root
        .querySelectorAll(
          "script, noscript, iframe, style, link[rel=preload], template",
        )
        .forEach((n) => n.remove());
    };

    const candidates = [
      ".elementor-location-main",
      "main .elementor",
      "main",
      "#main",
      ".site-main",
      "#content",
      ".entry-content",
      "#primary",
    ];

    let root = null;
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 80) {
        root = el;
        break;
      }
    }
    if (!root) {
      root = document.querySelector("#page") || document.body;
    }

    const clone = root.cloneNode(true);
    removeFrom(clone);

    const abs = (attr, base) => {
      clone.querySelectorAll(`[${attr}]`).forEach((node) => {
        const v = node.getAttribute(attr);
        if (!v || v.startsWith("data:") || v.startsWith("#")) return;
        try {
          node.setAttribute(attr, new URL(v, base).href);
        } catch {
          /* keep */
        }
      });
    };

    const base = document.baseURI || location.href;
    abs("src", base);
    abs("href", base);
    abs("poster", base);

    const title = document.title;
    const desc =
      document.querySelector('meta[name="description"]')?.getAttribute("content") ||
      "";

    return { title, description: desc, html: clone.innerHTML };
  });
}

async function collectSameOriginLinks({ page, origin }) {
  return page.evaluate((originArg) => {
    const out = [];
    for (const a of document.querySelectorAll("a[href]")) {
      try {
        const u = new URL(a.getAttribute("href"), originArg);
        u.hash = "";
        out.push(u.href);
      } catch {
        /* skip */
      }
    }
    return out;
  }, origin);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

function escapeHtmlAttr({ value }) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function buildOutputDocument({ pages, mergedCss, urlToSlug }) {
  const navItems = pages.map((p) => {
    const slug = urlToSlug.get(p.url) || slugFromUrl({ href: p.url });
    const label = escapeHtmlAttr({ value: p.title || slug });
    return `          <li><a href="#${slug}">${label}</a></li>`;
  });

  const sections = pages.map((p) => {
    const slug = urlToSlug.get(p.url) || slugFromUrl({ href: p.url });
    const src = escapeHtmlAttr({ value: p.url });
    const title = escapeHtmlAttr({ value: p.title || "" });
    const desc = p.description
      ? `<p class="page-source-desc">${escapeHtmlAttr({ value: p.description })}</p>`
      : "";
    return `      <section class="page-section" id="${slug}" data-source="${src}">
        <header class="page-section-header">
          <h2 class="page-section-title">${title}</h2>
          <p class="page-source"><a href="${src}" rel="noopener">Nguồn: ${src}</a></p>
          ${desc}
        </header>
        <div class="page-section-body">
${p.html}
        </div>
      </section>`;
  });

  return `<!DOCTYPE html>
<html lang="vi-VN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stella School — Trang tổng hợp nội dung (crawl)</title>
  <meta name="description" content="Nội dung tổng hợp từ stella.school — một tệp HTML duy nhất.">
  <base href="https://stella.school/">
  <style>
    :root { font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; line-height: 1.5; color: #222; }
    body { margin: 0; background: #fafafa; }
    .doc-header { background: #1a1a2e; color: #eee; padding: 1.25rem 1.5rem; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
    .doc-header h1 { margin: 0 0 0.35rem; font-size: 1.35rem; font-weight: 600; }
    .doc-header p { margin: 0; font-size: 0.9rem; opacity: 0.9; }
    .layout { display: grid; grid-template-columns: minmax(220px, 280px) 1fr; gap: 0; min-height: 100vh; }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .side-nav { position: relative !important; max-height: none !important; border-right: none; border-bottom: 1px solid #ddd; }
    }
    .side-nav { position: sticky; top: 0; align-self: start; max-height: 100vh; overflow: auto; background: #fff; border-right: 1px solid #e0e0e0; padding: 1rem 0.75rem 2rem; }
    .side-nav h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #666; margin: 0 0 0.5rem 0.5rem; }
    .side-nav ul { list-style: none; margin: 0; padding: 0; font-size: 0.85rem; }
    .side-nav a { display: block; padding: 0.35rem 0.5rem; color: #0d47a1; text-decoration: none; border-radius: 4px; }
    .side-nav a:hover { background: #e3f2fd; }
    main.main-col { background: #fff; padding: 1.5rem 1.75rem 4rem; max-width: 1100px; }
    .page-section { margin-bottom: 3.5rem; padding-bottom: 2rem; border-bottom: 1px solid #eee; scroll-margin-top: 1rem; }
    .page-section:last-child { border-bottom: none; }
    .page-section-header .page-section-title { margin: 0 0 0.25rem; font-size: 1.6rem; color: #111; }
    .page-source { margin: 0; font-size: 0.8rem; }
    .page-source a { color: #666; }
    .page-source-desc { margin: 0.5rem 0 0; font-size: 0.9rem; color: #444; }
    .page-section-body { margin-top: 1rem; }
    .page-section-body img { max-width: 100%; height: auto; }
  </style>
  <style id="merged-remote-css">
${mergedCss}
  </style>
</head>
<body>
  <header class="doc-header">
    <h1>Stella School — Tiểu học Dải Ngân Hà</h1>
    <p>Nội dung được thu thập và ghép trong một trang. Liên kết trong nội dung trỏ về trang gốc khi cần.</p>
  </header>
  <div class="layout">
    <nav class="side-nav" aria-label="Mục lục trang">
      <h2>Mục lục</h2>
      <ul>
${navItems.join("\n")}
      </ul>
    </nav>
    <main class="main-col">
${sections.join("\n\n")}
    </main>
  </div>
</body>
</html>`;
}

async function main() {
  const origin = new URL(START_URL).origin;
  const start = normalizePageUrl({ urlString: START_URL });
  const queue = start ? [start] : [];
  const enqueued = new Set(start ? [start] : []);
  const visited = new Set();
  const stylesheetUrls = new Set();
  const pages = [];
  const urlToSlug = new Map();

  const browser = await launchBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (compatible; StellaSiteBuilder/1.0; +https://stella.school/)",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);

  while (queue.length && pages.length < MAX_PAGES) {
    const raw = queue.shift();
    const url = normalizePageUrl({ urlString: raw });
    if (!url || visited.has(url)) continue;
    if (!shouldEnqueueUrl({ normalizedHref: url })) continue;
    visited.add(url);

    process.stderr.write(`Fetch ${pages.length + 1}: ${url}\n`);

    try {
      const resp = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_TIMEOUT_MS,
      });
      const status = resp?.status() ?? 0;
      if (status >= 400) continue;
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

      const sheets = await collectStylesheetHrefs({ page });
      sheets.forEach((h) => stylesheetUrls.add(h));

      const { title, description, html } = await extractMainHtml({ page });
      const slug = slugFromUrl({ href: url });
      urlToSlug.set(url, slug);
      pages.push({ url, title, description, html });

      const links = await collectSameOriginLinks({ page, origin });
      for (const href of links) {
        const n = normalizePageUrl({ urlString: href });
        if (
          n &&
          shouldEnqueueUrl({ normalizedHref: n }) &&
          !visited.has(n) &&
          !enqueued.has(n)
        ) {
          enqueued.add(n);
          queue.push(n);
        }
      }
    } catch (err) {
      process.stderr.write(`  skip (${err.message})\n`);
    }
  }

  await browser.close();

  process.stderr.write(`Merging ${stylesheetUrls.size} stylesheets…\n`);
  const mergedParts = [];
  for (const sheetUrl of stylesheetUrls) {
    try {
      const css = await fetchTextUrl({ urlString: sheetUrl });
      mergedParts.push(`/* --- ${sheetUrl} --- */\n${css}\n`);
    } catch {
      mergedParts.push(`/* failed: ${sheetUrl} */\n`);
    }
  }
  const mergedCss = mergedParts.join("\n");

  const doc = buildOutputDocument({ pages, mergedCss, urlToSlug });
  fs.writeFileSync(OUT_FILE, doc, "utf8");
  process.stderr.write(`Wrote ${OUT_FILE} (${pages.length} pages, ${doc.length} chars)\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
