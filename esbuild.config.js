const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/ccpet.ts'],
  bundle: true,
  outfile: 'dist/ccpet.js',
  external: [],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  minify: !isWatch,
  logLevel: 'info',
  banner: {
    js: '#!/usr/bin/env node'
  }
};

async function build() {
  try {
    if (isWatch) {
      const context = await esbuild.context(buildOptions);
      await context.watch();
      console.log('Watching for changes...');
    } else {
      await esbuild.build(buildOptions);
      console.log('Build completed!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();