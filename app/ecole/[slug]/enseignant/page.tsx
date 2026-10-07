import {redirect} from "next/navigation";

export default async function SchoolTeacherEntry({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  redirect("/enseignant?school="+encodeURIComponent(slug));
}
