import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://batcggonqggzdgsypzfc.supabase.co",
  "sb_publishable_gaw_uApUL4uJ2LHOERqz0A_4lat-NQF",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);