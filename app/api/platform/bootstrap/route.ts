import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (typeof token !== "string" || token.length < 20) return NextResponse.json({ error: "Lien de bootstrap invalide." }, { status: 400 });
    if (typeof password !== "string" || password.length < 8) return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return NextResponse.json({ error: "Configuration serveur Supabase manquante." }, { status: 500 });

    const tokenHash = await sha256(token);
    const { data: admin, error: lookupError } = await supabaseAdmin.from("platform_admins").select("user_id, active, bootstrap_token_hash").eq("active", true).eq("bootstrap_token_hash", tokenHash).maybeSingle();
    if (lookupError || !admin) return NextResponse.json({ error: "Ce lien de configuration est invalide ou a déjà été utilisé." }, { status: 403 });

    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(admin.user_id, { password });
    if (passwordError) return NextResponse.json({ error: passwordError.message }, { status: 400 });

    await supabaseAdmin.from("platform_admins").update({ bootstrap_token_hash: null }).eq("user_id", admin.user_id).eq("bootstrap_token_hash", tokenHash);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Une erreur est survenue pendant l'initialisation." }, { status: 500 });
  }
}
