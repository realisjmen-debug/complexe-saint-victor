import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname.startsWith("/ecole/")) {
    const slug = pathname.split("/")[2];
    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("school", slug);
      return NextResponse.rewrite(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/ecole/:path*"],
};
