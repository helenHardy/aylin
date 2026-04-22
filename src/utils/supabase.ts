import { createClient } from '@supabase/supabase-js';

// Usamos valores temporales durante el "build" de Vercel para evitar que el compilador truene
// si las variables de entorno aún no han sido configuradas en el panel.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('⚠️ Las variables de entorno de Supabase no están configuradas.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
