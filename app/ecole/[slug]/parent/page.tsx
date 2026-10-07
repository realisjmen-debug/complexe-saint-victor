import {redirect} from "next/navigation";

export default async function SchoolParentEntry({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  redirect("/parent?school="+encodeURIComponent(slug));
}
