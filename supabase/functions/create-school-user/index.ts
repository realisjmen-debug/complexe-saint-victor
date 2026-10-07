import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});try{
const auth=req.headers.get("Authorization");if(!auth)return json({error:"Authentification requise."},401);
const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||Deno.env.get("SUPABASE_ANON_KEY")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
if(!url||!anon||!service)return json({error:"Configuration Supabase serveur incomplète."},500);
const caller=createClient(url,anon,{global:{headers:{Authorization:auth}}});const token=auth.replace(/^Bearer\s+/i,"");const {data:au,error:ae}=await caller.auth.getUser(token);if(ae||!au.user)return json({error:"Session invalide."},401);
const db=createClient(url,service);const {data:profile,error:pe}=await db.from("profiles").select("school_id,active,roles(name)").eq("id",au.user.id).maybeSingle();if(pe||!profile?.active||!profile.school_id)return json({error:"Aucun accès scolaire actif."},403);
const callerRole=(profile.roles as any)?.name;if(!["promoteur","directeur","administrateur"].includes(callerRole))return json({error:"Vous n'avez pas le droit d'ajouter des utilisateurs."},403);
const body=await req.json();const email=String(body.email||"").trim().toLowerCase(),fullName=String(body.full_name||"").trim(),phone=String(body.phone||"").trim(),password=String(body.password||""),roleName=String(body.role_name||"").trim().toLowerCase();
const allowed=["administrateur","directeur","comptable","enseignant","etudes","finance","secretaire","surveillant","discipline"];if(!email||!fullName||password.length<8||!allowed.includes(roleName))return json({error:"Nom, email, rôle autorisé et mot de passe d'au moins 8 caractères sont obligatoires."},400);
const {data:role,error:re}=await db.from("roles").select("id,name,label").eq("name",roleName).maybeSingle();if(re||!role)return json({error:"Rôle introuvable."},400);
const {data:created,error:ce}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:fullName,school_id:profile.school_id}});if(ce||!created.user)return json({error:"Création du compte impossible: "+(ce?.message||"réponse vide")},400);
const {error:ie}=await db.rpc("create_school_profile",{p_user_id:created.user.id,p_school_id:profile.school_id,p_role_id:role.id,p_full_name:fullName,p_phone:phone});if(ie){await db.auth.admin.deleteUser(created.user.id);return json({error:"Le compte a été créé mais son accès à l'école a échoué: "+ie.message},500);}
const uniqueRoles=["administrateur","directeur","secretaire","finance","comptable","etudes","discipline","surveillant"];
if(uniqueRoles.includes(roleName)){
 const {data:existing}=await db.from("profiles").select("id").eq("school_id",profile.school_id).eq("role_id",role.id).eq("active",true).neq("id",created.user.id).limit(1);
 if(existing?.length){await db.from("profiles").delete().eq("id",created.user.id);await db.auth.admin.deleteUser(created.user.id);return json({error:"Ce rôle est déjà attribué à une personne active dans cette école."},409);}
}
if(roleName==="enseignant"){
 const accessCode="T-"+crypto.randomUUID().replaceAll("-","").slice(0,10).toUpperCase();
 const {data:teacher}=await db.from("teachers").select("id").eq("school_id",profile.school_id).eq("email",email).maybeSingle();
 if(teacher) await db.from("teachers").update({access_code:accessCode,active:true}).eq("id",teacher.id);
 else await db.from("teachers").insert({school_id:profile.school_id,matricule:"ENS-"+new Date().getFullYear()+"-"+String(Date.now()).slice(-5),last_name:fullName.split(" ").slice(-1).join(" "),first_name:fullName.split(" ").slice(0,-1).join(" ")||fullName,email,phone:phone||null,active:true,access_code:accessCode});
 return json({success:true,user:{id:created.user.id,email,full_name:fullName,role:role.label,access_code:accessCode}});
}
return json({success:true,user:{id:created.user.id,email,full_name:fullName,role:role.label}});
}catch(e){return json({error:e instanceof Error?e.message:"Erreur serveur."},500)}});
