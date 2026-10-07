import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://batcggonqggzdgsypzfc.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_gaw_uApUL4uJ2LHOERqz0A_4lat-NQF";

// Session dédiée à l'administration de la plateforme.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: "monatshiebe-platform-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Session dédiée aux utilisateurs des établissements.
// Elle ne partage pas le stockage de session avec le Super Administrateur.
export const schoolSupabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: "monatshiebe-school-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});