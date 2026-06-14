import fs from 'node:fs';
import path from 'node:path';
import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const root = path.join(import.meta.dirname, '..');
const sourcePath = path.join(root, 'build', 'icon.png');
const squarePath = path.join(root, 'build', 'icon-square.png');
const icoPath = path.join(root, 'build', 'icon.ico');

if (!fs.existsSync(sourcePath)) {
  console.error('Arquivo não encontrado: build/icon.png');
  process.exit(1);
}

await sharp(sourcePath)
  .resize(512, 512, {
    fit: 'cover',
    position: 'centre',
  })
  .png()
  .toFile(squarePath);

await sharp(squarePath).toFile(sourcePath);

const ico = await pngToIco(squarePath);
fs.writeFileSync(icoPath, ico);
fs.unlinkSync(squarePath);

console.log('Ícones gerados: build/icon.png (512x512) e build/icon.ico');
