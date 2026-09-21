import { spawn } from 'node:child_process';

export function run(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: 'inherit', ...options });
        child.on('error', reject);
        child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
    });
}
export const node = (file, args = [], options) => run(process.execPath, [file, ...args], options);
