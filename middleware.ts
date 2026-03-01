// FILE: middleware.ts
// CHEROLEE CORE — Auth Gate for /dashboard/*
//
// CHANGELOG
// - Protects all /dashboard routes
// - Redirects unauthenticated users to /login
// - Keeps other routes public (/, /login, etc.)
//
// ANCHOR:ROUTES
// - Protected: /dashboard/*
// - Public: everything else

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Only gate /dashboard/*
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Prepare response so Supabase can read/write auth cookies.
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Validate session/user
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user || error) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // preserve where they were going
    loginUrl.searchParams.set("next", pathname + (search ?? ""));
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

// Only run middleware on /dashboard paths
export const config = {
  matcher: ["/dashboard/:path*"],
};