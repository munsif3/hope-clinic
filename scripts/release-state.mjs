import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function paths(root) {
    const entries = await readdir(root, { withFileTypes: true });
    return (await Promise.all(entries.map(entry => entry.isDirectory() ? paths(join(root, entry.name)) : [join(root, entry.name)]))).flat();
}
export async function digest(files) {
    const hash = createHash('sha256');
    for (const file of files.sort()) { hash.update(file.replaceAll('\\', '/')); hash.update(await readFile(file)); }
    return hash.digest('hex');
}
export async function releaseState() {
    return {
        source: await digest([
            ...(await Promise.all(['src', 'public', 'scripts', 'tests'].map(paths))).flat(),
            'package.json', 'package-lock.json', 'vite.config.js', 'playwright.config.mjs',
            '.firebaserc', 'firebase.json', 'firebase.emulator.json', 'firestore.rules',
            'firestore.indexes.json', 'eslint.config.js', 'index.html',
        ]),
        build: await digest(await paths('dist')),
    };
}
