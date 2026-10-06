"use client";

import {useEffect,useState} from "react";
import {supabase} from "../../lib/supabase";
import "./platform.css";
import {Building2,Plus,Power,ExternalLink,ShieldCheck,RefreshCw,UserPlus,X} from "lucide-react";

type School={id:string;name:string;slug:string;status:string;city:string|null;phone:string|null;created_at:string};
type Plan={id:string;name:string;label:string;price_monthly:number;price_yearly:number};

export default function PlatformPage(){
 const [ok,setOk]=useState(false),[loading,setLoading]=useState(true),[schools,setSchools]=useState<School[]>([]),[plans,setPlans]=useState<Plan[]>([]),[name,setName]=useState(""),[slug,setSlug]=useState(""),[city,setCity]=useState("Kinshasa"),[plan,setPlan]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const [adminSchool,setAdminSchool]=useState<School|null>(null),[admin,setAdmin]=useState({full_name:"",email:"",phone:"",password:""});
 async function load(){
   setLoading(true);
   const {data:u}=await supabase.auth.getUser();
   if(!u.user){setLoading(false);return}
   const {data:a,error:aError}=await supabase.from("platform_admins").select("user_id,active").eq("user_id",u.user.id).eq("active",true).maybeSingle();
   const authorized=!aError&&a?.active===true;
   setOk(authorized);
   if(authorized){
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
 function makeSlug(v:string){return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-+|-+$/g,"").slice(0,48)}
 async function createSchool(e:React.FormEvent){
   e.preventDefault();setMsg("");setBusy(true);
   const finalSlug=makeSlug(slug||name);
   if(!name||!finalSlug){setMsg("Nom et identifiant de l'école obligatoires.");setBusy(false);return}
   const {data,error}=await supabase.functions.invoke("create-school",{body:{name:name.trim(),slug:finalSlug,city:city.trim(),plan_id:plan||null}});
   if(error){
      let detail=error.message||"réessayez.";
      try{
        const ctx=(error as any).context;
        if(ctx?.json){const body=await ctx.json();if(body?.error)detail=body.error;}
        else if(ctx?.text){const raw=await ctx.text();try{const body=JSON.parse(raw);if(body?.error)detail=body.error;}catch{}}
      }catch{}
      setMsg(detail);setBusy(false);return
    }
   if(data?.error){setMsg(data.error);setBusy(false);return}
   setName("");setSlug("");setMsg("École créée avec succès. Vous pouvez maintenant créer son administrateur.");setBusy(false);await load();
 }
 async function createAdmin(e:React.FormEvent){
   e.preventDefault();if(!adminSchool)return;
   setBusy(true);setMsg("");
   const {data,error}=await supabase.functions.invoke("create-school-admin",{body:{school_id:adminSchool.id,...admin}});
   if(error){setMsg(error.message||"Impossible de créer l'administrateur.");setBusy(false);return}
   if(data?.error){setMsg(data.error);setBusy(false);return}
   setMsg("Administrateur créé pour "+adminSchool.name+". Il peut maintenant se connecter avec son email et le mot de passe défini.");
   setAdmin({full_name:"",email:"",phone:"",password:""});setAdminSchool(null);setBusy(false);
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
      <div className="schoolList">{schools.map(s=><div className="schoolRow" key={s.id}><div><b>{s.name}</b><small>{s.slug} • {s.city||"—"}</small><span className={s.status==="suspended"?"status off":"status"}>{s.status}</span></div><div className="rowActions"><button className="iconBtn" onClick={()=>{setAdminSchool(s);setMsg("")}} title="Créer l’administrateur"><UserPlus size={17}/></button><a className="iconBtn" href={"/ecole/"+encodeURIComponent(s.slug)} title="Ouvrir"><ExternalLink size={17}/></a><button className="iconBtn" onClick={()=>toggle(s)} title={s.status==="suspended"?"Activer":"Suspendre"}><Power size={17}/></button></div></div>)}</div>
    </div>
   </div>
   {adminSchool&&<div className="modalBackdrop" onClick={()=>!busy&&setAdminSchool(null)}>
     <form className="panel adminModal" onSubmit={createAdmin} onClick={e=>e.stopPropagation()}>
       <div className="sectionTitle"><UserPlus/><div><h3>Administrateur de l'école</h3><p>{adminSchool.name}</p></div><button type="button" className="iconBtn" onClick={()=>setAdminSchool(null)} disabled={busy}><X size={18}/></button></div>
       <label>Nom complet<input required value={admin.full_name} onChange={e=>setAdmin({...admin,full_name:e.target.value})} placeholder="Nom du promoteur"/></label>
       <label>Email de connexion<input required type="email" value={admin.email} onChange={e=>setAdmin({...admin,email:e.target.value})} placeholder="administration@ecole.cd"/></label>
       <label>Téléphone<input value={admin.phone} onChange={e=>setAdmin({...admin,phone:e.target.value})} placeholder="+243…"/></label>
       <label>Mot de passe initial<input required minLength={8} type="password" value={admin.password} onChange={e=>setAdmin({...admin,password:e.target.value})} placeholder="8 caractères minimum"/></label>
       <small>Le compte sera créé avec le rôle <b>Promoteur / Propriétaire</b> et aura accès à l'espace complet de cette école.</small>
       <button className="btn full" disabled={busy}><UserPlus size={17}/>{busy?"Création du compte…":"Créer l'administrateur"}</button>
     </form>
   </div>}
   <div className="panel roadmap"><h3>Modèle commercial</h3><div className="road"><span><b>1</b>Créer l'école</span><span><b>2</b>Choisir le plan</span><span><b>3</b>Créer l'administrateur</span><span><b>4</b>Attribuer le sous-domaine</span><span><b>5</b>Activer / suspendre</span></div></div>
 </div>
}
