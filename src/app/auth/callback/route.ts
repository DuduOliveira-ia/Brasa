import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAllowedEmails } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/";

  // Sanitiza redirect para evitar open redirect
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/";

  if (!code) {
    return redirectWithError(url, "Login sem código de autorização.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectWithError(url, error.message);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Camada extra de allowlist (a DB também bloqueia via trigger)
  const allowed = getAllowedEmails();
  const email = user?.email?.toLowerCase();
  if (allowed.length > 0 && (!email || !allowed.includes(email))) {
    await supabase.auth.signOut();
    return redirectWithError(
      url,
      `E-mail ${email ?? "?"} não está autorizado.`,
    );
  }

  const dest = new URL(next, url.origin);
  return NextResponse.redirect(dest);
}

function redirectWithError(base: URL, message: string) {
  const dest = new URL("/login", base.origin);
  dest.searchParams.set("error", message);
  return NextResponse.redirect(dest);
}
