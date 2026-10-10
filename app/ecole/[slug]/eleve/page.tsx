"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {schoolSupabase as supabase} from "../../../../lib/supabase";
import {BookOpen,CalendarCheck,FileText,LogOut,ShieldCheck} from "lucide-react";

export default function StudentPortalPage(){
 const params=useParams<{slug:string}>();const slug=decodeURIComponent(params.slug||"");
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[student,setStudent]=useState<any>(null),[school,setSchool]=useState<any>(null),[grades,setGrades]=useState<any[]>([]),[attendance,setAttendance]=useState<any[]>([]),[announcements,setAnnouncements]=useState<any[]>([]),[enrollments,setEnrollments]=useState<any[]>([]);
 useEffect(()=>{let live=true;(async()=>{const {data:sessionData}=await supabase.auth.getSession();if(!sessionData.session){if(live){setError("Connectez-vous avec le compte élève qui vous a été attribué.");setLoading(false)}return}
 const {data:ctx,error:ctxError}=await supabase.rpc("get_my_student_portal_context");if(ctxError||!ctx?.length){if(live){setError("Aucun portail élève actif n’est lié à ce compte. Contactez le secrétariat de votre école.");setLoading(false)}return}
 const me=ctx[0];const {data:schoolData}=await supabase.from("schools").select("id,name,logo_path,primary_color,secondary_color,slug").eq("id",me.school_id).eq("slug",slug).maybeSingle();if(!schoolData){if(live){setError("Le lien ne correspond pas à votre établissement.");setLoading(false)}return}
 const [s,g,a,n,e]=await Promise.all([
  supabase.from("students").select("id,school_id,matricule,last_name,first_name,post_name,photo_url").eq("id",me.student_id).eq("school_id",me.school_id).maybeSingle(),
  supabase.from("grades").select("*").eq("school_id",me.school_id).eq("student_id",me.student_id).order("created_at",{ascending:false}).limit(100),
  supabase.from("attendance").select("*").eq("school_id",me.school_id).eq("student_id",me.student_id).order("date",{ascending:false}).limit(60),
  supabase.from("announcements").select("*").eq("school_id",me.school_id).order("created_at",{ascending:false}).limit(10),
  supabase.from("enrollments").select("*,classes(name),academic_years(name)").eq("school_id",me.school_id).eq("student_id",me.student_id).order("created_at",{ascending:false}).limit(5)
 ]);
 if(live){setSchool(schoolData);setStudent(s.data||me);setGrades(g.data||[]);setAttendance(a.data||[]);setAnnouncements(n.data||[]);setEnrollments(e.data||[]);setLoading(false)}
 })();return()=>{live=false}},[slug]);
 async function logout(){await supabase.auth.signOut();window.location.href="/"}
 if(loading)return <main style={center}><p>Chargement du portail élève…</p></main>;
 if(error)return <main style={center}><ShieldCheck size={38}/><h2>Portail élève</h2><p>{error}</p><a href={`/ecole/${encodeURIComponent(slug)}`} style={btn}>Connexion de l’établissement</a></main>;
 const full=[student?.first_name,student?.post_name,student?.last_name].filter(Boolean).join(" ");
 return <main style={{minHeight:"100vh",background:"#f2f6fa",color:"#18324a",padding:20}}><div style={{maxWidth:1100,margin:"0 auto",display:"grid",gap:16}}>
 <header style={{padding:22,borderRadius:18,background:`linear-gradient(120deg,${school?.primary_color||"#123b5b"},#236783)`,color:"#fff",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><small style={{letterSpacing:1.4,opacity:.8}}>PORTAIL AUTONOME DES ÉLÈVES</small><h1 style={{margin:"6px 0",fontSize:28}}>{school?.name}</h1><p style={{margin:0,opacity:.85}}>Bienvenue, {full||"élève"} · Matricule {student?.matricule||"—"}</p></div><button onClick={logout} style={{...btn,background:"#ffffff20",color:"#fff"}}><LogOut size={16}/>Déconnexion</button></header>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}><section style={card}><BookOpen/><h3>Inscription scolaire</h3>{enrollments.length?enrollments.map((x,i)=><p key={x.id||i}>{x.classes?.name||"Classe"} · {x.academic_years?.name||"Année scolaire"} · {x.status||"Inscrit"}</p>):<p>Aucune inscription publiée.</p>}</section><section style={card}><FileText/><h3>Notes et évaluations</h3><b style={{fontSize:25}}>{grades.length}</b><p>Résultats disponibles</p></section><section style={card}><CalendarCheck/><h3>Présences</h3><b style={{fontSize:25}}>{attendance.length}</b><p>Enregistrements de présence</p></section></div>
 <section style={card}><h2 style={h2}>Mes notes</h2>{grades.length?<div style={tableWrap}><table style={table}><thead><tr>{Object.keys(grades[0]).filter(k=>["subject_id","assessment_id","score","max_score","grade","created_at"].includes(k)).map(k=><th style={th} key={k}>{({subject_id:"Matière",assessment_id:"Évaluation",score:"Note",max_score:"Sur",grade:"Cote",created_at:"Date"} as any)[k]||k}</th>)}</tr></thead><tbody>{grades.map((g,i)=><tr key={g.id||i}>{Object.keys(g).filter(k=>["subject_id","assessment_id","score","max_score","grade","created_at"].includes(k)).map(k=><td style={td} key={k}>{g[k]??"—"}</td>)}</tr>)}</tbody></table></div>:<p>Les notes ne sont pas encore publiées ou disponibles.</p>}</section>
 <section style={card}><h2 style={h2}>Mes présences récentes</h2>{attendance.length?<div style={tableWrap}><table style={table}><thead><tr>{Object.keys(attendance[0]).filter(k=>["date","attendance_date","status","note"].includes(k)).map(k=><th style={th} key={k}>{k==="date"||k==="attendance_date"?"Date":k==="status"?"Statut":"Observation"}</th>)}</tr></thead><tbody>{attendance.map((a,i)=><tr key={a.id||i}>{Object.keys(a).filter(k=>["date","attendance_date","status","note"].includes(k)).map(k=><td style={td} key={k}>{a[k]??"—"}</td>)}</tr>)}</tbody></table></div>:<p>Aucune présence enregistrée.</p>}</section>
 <section style={card}><h2 style={h2}>Communications de l’école</h2>{announcements.length?announcements.map((a,i)=><article key={a.id||i} style={{padding:"12px 0",borderBottom:"1px solid #e9eef3"}}><b>{a.title||"Annonce"}</b><p>{a.content||a.message||a.body||""}</p><small>{a.created_at?new Date(a.created_at).toLocaleDateString("fr-FR"):""}</small></article>):<p>Aucune annonce disponible.</p>}</section>
 <p style={{fontSize:12,color:"#6e8092",textAlign:"center"}}>Espace personnel sécurisé · Si une information semble incorrecte, contactez le secrétariat.</p></div></main>
}
const center:React.CSSProperties={minHeight:"100vh",display:"grid",placeContent:"center",justifyItems:"center",gap:12,padding:24,background:"#f2f6fa",color:"#18324a"};
const card:React.CSSProperties={background:"#fff",padding:20,borderRadius:15,border:"1px solid #e2eaf1"};
const h2:React.CSSProperties={marginTop:0,fontSize:19};
const tableWrap:React.CSSProperties={overflowX:"auto"};
const table:React.CSSProperties={width:"100%",borderCollapse:"collapse",fontSize:13};
const th:React.CSSProperties={padding:10,textAlign:"left",background:"#f5f8fb",whiteSpace:"nowrap"};
const td:React.CSSProperties={padding:10,borderBottom:"1px solid #e9eef3"};
const btn:React.CSSProperties={display:"inline-flex",gap:8,alignItems:"center",padding:"11px 14px",borderRadius:10,border:0,background:"#123b5b",color:"#fff",textDecoration:"none",fontWeight:600};
