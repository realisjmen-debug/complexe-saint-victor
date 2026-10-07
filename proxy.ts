import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname.startsWith("/ecole/")) {
    const parts = pathname.split("/").filter(Boolean);
    const slug = parts[1];
    const isParent = parts[2] === "parent";
    const isTeacher = parts[2] === "enseignant";
    const isTeacher = parts[2] === "enseignant" || parts[2] === "teacher";
    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = isParent ? "/parent" : isTeacher ? "/enseignant" : "/";
      url.searchParams.set("school", slug);
      if (isParent) url.searchParams.set("parent", "1");
      if (isTeacher) url.searchParams.set("teacher", "1");
      if (isTeacher) url.searchParams.set("teacher", "1");
      return NextResponse.rewrite(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/ecole/:path*"],
};
