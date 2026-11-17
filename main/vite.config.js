import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { appendFileSync, mkdirSync } from 'node:fs';

const LOGS = new URL('./logs/', import.meta.url); // vite.config.js 옆 logs/ (실행 위치와 상관없이)

// 개발 중 브라우저 오류(src/lib/log.js)를 logs/app.log에 한 줄씩 저장해요
const logFile = {
  name: 'log-file',
  configureServer(server) {
    server.middlewares.use('/__log', (req, res) => {
      let body = '';
      req.on('data', c => { if (body.length < 20000) body += c; });
      req.on('end', () => {
        try {
          const { where, detail, url } = JSON.parse(body);
          mkdirSync(LOGS, { recursive: true });
          appendFileSync(new URL('app.log', LOGS), `[${new Date().toISOString()}] [${where}] ${url}\n${detail}\n\n`);
        } catch { /* 형식이 틀린 요청은 버려요 */ }
        res.end();
      });
    });
  },
};

export default defineConfig({
  plugins: [react(), logFile],
  server: { port: 5173 },
});
