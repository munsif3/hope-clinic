import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { releaseState } from './release-state.mjs';
const receipt = JSON.parse(await readFile('.local-test/verified-release.json', 'utf8'));
assert.ok(Date.now() - receipt.verifiedAt < 86400000, 'Verification expired. Run npm run verify.');
assert.deepEqual(await releaseState(), receipt.state, 'Source/build changed after verification. Run npm run verify.');
console.log('Release matches the verified source and build.');
