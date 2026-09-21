import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { node } from './process.mjs';
import { releaseState } from './release-state.mjs';

await mkdir('.local-test', { recursive: true });
await node('node_modules/eslint/bin/eslint.js', ['.']);
await node('--test', ['tests/clinicalViews.test.mjs', 'tests/consultationWorkflow.test.mjs', 'tests/scheduling.test.mjs', 'tests/visits.test.mjs']);
async function ready(port) {
    try { return (await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) })).status < 500; }
    catch { return false; }
}
const running = await Promise.all([ready(8080), ready(9099)]);
assert.equal(running[0], running[1], 'Only one emulator is running. Start or stop both before verification.');
if (running.every(Boolean)) await node('scripts/local-checks.mjs');
else await node('node_modules/firebase-tools/lib/bin/firebase.js', [
    'emulators:exec', '--config', 'firebase.emulator.json', '--project', 'demo-hope-clinic', '--only', 'auth,firestore', 'node scripts/local-checks.mjs',
], { env: { ...process.env, CI: 'true', XDG_CONFIG_HOME: resolve('.local-test/config'), FIREBASE_EMULATORS_PATH: resolve('.local-test/emulators') } });

// Validate configuration without printing environment values or credentials.
const config = loadEnv('production', process.cwd(), 'VITE_');
const target = JSON.parse(await readFile('.firebaserc', 'utf8')).projects.default;
assert.equal(config.VITE_FIREBASE_PROJECT_ID, target, 'Production client and Firebase deployment targets disagree.');
for (const key of ['API_KEY', 'AUTH_DOMAIN', 'APP_ID']) assert.ok(config['VITE_FIREBASE_' + key], `Missing Firebase ${key}`);
await node('node_modules/vite/bin/vite.js', ['build']);
await node('scripts/production-smoke.mjs', ['local']);
await writeFile('.local-test/verified-release.json', JSON.stringify({ verifiedAt: Date.now(), state: await releaseState() }, null, 2));
console.log('Verified release: unit, integration, repeated Playwright, production build and signed-out PWA checks passed.');
