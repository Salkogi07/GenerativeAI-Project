// 문제 알림: problem()은 화면 위 경고 띠에 계속 보이고, log()는 자세한 내용을 logs/app.log에 남겨요.
// 로그 파일은 개발 서버(vite.config.js의 /__log)가 써요. 빌드된 정적 사이트에서는 브라우저 콘솔에만 남아요.
import { useSyncExternalStore } from 'react';

let problems = [];
const subs = new Set();

export function log(where, err) {
  const detail = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : typeof err === 'string' ? err : JSON.stringify(err);
  console.error(`[${where}]`, err);
  if (import.meta.env.DEV) fetch('/__log', { method: 'POST', body: JSON.stringify({ where, detail, url: location.href }) }).catch(() => {});
}

// 사용자에게 보여 줄 짧은 문장(msg) + 로그에 남길 자세한 내용(err)
export function problem(msg, where, err) {
  log(where, err ?? msg);
  if (problems.includes(msg)) return;
  problems = [...problems, msg];
  subs.forEach(f => f());
}

export const useProblems = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => problems);

// 잡히지 않은 오류도 놓치지 않게
window.addEventListener('error', e => log('window.error', e.error || e.message));
window.addEventListener('unhandledrejection', e => problem('예상하지 못한 오류가 났어요. 일부 기능이 동작하지 않을 수 있어요.', 'unhandledrejection', e.reason));
