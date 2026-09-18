import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

async function runBuild() {
  console.log('🚀 Phase 1: Building Side Panel (React + Tailwind)...');
  await build({
    plugins: [react()],
    base: '',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          sidepanel: path.resolve('sidepanel.html'),
        },
      },
    },
  });

  console.log('⚡ Phase 2: Building Background Service Worker (ES Module)...');
  await build({
    configFile: false,
    publicDir: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: path.resolve('src/background/service_worker.ts'),
        formats: ['es'],
        fileName: () => 'background.js',
      },
    },
  });

  console.log('🎯 Phase 3: Building Content Script (Standalone IIFE)...');
  await build({
    configFile: false,
    publicDir: false,
    build: {
      outDir: path.resolve('dist/content_scripts'),
      emptyOutDir: false,
      lib: {
        entry: path.resolve('src/content_scripts/recorder.ts'),
        formats: ['iife'],
        name: 'FlowTourRecorder',
        fileName: () => 'recorder.js',
      },
    },
  });

  // Ensure no spurious manifest or public assets in dist/content_scripts
  const spuriousManifest = path.resolve('dist/content_scripts/manifest.json');
  if (fs.existsSync(spuriousManifest)) {
    fs.unlinkSync(spuriousManifest);
  }
  const spuriousIcons = path.resolve('dist/content_scripts/icons');
  if (fs.existsSync(spuriousIcons)) {
    fs.rmSync(spuriousIcons, { recursive: true, force: true });
  }

  // Verify manifest.json copied
  const manifestSrc = path.resolve('public/manifest.json');
  const manifestDest = path.resolve('dist/manifest.json');
  if (fs.existsSync(manifestSrc) && !fs.existsSync(manifestDest)) {
    fs.copyFileSync(manifestSrc, manifestDest);
  }

  console.log('✨ All phases built successfully! Load unpacked from: dist/');
}

runBuild().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
