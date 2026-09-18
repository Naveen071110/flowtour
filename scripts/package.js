import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function createPackage() {
  const distDir = path.resolve('dist');
  const zipPath = path.resolve('flowtour-extension.zip');

  if (!fs.existsSync(distDir)) {
    console.error('❌ dist/ directory does not exist! Run npm run build first.');
    process.exit(1);
  }

  const rootManifest = path.join(distDir, 'manifest.json');
  if (!fs.existsSync(rootManifest)) {
    console.error('❌ dist/manifest.json does not exist!');
    process.exit(1);
  }

  const zip = new JSZip();
  const manifestLocations = [];

  function addFolderToZip(currentDir, relativePath = '') {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const itemRelative = relativePath ? `${relativePath}/${item}` : item;
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        addFolderToZip(fullPath, itemRelative);
      } else {
        const fileData = fs.readFileSync(fullPath);
        zip.file(itemRelative, fileData);

        if (item.toLowerCase() === 'manifest.json') {
          manifestLocations.push(itemRelative);
        }
      }
    }
  }

  console.log('📦 Gathering files from dist/...');
  addFolderToZip(distDir);

  console.log(`Found manifest(s): ${manifestLocations.join(', ')}`);

  if (manifestLocations.length !== 1 || manifestLocations[0] !== 'manifest.json') {
    console.error(
      `❌ Invalid manifest structure! Expected exactly one "manifest.json" at the root, found: ${JSON.stringify(
        manifestLocations
      )}`
    );
    process.exit(1);
  }

  console.log('🔒 Generating Chrome Web Store compliant ZIP archive...');
  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  fs.writeFileSync(zipPath, content);
  const sizeKb = (content.length / 1024).toFixed(1);

  console.log(`\n🎉 Success! Created: flowtour-extension.zip (${sizeKb} KB)`);
  console.log(`📍 Location: ${zipPath}`);
  console.log('\nPackage contents:');
  const zipFiles = Object.keys(zip.files);
  zipFiles.forEach((file) => console.log(`  - ${file}`));
  console.log('\n✅ Ready for Chrome Web Store Developer Dashboard upload!');
}

createPackage().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
