import {redirect} from "next/navigation";

export default async function SchoolEntry({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  redirect("/?school="+encodeURIComponent(slug));
}
