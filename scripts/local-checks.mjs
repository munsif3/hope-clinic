import { node } from './process.mjs';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
await node('tests/seed-demo.mjs');
await node('--test', ['tests/saveVisit.integration.mjs', 'tests/scheduling.integration.mjs']);
await node('node_modules/@playwright/test/cli.js', ['test']);
