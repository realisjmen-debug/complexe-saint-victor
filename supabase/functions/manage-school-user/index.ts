import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
const allowed=["administrateur","directeur","comptable","enseignant","etudes","finance","secretaire","surveillant","discipline"];
const uniqueRoles=["administrateur","directeur","secretaire","finance","comptable","etudes","discipline","surveillant"];
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 try{
  const auth=req.headers.get("Authorization");if(!auth)return json({error:"Authentification requise."},401);
  const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||Deno.env.get("SUPABASE_ANON_KEY")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!anon||!service)return json({error:"Configuration serveur incomplète."},500);
  const caller=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const token=auth.replace(/^Bearer\s+/i,"");
  const {data:au,error:ae}=await caller.auth.getUser(token);if(ae||!au.user)return json({error:"Session invalide."},401);
  const db=createClient(url,service);
  const {data:actor,error:actorError}=await db.from("profiles").select("id,school_id,active,roles(name)").eq("id",au.user.id).maybeSingle();
  if(actorError||!actor?.active||!actor.school_id)return json({error:"Aucun accès scolaire actif."},403);
  const actorRole=(actor.roles as any)?.name;
  if(!["promoteur","directeur","administrateur"].includes(actorRole))return json({error:"Vous n’avez pas le droit de gérer le personnel."},403);
  const body=await req.json();
  const targetId=String(body.target_profile_id||"");
  const action=String(body.action||"update");
  if(!targetId||targetId===au.user.id)return json({error:"Sélectionnez un autre membre du personnel."},400);
  const {data:target,error:targetError}=await db.from("profiles").select("id,school_id,active,roles(name)").eq("id",targetId).maybeSingle();
  if(targetError||!target||target.school_id!==actor.school_id)return json({error:"Personnel introuvable dans votre établissement."},404);
  const targetRole=(target.roles as any)?.name;
  if(targetRole==="promoteur")return json({error:"Le compte du Promoteur principal est protégé."},403);
  if(action==="deactivate"){
   const {error}=await db.from("profiles").update({active:false,updated_at:new Date().toISOString()}).eq("id",targetId).eq("school_id",actor.school_id);
   if(error)return json({error:"Retrait d’accès impossible : "+error.message},400);
   await db.from("school_audit_logs").insert({school_id:actor.school_id,actor_user_id:au.user.id,actor_name:au.user.email||"Utilisateur autorisé",action:"staff.access_removed",entity_table:"profiles",entity_id:targetId,after_data:{active:false}});
   return json({success:true,message:"Accès retiré. L’historique est conservé."});
  }
  if(action!=="update")return json({error:"Action inconnue."},400);
  const fullName=String(body.full_name||"").trim(),phone=String(body.phone||"").trim(),roleName=String(body.role_name||"").trim().toLowerCase(),contractType=String(body.contract_type||"").trim(),staffDuties=String(body.staff_duties||"").trim(),salaryCurrency=String(body.salary_currency||"FC")==="USD"?"USD":"FC",salaryRaw=body.monthly_salary,monthlySalary=salaryRaw===undefined||salaryRaw===null||salaryRaw===""?null:Number(salaryRaw);
  if(!fullName||!allowed.includes(roleName))return json({error:"Nom et rôle autorisé obligatoires."},400);if(monthlySalary!==null&&(!Number.isFinite(monthlySalary)||monthlySalary<0))return json({error:"Salaire invalide."},400);
  if(roleName==="promoteur")return json({error:"Le rôle Promoteur principal ne peut pas être attribué ici."},403);
  const {data:role,error:roleError}=await db.from("roles").select("id,name").eq("name",roleName).maybeSingle();
  if(roleError||!role)return json({error:"Rôle introuvable."},400);
  if(uniqueRoles.includes(roleName)){
   const {data:existing,error:existingError}=await db.from("profiles").select("id").eq("school_id",actor.school_id).eq("role_id",role.id).eq("active",true).neq("id",targetId).limit(1);
   if(existingError)return json({error:existingError.message},400);
   if(existing?.length)return json({error:"Ce rôle est déjà attribué à une personne active dans cette école."},409);
  }
  const {error}=await db.from("profiles").update({full_name:fullName,phone:phone||null,role_id:role.id,contract_type:contractType||null,monthly_salary:monthlySalary,salary_currency:salaryCurrency,staff_duties:staffDuties||null,updated_at:new Date().toISOString()}).eq("id",targetId).eq("school_id",actor.school_id);
  if(error)return json({error:"Modification impossible : "+error.message},400);
  await db.from("school_audit_logs").insert({school_id:actor.school_id,actor_user_id:au.user.id,actor_name:au.user.email||"Utilisateur autorisé",action:"staff.updated",entity_table:"profiles",entity_id:targetId,after_data:{full_name:fullName,phone:phone||null,role_name:roleName,contract_type:contractType||null,monthly_salary:monthlySalary,salary_currency:salaryCurrency,staff_duties:staffDuties||null}});
  return json({success:true,message:"Personnel modifié."});
 }catch(e){return json({error:e instanceof Error?e.message:"Erreur serveur."},500)}
});