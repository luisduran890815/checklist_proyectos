import { mkdir, copyFile, rm } from 'node:fs/promises';

const dist = 'dist';

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of ['index.html', 'styles.css', 'app.js', 'config.js']) {
  await copyFile(file, `${dist}/${file}`);
}

console.log('Build generado en dist/.');
