import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/index.es.js',
  external: ['react', 'react-dom'],
  platform: 'browser',
  target: 'es2017',
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  minify: false,
  sourcemap: false,
});

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'cjs',
  outfile: 'dist/index.cjs.js',
  external: ['react', 'react-dom'],
  platform: 'browser',
  target: 'es2017',
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  minify: false,
  sourcemap: false,
});

console.log('Build complete.');
