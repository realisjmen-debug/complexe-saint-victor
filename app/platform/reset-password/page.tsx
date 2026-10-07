"use client";

import {useEffect,useState} from "react";
import {supabase} from "../../../lib/supabase";
import {ShieldCheck,ArrowLeft} from "lucide-react";
import Link from "next/link";
import "../../../app/globals.css";

export default function ResetPassword(){
 const [password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[ready,setReady]=useState(false);
 useEffect(()=>{const sub=supabase.auth.onAuthStateChange((event,session)=>{if(event==="PASSWORD_RECOVERY"&&session)setReady(true);}); supabase.auth.getSession().then(({data})=>{if(data.session)setReady(true)}); return ()=>sub.data.subscription.unsubscribe()},[]);
 async function submit(e:React.FormEvent){e.preventDefault();setError("");if(password.length<8){setError("Le mot de passe doit contenir au moins 8 caractères.");return}if(password!==confirm){setError("Les deux mots de passe ne correspondent pas.");return}setBusy(true);const {error:e1}=await supabase.auth.updateUser({password});if(e1){setError(e1.message);setBusy(false);return}await supabase.auth.signOut();location.href="/platform/login"}
 return <main className="authPage"><div className="authCard"><div className="authIcon"><ShieldCheck size={38}/></div><div className="authBrand"><span>MONATSHIEBE LOGICIEL</span><h1>Nouveau mot de passe</h1><p>Super Administrateur</p></div>{ready?<form onSubmit={submit}><label>Nouveau mot de passe<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} placeholder="Au moins 8 caractères" required/></label><label>Confirmer le mot de passe<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} placeholder="Retapez le mot de passe" required/></label>{error&&<div className="authError">{error}</div>}<button className="authButton" disabled={busy}>{busy?"Enregistrement…":"Définir mon nouveau mot de passe"}</button></form>:<><div className="authError">Ouvrez cette page depuis le lien de réinitialisation reçu par email. Si vous n'avez pas reçu l'email, retournez à la connexion et demandez une nouvelle réinitialisation.</div><Link className="backLink" href="/platform/login"><ArrowLeft size={16}/> Retour à la connexion Super Admin</Link></>}<p className="authNote">Votre compte Super Administrateur est protégé par Supabase Auth.</p></div></main>
}