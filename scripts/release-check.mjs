import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const servers = [], results = [];
const originalFixture = await readFile('examples/masked-generators.json');
function start(command, args, capture = false) {
  // Windows npm is a cmd shim; arguments are fixed, never user-provided shell text.
  const options = { stdio: capture ? 'pipe' : 'inherit' };
  if (process.platform === 'win32' && command === npm) return spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm.cmd ${args.join(' ')}`], options);
  return spawn(command, args, options);
}
async function run(command, args) {
  const started = Date.now(), child = start(command, args);
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  results.push({ command: [command, ...args], code, seconds: (Date.now() - started) / 1000 });
  if (code !== 0) throw new Error(`Failed: ${command} ${args.join(' ')}`);
}
async function serve(command, args, url) {
  const child = start(command, args, true); servers.push(child); child.stdout?.on('data', () => {}); child.stderr?.on('data', () => {});
  for (let attempt = 0; attempt < 100; attempt++) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 200)); }
  throw new Error(`Server unavailable: ${url}`);
}
try {
  const pkg = JSON.parse(await readFile('package.json', 'utf8')), tauri = JSON.parse(await readFile('src-tauri/tauri.conf.json', 'utf8')), cargo = await readFile('src-tauri/Cargo.toml', 'utf8');
  if (pkg.version !== tauri.version || !cargo.includes(`version = "${pkg.version}"`)) throw new Error('Inconsistent version; run npm run version:sync');
  await run(npm, ['run', 'build']); await run(npm, ['test']); await run('cargo', ['test', '--manifest-path', 'src-tauri/Cargo.toml', '--lib']);
  await run('cargo', ['fmt', '--manifest-path', 'src-tauri/Cargo.toml', '--check']);
  await run('cargo', ['clippy', '--manifest-path', 'src-tauri/Cargo.toml', '--lib', '--', '-D', 'warnings']);
  await run(process.execPath, ['scripts/dependencies.mjs']);
  await serve(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], 'http://127.0.0.1:4173');
  await serve(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], 'http://127.0.0.1:5173');
  process.env.RASTERLAB_TEST_URL = 'http://127.0.0.1:4173';
  for (const script of ['smoke', 'features', 'catalog', 'expansion', 'remaining', 'creative', 'composition', 'workflow', 'masks', 'review-ui', 'review-model', 'review-races', 'review-context', 'stabilization', 'review-soak']) await run(process.execPath, [`scripts/${script}.mjs`]);
  if (process.argv.includes('--desktop')) {
    await run(npm, ['run', 'desktop:build']);
    const folder = join(process.env.CARGO_TARGET_DIR ?? 'src-tauri/target', 'release/bundle/nsis');
    const lines = [];
    for (const name of await readdir(folder)) if (name.endsWith('.exe')) lines.push(`${createHash('sha256').update(await readFile(join(folder, name))).digest('hex')}  ${name}`);
    await writeFile(join(folder, 'SHA256SUMS.txt'), lines.join('\n') + '\n');
  }
} finally {
  for (const child of servers) child.kill();
  await writeFile('examples/masked-generators.json', originalFixture);
  await mkdir('test-results/release', { recursive: true });
  await writeFile('test-results/release/checks.json', JSON.stringify({ date: new Date().toISOString(), results }, null, 2));
}
