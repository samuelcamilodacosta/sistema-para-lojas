import { spawn } from 'child_process';
import { execSync } from 'child_process';

const children = [];

function run(command) {
  execSync(command, { stdio: 'inherit', shell: true });
}

function spawnCommand(label, command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[dev] ${label} encerrou com código ${code}.`);
    }
  });

  children.push(child);
  return child;
}

function cleanup() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

console.log('[dev] Compilando projeto...');
run('npm run build');

console.log('[dev] Iniciando watchers e Electron...');
spawnCommand('main', 'npm', ['run', 'dev:watch:main']);
spawnCommand('renderer', 'npm', ['run', 'dev:watch:renderer']);
spawnCommand('assets', 'npm', ['run', 'dev:watch:assets']);
spawnCommand('electron', 'electron', ['.']);
