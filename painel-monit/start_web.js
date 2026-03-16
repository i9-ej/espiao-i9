const { spawn } = require('child_process');

console.log('[PM2 Wrapper] Iniciando Next.js (npm run start)...');

const isWin = process.platform === "win32";
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const child = spawn(npmCmd, ['run', 'start'], {
  stdio: 'inherit',
  shell: isWin
});

child.on('error', (err) => {
  console.error('[PM2 Wrapper] Erro fatal no Next.js:', err);
});

child.on('close', (code) => {
  console.log(`[PM2 Wrapper] Next.js desligou com codigo: ${code}`);
  process.exit(code);
});
