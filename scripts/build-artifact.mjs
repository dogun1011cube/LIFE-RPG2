// Builds a single-file page (CSS + JS inlined, no doctype/html/head/body wrapper) from the
// Vite production build, for hosts that wrap the page in their own document skeleton.
// Usage: npm run build && npm run build:artifact
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = process.argv[2] ?? new URL('../dist-artifact/project-genesis.html', import.meta.url).pathname;
const html = readFileSync(`${DIST}/index.html`, 'utf8');
const js = html.match(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/)[1];
const css = html.match(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/)[1];
let jsText = readFileSync(`${DIST}/${js}`, 'utf8');
let cssText = readFileSync(`${DIST}/${css}`, 'utf8');
const counts = { script: (jsText.match(/<\/script/gi) || []).length, comment: (jsText.match(/<!--/g) || []).length, style: (cssText.match(/<\/style/gi) || []).length };
// Keep the HTML parser from ending the inline script/style early
jsText = jsText.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
cssText = cssText.replace(/<\/style/gi, '<\\/style');
const favicon = html.match(/<link rel="icon"[^>]*>/)?.[0] ?? '';
const page = `<title>PROJECT GENESIS</title>
${favicon}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet">
<style>
${cssText}
</style>
<div id="root"></div>
<script type="module">
${jsText}
</script>
`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log(JSON.stringify({ js, css, escaped: counts, bytes: page.length }));
