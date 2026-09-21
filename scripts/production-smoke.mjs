import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const local = process.argv[2] === 'local';
const origin = local ? 'http://127.0.0.1:15180' : 'https://hope-clinic.web.app';
const server = local ? spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '15180', '--strictPort'], { stdio: 'ignore' }) : null;
let browser;
try {
    if (local) {
        for (let attempt = 0; attempt < 50; attempt++) {
            try { if ((await fetch(origin)).ok) break; } catch { /* Preview is starting. */ }
            if (attempt === 49) throw new Error('Production preview failed to start.');
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    browser = await chromium.launch({ channel: 'chrome' });
    const context = await browser.newContext();
    // Production smoke checks never sign in or submit data.
    await context.route('**/*', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/today');
    await page.waitForURL('**/login');
    await page.getByRole('button', { name: 'Log In', exact: true }).waitFor();
    assert.equal(await page.getByText('Local demo — synthetic records only.', { exact: false }).count(), 0);
    await page.evaluate(() => Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker did not become ready.')), 15000)),
    ]));
    const cacheNames = await page.evaluate(() => caches.keys());
    assert.ok(!cacheNames.includes('firestore-cache'));
    const worker = await context.request.get(origin + '/sw.js');
    assert.equal(worker.status(), 200);
    assert.ok(!(await worker.text()).includes('firestore.googleapis.com'));
    if (!local) {
        assert.match(worker.headers()['cache-control'] || '', /no-cache|no-store|max-age=0/);
        const remoteHTML = await (await context.request.get(origin + '/')).text();
        const localHTML = await readFile('dist/index.html', 'utf8');
        const asset = localHTML.match(/\/assets\/index-[^" ]+\.js/)[0];
        assert.ok(remoteHTML.includes(asset), 'Live site is not serving the verified build.');
        const response = await context.request.get(origin + asset);
        assert.equal(response.status(), 200);
        assert.equal(await response.text(), await readFile('dist' + asset, 'utf8'), 'Live JavaScript differs from verified build.');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    assert.deepEqual(errors, []);
    console.log(`${local ? 'Production preview' : 'Live production'}: protected route, login, service worker, cache policy${local ? '' : ', exact deployed build'} and phone checks passed.`);
} finally { await browser?.close(); server?.kill(); }
