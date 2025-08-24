const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

const buildOptions = [
  // CLI entry point
  {
    entryPoints: ['src/cli.ts'],
    bundle: true,
    outfile: 'dist/cli.js',
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
  },
  // Claude Code status line entry point
  {
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
  }
];

async function build() {
  try {
    if (isWatch) {
      // Watch multiple entry points
      for (const options of buildOptions) {
        const context = await esbuild.context(options);
        await context.watch();
      }
      console.log('Watching for changes...');
    } else {
      // Build multiple entry points
      for (const options of buildOptions) {
        await esbuild.build(options);
      }
      console.log('Build completed!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();