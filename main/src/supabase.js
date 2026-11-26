import { createClient } from '@supabase/supabase-js';
import { problem } from './lib/log.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

// 키가 없으면 null. 화면에서 "설정이 필요해요" 안내를 보여 줘요.
// pkce: 비밀번호 재설정 메일 링크가 ?code=… 로 돌아와요 (#access_token=… 이면 HashRouter 주소와 부딪혀요)
export const supabase = url && key ? createClient(url, key, { auth: { flowType: 'pkce' } }) : null;
if (!supabase) problem('서버에 연결되지 않았어요. 로그인과 핀·리뷰를 쓸 수 없어요.', 'config',
  `Supabase 설정 없음: ${[!url && 'VITE_SUPABASE_URL', !key && 'VITE_SUPABASE_KEY'].filter(Boolean).join(', ')} 이(가) main/.env.local에 비어 있어요`);
