import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { routing } from '@pkg/i18n/routing';
import { buildAdminCsp, buildPublicCsp, createNonce } from '@pkg/security/csp';
import { refreshSupabaseSession } from '@pkg/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

const LOGIN_PATH = '/admin/login';

/**
 * Three jobs, split by path because they do not overlap:
 *
 *   /api/*    — nothing. Route handlers do their own auth in the Node runtime,
 *               where Prisma is available.
 *   /admin/*  — refresh the Supabase session and bounce anonymous visitors to
 *               the login page. This is a CHEAP gate, not the real one: Prisma
 *               does not run on Edge, so middleware cannot check the AdminUser
 *               allowlist. `requireAdmin()` does that on every admin route and
 *               API call, and is what actually protects the data.
 *   everything else — next-intl locale routing.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    return handleAdmin(request);
  }

  const response = intlMiddleware(request);
  response.headers.set('Content-Security-Policy', buildPublicCsp());
  return response;
}

async function handleAdmin(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = createNonce();
  const csp = buildAdminCsp(nonce);

  // Next.js reads the nonce out of the CSP header on the REQUEST and applies it
  // to the scripts it injects, so it has to be set on both request and response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Must run against this exact response object — it writes the refreshed auth
  // cookies onto it.
  const user = await refreshSupabaseSession(request, response);

  const isLoginPage = pathname === LOGIN_PATH;

  if (!user && !isLoginPage) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    // Send them back where they were heading once they are in. Only the path
    // and query are carried over, so this cannot become an open redirect.
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);

    const redirect = NextResponse.redirect(loginUrl);
    // Carry over any refreshed cookies, or the browser loses the session.
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    redirect.headers.set('Content-Security-Policy', csp);
    return redirect;
  }

  if (user && isLoginPage) {
    const redirect = NextResponse.redirect(new URL('/admin', request.url));
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Everything except Next's own assets and static files. Running middleware
    // on those would add latency to every image and script for no benefit.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
};
