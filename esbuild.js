const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
};

function copyMedia() {
  const src = path.join(__dirname, 'src', 'webview', 'media');
  const dest = path.join(__dirname, 'out', 'media');
  fs.cpSync(src, dest, { recursive: true });
  console.log('Media files copied to out/media/');
}

async function main() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    copyMedia();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
    copyMedia();
    console.log('Build complete.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
