import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const frontend = Object.entries(lock.packages).filter(([path]) => path).map(([path, pkg]) => ({ name: path.split('node_modules/').at(-1), version: pkg.version, license: pkg.license ?? 'UNDECLARED', development: Boolean(pkg.dev) })).sort((a, b) => a.name.localeCompare(b.name));
const metadata = JSON.parse(execFileSync('cargo', ['metadata', '--locked', '--offline', '--filter-platform', 'x86_64-pc-windows-msvc', '--format-version', '1', '--manifest-path', 'src-tauri/Cargo.toml'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
const rust = metadata.packages.filter(pkg => pkg.name !== 'rasterlab').map(pkg => ({ name: pkg.name, version: pkg.version, license: pkg.license ?? 'UNDECLARED', repository: pkg.repository })).sort((a, b) => a.name.localeCompare(b.name));
await mkdir('test-results/release', { recursive: true });
await writeFile('test-results/release/dependencies.json', JSON.stringify({ projectVersion: lock.version, platform: 'Windows x64', frontend, rust }, null, 2));
console.log(`Dependency metadata: ${frontend.length} npm packages, ${rust.length} Rust packages. Missing licenses: ${[...frontend, ...rust].filter(pkg => pkg.license === 'UNDECLARED').length}.`);
