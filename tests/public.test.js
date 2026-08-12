import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");

test("public is an exact eight-file runtime boundary", async () => {
  const actual = await walkFiles(publicRoot);
  assert.deepEqual(actual, [
    ".htaccess",
    "icon.svg",
    "index.html",
    "js/app.js",
    "js/engine.js",
    "js/site-nav.js",
    "site-nav.css",
    "styles.css",
  ]);
});

test("page is self-contained, accessible at the structural level, and has the legacy easter egg", async () => {
  const html = await readFile(path.join(publicRoot, "index.html"), "utf8");
  assert.equal((html.match(/class="cell"/g) ?? []).length, 9);
  assert.match(html, /role="grid"/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /No Mercy Report/);
  assert.match(html, /original minimalist Python\/Tkinter ancestor survives byte-for-byte/);
  assert.match(html, /<title>Tic-Tac-Toe Hardmode<\/title>/);
  assert.match(html, /<h1>Tic-Tac-Toe <span>Hardmode<\/span><\/h1>/);
  assert.match(html, /<p class="hero__lede">You can't beat perfection\.<\/p>/);
  assert.doesNotMatch(html, /A tiny game without mercy|You cannot beat perfect play|Hold it to a draw/i);
  assert.doesNotMatch(html, /<div class="hero__facts"|>Silent<|>Client-side<|>Keyboard friendly</i);
  assert.doesNotMatch(html, /<footer|Pure HTML, CSS, and JavaScript/);
  assert.doesNotMatch(html, />\s*jasonsher\.com\s*</i);
  assert.doesNotMatch(html, />\s*(?:local[- ]only|privacy)\s*</i);
  assert.doesNotMatch(html, /<(?:script|img)[^>]+(?:src)="https?:/i);
  assert.doesNotMatch(html, /<link[^>]+rel="stylesheet"[^>]+href="https?:/i);
  assert.doesNotMatch(html, /service-worker|manifest\.webmanifest/i);
});

test("project navigation has the six featured apps in exact order and omits retired sections", async () => {
  const html = await readFile(path.join(publicRoot, "index.html"), "utf8");
  const css = await readFile(path.join(publicRoot, "site-nav.css"), "utf8");
  const home = html.indexOf(">Home (Ripples)<");
  const featuredStart = html.indexOf('id="site-projects-featured"');
  const graphicsStart = html.indexOf('id="site-projects-graphics"');
  const gamesStart = html.indexOf('id="site-projects-games"');
  const navEnd = html.indexOf("</nav>", gamesStart);
  assert.ok(home >= 0 && home < featuredStart && featuredStart < graphicsStart && graphicsStart < gamesStart && gamesStart < navEnd);
  const featured = html.slice(featuredStart, graphicsStart);
  const games = html.slice(gamesStart, navEnd);
  assert.match(html, /site-nav\.css\?v=20260728-nav7/);
  assert.match(html, /js\/site-nav\.js\?v=20260713-1/);
  assert.match(html, /styles\.css\?v=20260812-1/);
  assert.match(featured, />Featured<\/span>/);
  const bandBot = featured.indexOf('href="/bandbot/"');
  const tickerTags = featured.indexOf('href="/tickertags/"');
  const gradientGrove = featured.indexOf('href="/gradientgrove/"');
  const waveLens = featured.indexOf('href="/wavelens/"');
  const musicBox = featured.indexOf('href="/musicbox/"');
  const stormSight = featured.indexOf('href="/radar/"');
  assert.ok(musicBox >= 0 && musicBox < bandBot && bandBot < waveLens && waveLens < stormSight && stormSight < gradientGrove && gradientGrove < tickerTags);
  assert.match(featured, /href="\/musicbox\/"[^>]*><span class="site-projects__name">MusicBox<\/span><span class="site-projects__description">Paint the grid\. Play the groove\.<\/span>/);
  assert.match(featured, /href="\/radar\/"[^>]*><span class="site-projects__name">StormSight<\/span><span class="site-projects__description">Doppler Radar Map<\/span>/);
  assert.match(featured, /href="\/bandbot\/"[^>]*><span class="site-projects__name">BandBot<\/span><span class="site-projects__description">Music Composition Studio<\/span>/);
  assert.match(featured, /href="\/tickertags\/"[^>]*><span class="site-projects__name">TickerTags<\/span><span class="site-projects__description">Multi-ticker Stock Chart Viewer<\/span>/);
  assert.match(featured, /href="\/gradientgrove\/"[^>]*><span class="site-projects__name">Gradient Grove<\/span><span class="site-projects__description">Neural network playground<\/span>/);
  assert.match(featured, /href="\/wavelens\/"[^>]*><span class="site-projects__name">WaveLens<\/span><span class="site-projects__description">Live sound visualizer<\/span>/);
  assert.equal((featured.match(/class="site-projects__link"/g) ?? []).length, 6);
  assert.equal((featured.match(/site-projects__description/g) ?? []).length, 6);
  assert.doesNotMatch(html, /site-projects-tools|>Tools<\/span>/);
  assert.doesNotMatch(html, /orbitforge|Orbit Forge/i);
  assert.doesNotMatch(html, /site-projects-learn|>Learn<\/span>|\/LLM101\/|\/Blockchain101-EVM\//i);
  assert.match(html.slice(graphicsStart, gamesStart), />Graphics<\/span>/);
  assert.match(games, />Games<\/span>/);
  assert.doesNotMatch(games, /MusicBox/);
  const platform = games.indexOf("/platformjumper");
  const snake = games.indexOf("/snakeautorandom");
  const ticTacToe = games.indexOf("/tictactoe/");
  const gameOfLife = games.indexOf("/gameoflife/");
  assert.ok(platform >= 0 && platform < snake && snake < ticTacToe && ticTacToe < gameOfLife);
  assert.match(games, /href="\/tictactoe\/" aria-current="page"/);
  assert.match(games, />Tic-Tac-Toe Hardmode<\/span>/);
  assert.match(games, />Conway’s Game of Life</);
  assert.doesNotMatch(css, /text-transform:\s*uppercase/);
  assert.match(css, /\.site-projects__section-title[\s\S]*?background: #eef2f6/);
  assert.match(css, /#site-projects-featured[\s\S]*?background: #fff0a8/);
  assert.match(css, /\.site-projects__description[\s\S]*?font-size: 0\.72rem/);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?\.site-projects__section-title[\s\S]*?background: Canvas/);
});

test("Apache child configuration supplies an index and disables listings", async () => {
  const htaccess = await readFile(path.join(publicRoot, ".htaccess"), "utf8");
  assert.match(htaccess, /^DirectoryIndex index\.html$/m);
  assert.match(htaccess, /^Options -Indexes$/m);
});

test("legacy source matches the original byte counts and SHA-256 digests", async () => {
  const expectations = [
    ["README.md", 32, "5cf6da977fa65bf17a80f4ca4cf6d824891500c6835098989e66649cfe49d066"],
    ["tictactoe-hardmode.py", 4510, "dc95c13b104f32b9ee20a104646d42288051416a4031f4c4b34451b42b346c16"],
  ];

  for (const [name, bytes, digest] of expectations) {
    const file = path.join(root, "legacy", "original", name);
    const content = await readFile(file);
    assert.equal((await stat(file)).size, bytes);
    assert.equal(createHash("sha256").update(content).digest("hex"), digest);
  }
});

async function walkFiles(directory, prefix = "") {
  const output = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) output.push(...(await walkFiles(path.join(directory, entry.name), relative)));
    else output.push(relative);
  }
  return output.sort();
}
