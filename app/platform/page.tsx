"use client";

import {useEffect,useState} from "react";
import {supabase} from "../../lib/supabase";
import "./platform.css";
import {Building2,Plus,Power,ExternalLink,ShieldCheck,RefreshCw,UserPlus,X,Copy,Layers,PlusCircle} from "lucide-react";

type School={id:string;name:string;slug:string;status:string;city:string|null;phone:string|null;created_at:string};
type Plan={id:string;name:string;label:string;price_monthly:number;price_yearly:number};
type Module={module_key:string;name:string;description:string;category:string;implementation_status:"available"|"in_development"|"planned";default_enabled:boolean};
type SchoolModule={module_key:string;enabled:boolean};

export default function PlatformPage(){
 const [ok,setOk]=useState(false),[loading,setLoading]=useState(true),[schools,setSchools]=useState<School[]>([]),[plans,setPlans]=useState<Plan[]>([]),[name,setName]=useState(""),[slug,setSlug]=useState(""),[city,setCity]=useState("Kinshasa"),[plan,setPlan]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const [adminSchool,setAdminSchool]=useState<School|null>(null),[admin,setAdmin]=useState({full_name:"",email:"",phone:"",password:""});
 const [modules,setModules]=useState<Module[]>([]),[selectedSchoolId,setSelectedSchoolId]=useState(""),[schoolModules,setSchoolModules]=useState<Record<string,boolean>>({}),[moduleBusy,setModuleBusy]=useState(false);
 const [newModule,setNewModule]=useState({name:"",key:"",category:"Autres",description:""});
 async function load(){
   setLoading(true);
   const {data:u}=await supabase.auth.getUser();
   if(!u.user){location.href="/platform/login";return}
   const {data:a,error:aError}=await supabase.from("platform_admins").select("user_id,active").eq("user_id",u.user.id).eq("active",true).maybeSingle();
   const authorized=!aError&&a?.active===true;
   setOk(authorized);
   if(authorized){
     const [s,p]=await Promise.all([
       supabase.from("schools").select("id,name,slug,status,city,phone,created_at").order("created_at",{ascending:false}),
       supabase.from("subscription_plans").select("id,name,label,price_monthly,price_yearly").eq("active",true).order("price_monthly")
     ]);
     setSchools(s.data||[]);setPlans(p.data||[]);
     if(s.data?.length)setSelectedSchoolId(current=>current&&s.data.some((x:any)=>x.id===current)?current:s.data[0].id);
     const {data:moduleRows}=await supabase.from("module_catalog").select("module_key,name,description,category,implementation_status,default_enabled").order("category").order("name");
     setModules((moduleRows||[]) as Module[]);
     if(!plan&&p.data?.[0])setPlan(p.data[0].id);
   }
   setLoading(false);
 }
 useEffect(()=>{load()},[]);

 useEffect(()=>{if(!selectedSchoolId)return;let alive=true;(async()=>{const {data,error}=await supabase.from("school_modules").select("module_key,enabled").eq("school_id",selectedSchoolId);if(!alive)return;if(error){setMsg("Chargement des modules impossible : "+error.message);return}const map:Record<string,boolean>={};(data||[]).forEach((x:SchoolModule)=>{map[x.module_key]=x.enabled});setSchoolModules(map)})();return()=>{alive=false}},[selectedSchoolId]);
 async function setModuleEnabled(module:Module,enabled:boolean){
  if(module.module_key==="dashboard"&&!enabled){setMsg("Le tableau de bord principal reste toujours activé.");return}if(module.implementation_status!=="available"){setMsg("Ce domaine doit être développé et testé avant son activation.");return}
  setModuleBusy(true);setMsg("");const {data:userData}=await supabase.auth.getUser();const {error}=await supabase.from("school_modules").upsert({school_id:selectedSchoolId,module_key:module.module_key,enabled,updated_at:new Date().toISOString(),updated_by:userData.user?.id||null},{onConflict:"school_id,module_key"});
  if(error)setMsg("Modification du module impossible : "+error.message);else{setSchoolModules(current=>({...current,[module.module_key]:enabled}));setMsg("Module "+(enabled?"activé":"désactivé")+" pour l’établissement sélectionné.")}setModuleBusy(false)
 }
 async function addModule(e:React.FormEvent){
  e.preventDefault();setModuleBusy(true);setMsg("");const key=makeSlug(newModule.key||newModule.name).replace(/-/g,"_");
  if(!key||!newModule.name.trim()){setMsg("Nom et identifiant du domaine obligatoires.");setModuleBusy(false);return}
  const {error}=await supabase.from("module_catalog").insert({module_key:key,name:newModule.name.trim(),description:newModule.description.trim(),category:newModule.category.trim()||"Autres",implementation_status:"planned",default_enabled:false});
  if(error){setMsg("Ajout du domaine impossible : "+error.message);setModuleBusy(false);return}
  setNewModule({name:"",key:"",category:"Autres",description:""});const {data}=await supabase.from("module_catalog").select("module_key,name,description,category,implementation_status,default_enabled").order("category").order("name");setModules((data||[]) as Module[]);
  setMsg("Domaine ajouté au catalogue comme « À développer ». Son interface et ses règles métier devront être implémentées avant activation.");setModuleBusy(false)
 }

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
   if(error){
      let detail=error.message||"Impossible de créer l'administrateur.";
      try{const ctx=(error as any).context;if(ctx?.json){const body=await ctx.json();if(body?.error)detail=body.error+(body?.stage?" — étape: "+body.stage:"");}else if(ctx?.text){const raw=await ctx.text();try{const body=JSON.parse(raw);if(body?.error)detail=body.error+(body?.stage?" — étape: "+body.stage:"")}catch{}}}catch{}
      setMsg(detail);setBusy(false);return
   }
   if(data?.error){setMsg(data.error+(data?.stage?" — étape: "+data.stage:""));setBusy(false);return}
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
   <div className="platformTop"><div><span className="eyebrow">MONATSHIEBE LOGICIEL</span><h1>Administration de la plateforme</h1><p>Gérez plusieurs établissements depuis une seule plateforme.</p></div><button className="btn light" onClick={load}><RefreshCw size={17}/> Actualiser</button></div>
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
      <div className="schoolList">{schools.map(s=><div className="schoolRow" key={s.id}><div><b>{s.name}</b><small>{s.slug} • {s.city||"—"}</small><div className="schoolLinks"><div><small>Connexion école</small><code>{typeof window!=="undefined"?window.location.origin:""}/ecole/{s.slug}</code></div><div><small>Espace parent</small><code>{typeof window!=="undefined"?window.location.origin:""}/ecole/{s.slug}/parent</code></div><div><small>Portail enseignant</small><code>{typeof window!=="undefined"?window.location.origin:""}/ecole/{s.slug}/enseignant</code></div></div><span className={s.status==="suspended"?"status off":"status"}>{s.status}</span></div><div className="rowActions"><button className="iconBtn" title="Copier le lien école" onClick={()=>{navigator.clipboard?.writeText(window.location.origin+"/ecole/"+s.slug);setMsg("Lien de connexion école copié.")}}><Copy size={17}/></button><button className="iconBtn" title="Copier le lien parent" onClick={()=>{navigator.clipboard?.writeText(window.location.origin+"/ecole/"+s.slug+"/parent");setMsg("Lien espace parent copié.")}}><Copy size={17}/></button><button className="iconBtn" onClick={()=>{setAdminSchool(s);setMsg("")}} title="Créer l’administrateur"><UserPlus size={17}/></button><a className="iconBtn" href={"/ecole/"+encodeURIComponent(s.slug)} title="Ouvrir"><ExternalLink size={17}/></a><button className="iconBtn" onClick={()=>toggle(s)} title={s.status==="suspended"?"Activer":"Suspendre"}><Power size={17}/></button></div></div>)}</div>
    </div>
   </div>

   <section className="panel moduleManager">
    <div className="sectionTitle"><Layers/><div><h3>Catalogue des modules</h3><p>{modules.length} domaines enregistrés · activation par établissement</p></div></div>
    <label>Établissement concerné<select value={selectedSchoolId} onChange={e=>setSelectedSchoolId(e.target.value)}>{schools.map(s=><option key={s.id} value={s.id}>{s.name} — {s.slug}</option>)}</select></label>
    <div className="moduleGrid">{modules.map(m=><div className="moduleRow" key={m.module_key}><div className="moduleInfo"><b>{m.name}</b><small>{m.category} · <code>{m.module_key}</code></small><p>{m.description}</p><span className={"status "+(m.implementation_status!=="available"?"off":"")}>{m.implementation_status==="available"?"Disponible dans l’interface":m.implementation_status==="in_development"?"En développement":"À développer"}</span></div><label className="moduleToggle"><input type="checkbox" checked={schoolModules[m.module_key]===true} disabled={moduleBusy||!selectedSchoolId||m.implementation_status!=="available"||m.module_key==="dashboard"} onChange={e=>setModuleEnabled(m,e.target.checked)}/><span>{schoolModules[m.module_key]?"Activé":"Désactivé"}</span></label></div>)}</div>
    <form className="moduleCreate" onSubmit={addModule}><h4><PlusCircle size={18}/> Ajouter un domaine au catalogue</h4><p>Les domaines ajoutés sont en statut « À développer » et ne peuvent pas être activés avant leur implémentation et leurs tests.</p><div className="moduleCreateGrid"><label>Nom du domaine<input required value={newModule.name} onChange={e=>setNewModule({...newModule,name:e.target.value,key:newModule.key||makeSlug(e.target.value)})} placeholder="Ex. Gestion des stages"/></label><label>Identifiant technique<input required value={newModule.key} onChange={e=>setNewModule({...newModule,key:e.target.value})} placeholder="gestion-stages"/></label><label>Catégorie<input value={newModule.category} onChange={e=>setNewModule({...newModule,category:e.target.value})} placeholder="Pédagogie"/></label><label>Description<input value={newModule.description} onChange={e=>setNewModule({...newModule,description:e.target.value})} placeholder="Fonctions principales du domaine"/></label></div><button className="btn" disabled={moduleBusy}><Plus size={16}/>{moduleBusy?"Enregistrement…":"Ajouter au catalogue"}</button></form>
   </section>
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
   <div className="panel roadmap"><h3>Modèle commercial</h3><div className="road"><span><b>1</b>Créer l'école</span><span><b>2</b>Choisir le plan</span><span><b>3</b>Créer l'administrateur</span><span><b>4</b>Générer les liens école et parent</span><span><b>5</b>Activer / suspendre</span></div></div>
 </div>
}
