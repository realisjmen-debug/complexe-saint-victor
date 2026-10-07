import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 try{
  const body=await req.json(),code=String(body.code||"").trim().toUpperCase(),action=String(body.action||"login");
  const url=Deno.env.get("SUPABASE_URL")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!service)return json({error:"Configuration serveur Supabase incomplète."},500);
  const db=createClient(url,service),slug=String(body.school_slug||"").trim().toLowerCase();
  const {data:school}=await db.from("schools").select("id,name,slug,logo_url,logo_path,primary_color,secondary_color").eq("slug",slug).eq("status","active").maybeSingle();
  if(!school)return json({error:"Établissement introuvable ou suspendu."},404);
  if(action==="branding"){
   let logoUrl=school.logo_url||null;
   if(school.logo_path){const {data:x}=await db.storage.from("school-assets").createSignedUrl(school.logo_path,3600);logoUrl=x?.signedUrl||logoUrl}
   return json({success:true,school:{name:school.name,slug:school.slug,logo_url:logoUrl,primary_color:school.primary_color,secondary_color:school.secondary_color}});
  }
  if(!/^T-[A-Z0-9]{8,20}$/.test(code))return json({error:"Code enseignant invalide."},400);
  const {data:teacher,error:te}=await db.from("teachers").select("id,school_id,matricule,last_name,first_name,post_name,email,phone,photo_url,access_code").eq("school_id",school.id).eq("access_code",code).eq("active",true).maybeSingle();
  if(te)return json({error:"Lecture impossible: "+te.message},500);
  if(!teacher)return json({error:"Code enseignant invalide ou désactivé."},404);
  const {data:assignments}=await db.from("teacher_subject_assignments").select("id,class_id,subject_id,academic_year_id,classes(id,name),subjects(id,name,coefficient)").eq("school_id",school.id).eq("teacher_id",teacher.id).eq("active",true);
  if(action==="login")return json({success:true,school,teacher:{id:teacher.id,matricule:teacher.matricule,last_name:teacher.last_name,first_name:teacher.first_name,post_name:teacher.post_name},assignments:assignments||[]});
  if(action==="create_assessment"){
   const classId=String(body.class_id||""),subjectId=String(body.subject_id||"");
   if(!(assignments||[]).some((a:any)=>a.class_id===classId&&a.subject_id===subjectId))return json({error:"Cette classe et cette matière ne sont pas affectées à votre compte."},403);
   if(!String(body.title||"").trim())return json({error:"Le titre de l'évaluation est obligatoire."},400);
   const {data,error}=await db.from("assessments").insert({school_id:school.id,class_id:classId,subject_id:subjectId,title:String(body.title).trim(),assessment_date:body.assessment_date||null,max_score:Number(body.max_score||20),term:String(body.term||"Trimestre 1"),assessment_type:String(body.assessment_type||"devoir"),created_by:null}).select("id,title,assessment_date,max_score,term,assessment_type,class_id,subject_id").single();
   if(error)return json({error:error.message},400);
   return json({success:true,assessment:data});
  }
  if(action==="list_assessments"){
   const pairs=(assignments||[]).map((a:any)=>({class_id:a.class_id,subject_id:a.subject_id,className:a.classes?.name,subjectName:a.subjects?.name}));
   const {data}=await db.from("assessments").select("id,title,assessment_date,max_score,term,assessment_type,class_id,subject_id").eq("school_id",school.id).order("assessment_date",{ascending:false}).limit(100);
   return json({success:true,assessments:(data||[]).filter((a:any)=>pairs.some((p:any)=>p.class_id===a.class_id&&p.subject_id===a.subject_id)).map((a:any)=>({...a,...(pairs.find((p:any)=>p.class_id===a.class_id&&p.subject_id===a.subject_id)||{})}))});
  }
  if(action==="get_grades"){
   const assessmentId=String(body.assessment_id||"");
   const {data:a}=await db.from("assessments").select("id,class_id,subject_id,title,max_score").eq("id",assessmentId).eq("school_id",school.id).maybeSingle();
   if(!a)return json({error:"Évaluation introuvable."},404);
   if(!(assignments||[]).some((x:any)=>x.class_id===a.class_id&&x.subject_id===a.subject_id))return json({error:"Accès refusé."},403);
   const {data:e}=await db.from("enrollments").select("student_id,students(id,matricule,last_name,first_name)").eq("school_id",school.id).eq("class_id",a.class_id).eq("status","active");
   const {data:g}=await db.from("grades").select("student_id,score,comment").eq("assessment_id",a.id);
   const gm=new Map((g||[]).map((x:any)=>[x.student_id,x]));
   return json({success:true,assessment:a,students:(e||[]).map((x:any)=>({student_id:x.student_id,student:x.students,score:gm.get(x.student_id)?.score??"",comment:gm.get(x.student_id)?.comment||""}))});
  }
  if(action==="save_grades"){
   const assessmentId=String(body.assessment_id||""),grades=Array.isArray(body.grades)?body.grades:[];
   const {data:a}=await db.from("assessments").select("id,class_id,subject_id,school_id").eq("id",assessmentId).eq("school_id",school.id).maybeSingle();
   if(!a||!(assignments||[]).some((x:any)=>x.class_id===a.class_id&&x.subject_id===a.subject_id))return json({error:"Évaluation introuvable ou non autorisée."},403);
   const {data:enrollments}=await db.from("enrollments").select("student_id").eq("school_id",school.id).eq("class_id",a.class_id).eq("status","active");
   const allowedStudents=new Set((enrollments||[]).map((x:any)=>x.student_id));
   const clean=grades.filter((g:any)=>allowedStudents.has(g.student_id)&&g.score!==""&&g.score!==null).map((g:any)=>({assessment_id:a.id,student_id:g.student_id,score:Number(g.score),comment:g.comment?String(g.comment):null,graded_at:new Date().toISOString()}));
   await db.from("grades").delete().eq("assessment_id",a.id);
   if(clean.length){const {error}=await db.from("grades").insert(clean);if(error)return json({error:error.message},400);}
   return json({success:true,count:clean.length});
  }
  return json({error:"Action non reconnue."},400);
 }catch(e){return json({error:e instanceof Error?e.message:"Erreur serveur."},500)}
});