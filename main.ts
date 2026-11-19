// Vice Cover Maker — the entrypoint for gta6-cover-art-01 (Node 22, standard library only).
//
// The app is plain static files under app/: index.html plus its ES modules, the two OFL
// fonts and the two sample photos, nothing loaded over the network. This program hands the
// entry in: it copies app/ and screenshots/ from beside this file into /output (or
// $MAKEFUN_OUTPUT_DIR outside the grader) and writes /output/dossier.json with the
// vendored make.fun library, so the judge can read the app's source and screenshots.
//
// Run it locally first, then check the entry with the kit:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//   node cli/makefun.mjs check --kit . --repo /home/hatch/workspace/makefun/gta6-cover-art
// Serve the app itself with `node serve.ts` and open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps: text_max_bytes shapes the dossier text; the other caps refuse an
// entry the scorer would refuse — at most 4 screenshots of 256 KiB each, app/ at most
// 993 files and 48 MiB in all, and no path under app/ over 1000 bytes.
const dossierPath = join(out, 'dossier.json');
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(dossierPath, dossier);

// A one-line receipt on stdout, so a run's output shows what it handed in.
const countFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) => n + (e.isDirectory() ? countFiles(join(dir, e.name)) : 1),
    0,
  );
console.log(
  `vice-cover-maker: ${countFiles(join(out, 'app'))} app files, ` +
    `${countFiles(join(out, 'screenshots'))} screenshots, ` +
    `dossier.json ${statSync(dossierPath).size} bytes -> ${out}`,
);
