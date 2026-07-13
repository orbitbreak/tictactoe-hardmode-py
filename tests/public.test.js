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
  assert.doesNotMatch(html, /<(?:script|img)[^>]+(?:src)="https?:/i);
  assert.doesNotMatch(html, /<link[^>]+rel="stylesheet"[^>]+href="https?:/i);
  assert.doesNotMatch(html, /service-worker|manifest\.webmanifest/i);
});

test("grouped project navigation keeps MusicBox first and both new games at the bottom", async () => {
  const html = await readFile(path.join(publicRoot, "index.html"), "utf8");
  const games = html.slice(html.indexOf('id="site-projects-games"'), html.indexOf('id="site-projects-edu"'));
  const musicBox = games.indexOf("/musicbox/");
  const ticTacToe = games.indexOf("/tictactoe/");
  const gameOfLife = games.indexOf("/gameoflife/");
  assert.ok(musicBox >= 0 && ticTacToe > musicBox && gameOfLife > ticTacToe);
  assert.match(games, /href="\/tictactoe\/" aria-current="page"/);
  assert.match(games, />Conway’s Game of Life</);
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
