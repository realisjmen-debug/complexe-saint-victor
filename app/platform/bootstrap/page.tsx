"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import "../../../app/globals.css";

export default function PlatformBootstrap() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!token) return setMessage("Lien de configuration invalide.");
    if (password.length < 8) return setMessage("Le mot de passe doit contenir au moins 8 caractères.");
    if (password !== confirm) return setMessage("Les deux mots de passe ne correspondent pas.");

    setBusy(true);
    const res = await fetch("/api/platform/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setMessage(data.error || "Impossible de configurer le compte.");
      return;
    }
    setMessage("Mot de passe configuré avec succès. Vous pouvez maintenant vous connecter.");
    setTimeout(() => { window.location.href = "/platform/login"; }, 1200);
  }

  return (
    <main className="authPage">
      <div className="authCard">
        <div className="authIcon"><ShieldCheck size={38} /></div>
        <div className="authBrand">
          <span>PLATEFORME SAAS</span>
          <h1>Initialisation administrateur</h1>
          <p>Définissez le mot de passe du Super Administrateur</p>
        </div>
        <form onSubmit={submit}>
          <label>Nouveau mot de passe<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required /></label>
          <label>Confirmer le mot de passe<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={8} required /></label>
          {message && <div className="authError">{message}</div>}
          <button className="authButton" disabled={busy}>{busy ? "Configuration…" : "Définir le mot de passe"}</button>
        </form>
        <p className="authNote">Ce lien est à usage unique et sera désactivé après la configuration.</p>
      </div>
    </main>
  );
}
