// Builds StellarDodge.html: the whole game, Phaser and drawn sprites included, in one file
// that runs when opened straight from disk (browsers refuse to load separate ES module and
// image files from file://).
// Usage, from the repo root: node tools/build-standalone.mjs
// Needs Node 18+ and internet access once, to download the pinned Phaser build.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'StellarDodge.html');
const ENTRY = 'src/main.js';
const PHASER_CDN = 'https://cdn.jsdelivr.net/npm/phaser@3.70.0';
const ART_MODULE = 'src/config/art.js';
const IMAGE_TYPES = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif' };
const { ART } = await import(pathToFileURL(join(ROOT, ART_MODULE)).href);

// Each drawn sprite's path in art.js becomes a data: URL holding the image itself (§9b).
function embedArt(src) {
  for (const [key, { file }] of Object.entries(ART)) {
    const type = IMAGE_TYPES[extname(file).toLowerCase()];
    if (!type) throw new Error(`art.js "${key}": ${file} is not a PNG, WebP, JPEG or GIF`);
    let data;
    try {
      data = readFileSync(join(ROOT, file)).toString('base64');
    } catch {
      throw new Error(`art.js "${key}": ${file} not found`);
    }
    const quoted = new RegExp(`(['"])${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'g');
    if (!src.match(quoted)) throw new Error(`art.js "${key}": write the path as a plain quoted string`);
    src = src.replace(quoted, () => JSON.stringify(`data:${type};base64,${data}`));
  }
  return src;
}

// Each ES module becomes a function in a small CommonJS-style registry. The game only uses
// `import X from`, `import { a, b } from`, `export const|function|class` and
// `export default class`; anything else stops the build rather than bundling it wrongly.
const modules = new Map();

function load(id) {
  if (modules.has(id)) return;
  modules.set(id, null);
  let src = readFileSync(join(ROOT, id), 'utf8');
  if (id === ART_MODULE) src = embedArt(src);
  const resolve = (spec) => posix.normalize(posix.join(posix.dirname(id), spec));
  const deps = [];
  const exported = [];

  src = src.replace(/^import\s+(\w+)\s+from\s+'([^']+)';/gm, (_, name, spec) => {
    deps.push(resolve(spec));
    return `const ${name} = __require('${resolve(spec)}').default;`;
  });
  src = src.replace(/^import\s*\{([^}]*)\}\s*from\s*'([^']+)';/gm, (_, names, spec) => {
    deps.push(resolve(spec));
    return `const {${names}} = __require('${resolve(spec)}');`;
  });
  src = src.replace(/^export default class (\w+)/gm, (_, name) => {
    exported.push(['default', name]);
    return `class ${name}`;
  });
  src = src.replace(/^export (const|function|class) (\w+)/gm, (_, keyword, name) => {
    exported.push([name, name]);
    return `${keyword} ${name}`;
  });
  if (/^\s*(import|export)\b/m.test(src)) throw new Error(`${id}: unsupported import/export syntax`);
  assertInlineSafe(src, id);

  const exportLines = exported.map(([as, name]) => `__exports.${as} = ${name};`).join('\n');
  modules.set(id, `'use strict';\n${src}\n${exportLines}`);
  deps.forEach(load);
}

// Text that would end or confuse an inline <script> element.
function assertInlineSafe(code, label) {
  if (/<\/script|<!--/i.test(code)) throw new Error(`${label}: contains text that would break an inline <script>`);
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

load(ENTRY);
const bundle = [
  '(() => {',
  'const __modules = {',
  ...[...modules].map(([id, code]) => `${JSON.stringify(id)}: function (__exports) {\n${code}\n},`),
  '};',
  'const __cache = {};',
  'function __require(id) {',
  '  if (!__cache[id]) { __cache[id] = {}; __modules[id](__cache[id]); }',
  '  return __cache[id];',
  '}',
  `__require(${JSON.stringify(ENTRY)});`,
  '})();',
].join('\n');

const [phaser, license] = await Promise.all([
  download(`${PHASER_CDN}/dist/phaser.min.js`),
  download(`${PHASER_CDN}/LICENSE.md`),
]);
assertInlineSafe(phaser, 'phaser.min.js');
// The minified build carries no license header, so its MIT notice is added here.
const phaserNotice = `/*! Phaser 3.70.0 (https://phaser.io)\n${license.trim().replace(/\*\//g, '* /')}\n*/`;

let html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const phaserTag = /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/phaser@3\.70\.0\/dist\/phaser\.min\.js"><\/script>/;
const entryTag = /<script type="module" src="src\/main\.js"><\/script>/;
if (!phaserTag.test(html) || !entryTag.test(html)) throw new Error('index.html: Phaser or entry <script> tag not found');
// Function replacers, so `$` sequences inside the scripts are never read as replacement patterns.
html = html.replace(phaserTag, () => `<script>\n${phaserNotice}\n${phaser}\n</script>`);
html = html.replace(entryTag, () => `<script>\n${bundle}\n</script>`);
writeFileSync(OUT, html);
const drawn = Object.keys(ART).length;
console.log(`StellarDodge.html: ${modules.size} modules, ${drawn} drawn sprite${drawn === 1 ? '' : 's'}, ${(html.length / 1024 / 1024).toFixed(2)} MB`);
