import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.UI_AUDIT_BASE_URL ?? "http://localhost:3000";
const tokenPath = process.env.UI_AUDIT_TOKEN_JSON ?? "/tmp/bfmatch-uiaudit-register.json";
const phase = process.env.UI_AUDIT_PHASE ?? "before";

const rootDir = path.resolve(process.cwd(), ".ui-audit", phase);
fs.mkdirSync(rootDir, { recursive: true });

const tokenJson = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
const accessToken = tokenJson.accessToken;
if (!accessToken) throw new Error("accessToken not found in token json");

function slug(route) {
  return route.replace(/^\//, "").replaceAll("/", "__").replace(/[?=&]/g, "_") || "home";
}

async function fetchWithToken(apiPath) {
  const res = await fetch(`${process.env.UI_AUDIT_API_BASE_URL ?? "http://localhost:8080"}${apiPath}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

function toTeamKey(players) {
  return players.map((p) => p.userId).sort((a, b) => a - b).join("-");
}

async function resolveDynamicRoutes() {
  const routes = [
    "/",
    "/auth/login",
    "/auth/register",
    "/groups",
    "/groups/list",
    "/groups/create",
    "/ranking",
    "/notifications",
    "/my",
    "/my-record",
    "/my-record/best-partners",
    "/my-record/worst-partners",
    "/my-record/worst-opponents",
    "/my-record/monthly",
    "/my-record/recent-games",
    "/settings",
    "/settings/notifications",
    "/groups/6",
    "/groups/6/edit",
    "/groups/6/invite-history",
    "/groups/6/games/new",
    "/users/1/record",
    "/users/1/record/with-me",
  ];

  const games = await fetchWithToken("/api/v1/groups/6/games");
  if (Array.isArray(games) && games.length > 0) {
    const sample = games.find((g) => Array.isArray(g.teamA) && g.teamA.length === 2) ?? games[0];
    if (sample?.teamA?.length === 2) {
      routes.push(`/groups/6/teams/${toTeamKey(sample.teamA)}`);
    }
  }

  const teamRanking = await fetchWithToken("/api/v1/ranking/teams");
  const teamEntry = teamRanking?.grades?.F?.ALL?.[0]
    ?? teamRanking?.grades?.E?.ALL?.[0]
    ?? teamRanking?.grades?.D?.ALL?.[0]
    ?? teamRanking?.grades?.C?.ALL?.[0]
    ?? teamRanking?.grades?.B?.ALL?.[0]
    ?? teamRanking?.grades?.A?.ALL?.[0]
    ?? teamRanking?.grades?.S?.ALL?.[0];
  if (teamEntry?.teamKey) routes.push(`/teams/${encodeURIComponent(teamEntry.teamKey)}/record`);

  return routes;
}

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto(`${baseUrl}/auth/login`, { waitUntil: "domcontentloaded" });
await page.evaluate((token) => {
  window.sessionStorage.setItem("bf-match.access-token", token);
}, accessToken);

const routes = await resolveDynamicRoutes();
const report = [];

for (const route of routes) {
  const url = `${baseUrl}${route}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(900);
    const snapPath = path.join(rootDir, `${slug(route)}.png`);
    await page.screenshot({ path: snapPath, fullPage: true });

    const metrics = await page.evaluate(() => {
      const de = document.documentElement;
      const b = document.body;
      return {
        title: document.title,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        docScrollWidth: de.scrollWidth,
        docClientWidth: de.clientWidth,
        bodyScrollWidth: b?.scrollWidth ?? 0,
        bodyClientWidth: b?.clientWidth ?? 0,
        hasHorizontalOverflow: de.scrollWidth > de.clientWidth + 1 || (b?.scrollWidth ?? 0) > (b?.clientWidth ?? 0) + 1,
      };
    });
    report.push({ route, url, screenshot: snapPath, failed: false, ...metrics });
  } catch (error) {
    report.push({
      route,
      url,
      failed: true,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

fs.writeFileSync(path.join(rootDir, "report.json"), JSON.stringify(report, null, 2));
await browser.close();

console.log(JSON.stringify({ phase, count: report.length, report: path.join(rootDir, "report.json") }, null, 2));
