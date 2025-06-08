import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yseyznpiemscdskczdak.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZXl6bnBpZW1zY2Rza2N6ZGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxODUzNTksImV4cCI6MjA2NDc2MTM1OX0.OZ164B1YHzsUg-Mll0d_XJk4cnLsoGLRkuYjhegdlmI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);