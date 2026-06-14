import fs from 'fs';
import path from 'path';

export function loadDomFixture(): void {
  const htmlPath = path.resolve(__dirname, '../../src/index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);

  if (!bodyMatch) {
    throw new Error('Não foi possível carregar o HTML da aplicação.');
  }

  document.documentElement.innerHTML = html
    .replace(/<body[^>]*>[\s\S]*<\/body>/i, '')
    .replace('</html>', '')
    .concat('<body>', bodyMatch[1], '</body></html>');

  document.body.innerHTML = bodyMatch[1];
}
