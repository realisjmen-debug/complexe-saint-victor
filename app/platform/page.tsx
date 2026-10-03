"use client";

import {useEffect,useState} from "react";
import {supabase} from "../../lib/supabase";
import "./platform.css";
import {Building2,Plus,Power,ExternalLink,ShieldCheck,RefreshCw} from "lucide-react";

type School={id:string;name:string;slug:string;status:string;city:string|null;phone:string|null;created_at:string};
type Plan={id:string;name:string;label:string;price_monthly:number;price_yearly:number};

export default function PlatformPage(){
 const [ok,setOk]=useState(false),[loading,setLoading]=useState(true),[schools,setSchools]=useState<School[]>([]),[plans,setPlans]=useState<Plan[]>([]),[name,setName]=useState(""),[slug,setSlug]=useState(""),[city,setCity]=useState("Kinshasa"),[plan,setPlan]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 async function load(){
   setLoading(true);
   const {data:u}=await supabase.auth.getUser();
   if(!u.user){setLoading(false);return}
   const {data:a}=await supabase.from("platform_admins").select("user_id,active").eq("user_id",u.user.id).eq("active",true).maybeSingle();
   setOk(!!a);
   if(a){
     const [s,p]=await Promise.all([
       supabase.from("schools").select("id,name,slug,status,city,phone,created_at").order("created_at",{ascending:false}),
       supabase.from("subscription_plans").select("id,name,label,price_monthly,price_yearly").eq("active",true).order("price_monthly")
     ]);
     setSchools(s.data||[]);setPlans(p.data||[]);
     if(!plan&&p.data?.[0])setPlan(p.data[0].id);
   }
   setLoading(false);
 }
 useEffect(()=>{load()},[]);
 function makeSlug(v:string){return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)}
 async function createSchool(e:React.FormEvent){
   e.preventDefault();setMsg("");setBusy(true);
   const finalSlug=makeSlug(slug||name);
   if(!name||!finalSlug){setMsg("Nom et identifiant de l'école obligatoires.");setBusy(false);return}
   const {data:s,error}=await supabase.from("schools").insert({name,slug:finalSlug,city,status:"trial",created_by:(await supabase.auth.getUser()).data.user?.id,trial_ends_at:new Date(Date.now()+14*86400000).toISOString()}).select().single();
   if(error){setMsg(error.message);setBusy(false);return}
   if(plan){const {error:e2}=await supabase.from("school_subscriptions").insert({school_id:s.id,plan_id:plan,status:"trial",starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+14*86400000).toISOString()});if(e2)setMsg(e2.message)}
   setName("");setSlug("");setMsg("École créée avec une période d'essai de 14 jours.");setBusy(false);load();
 }
 async function toggle(s:School){
   const next=s.status==="suspended"?"active":"suspended";
   const {error}=await supabase.from("schools").update({status:next,updated_at:new Date().toISOString()}).eq("id",s.id);
   if(error)setMsg(error.message);else load();
 }
 if(loading)return <div className="center"><div className="loader"/><p>Chargement de la plateforme…</p></div>;
 if(!ok)return <div className="center"><ShieldCheck size={42}/><h2>Accès refusé</h2><p>Cette zone est réservée à l'administrateur de la plateforme.</p><a className="btn" href="/">Retour à l'école</a></div>;
 return <div className="platform">
   <div className="platformTop"><div><span className="eyebrow">PLATEFORME SAAS</span><h1>Administration des écoles</h1><p>Ajoutez et gérez plusieurs établissements depuis une seule base.</p></div><button className="btn light" onClick={load}><RefreshCw size={17}/> Actualiser</button></div>
   {msg&&<div className="notice">{msg}</div>}
   <div className="platformGrid">
    <form className="panel createForm" onSubmit={createSchool}>
      <div className="sectionTitle"><Building2/><div><h3>Nouvelle école</h3><p>Création sans modifier le code.</p></div></div>
      <label>Nom de l'école<input value={name} onChange={e=>setName(e.target.value)} placeholder="Complexe Scolaire La Réussite" required/></label>
      <label>Identifiant / slug<input value={slug} onChange={e=>setSlug(makeSlug(e.target.value))} placeholder="la-reussite"/><small>Servira à construire le lien de l'école.</small></label>
      <label>Ville<input value={city} onChange={e=>setCity(e.target.value)}/></label>
      <label>Plan initial<select value={plan} onChange={e=>setPlan(e.target.value)}>{plans.map(p=><option key={p.id} value={p.id}>{p.label} — $ {p.price_monthly}/mois</option>)}</select></label>
      <button className="btn full" disabled={busy}><Plus size={17}/>{busy?"Création…":"Créer l'école"}</button>
    </form>
    <div className="panel"><div className="sectionTitle"><Building2/><div><h3>Écoles enregistrées</h3><p>{schools.length} établissement(s)</p></div></div>
      <div className="schoolList">{schools.map(s=><div className="schoolRow" key={s.id}><div><b>{s.name}</b><small>{s.slug} • {s.city||"—"}</small><span className={s.status==="suspended"?"status off":"status"}>{s.status}</span></div><div className="rowActions"><a className="iconBtn" href={"/?school="+encodeURIComponent(s.slug)} title="Ouvrir"><ExternalLink size={17}/></a><button className="iconBtn" onClick={()=>toggle(s)} title={s.status==="suspended"?"Activer":"Suspendre"}><Power size={17}/></button></div></div>)}</div>
    </div>
   </div>
   <div className="panel roadmap"><h3>Modèle commercial</h3><div className="road"><span><b>1</b>Créer l'école</span><span><b>2</b>Choisir le plan</span><span><b>3</b>Créer l'administrateur</span><span><b>4</b>Attribuer le sous-domaine</span><span><b>5</b>Activer / suspendre</span></div></div>
 </div>
}
