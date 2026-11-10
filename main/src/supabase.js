import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

// 키가 없으면 null. 화면에서 "설정이 필요해요" 안내를 보여 줘요.
export const supabase = url && key ? createClient(url, key) : null;
