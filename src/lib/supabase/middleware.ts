/**
 * Supabase Client for Middleware
 * Used to refresh sessions and protect routes
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  // Skip authentication for cron jobs (they use their own CRON_SECRET auth)
  const path = request.nextUrl.pathname;
  if (path.startsWith('/api/cron/')) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes logic

  // Public routes (accessible without auth)
  const publicRoutes = ['/login', '/signup'];
  const isPublicRoute = publicRoutes.includes(path);

  // Redirect logic
  if (!user && !isPublicRoute && path !== '/') {
    // User is not authenticated, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  if (user && isPublicRoute) {
    // User is authenticated, redirect from login/signup to dashboard
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Super admin routes protection
  if (user && path.startsWith('/super-admin')) {
    // Use service role client to bypass RLS (avoid recursion issues)
    const supabaseAdmin = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // No need to set cookies for admin client
          },
        },
      }
    );

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, tenant_id, email')
      .eq('id', user.id)
      .maybeSingle<{ role: string; tenant_id: string | null; email: string }>();

    if (!profile || profile.role !== 'super_admin') {
      // User is not a super admin, redirect to dashboard
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Admin tenant routes protection
  if (user && path.startsWith('/admin')) {
    const supabaseAdmin = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // No need to set cookies for admin client
          },
        },
      }
    );

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .maybeSingle<{ role: string; tenant_id: string | null }>();

    if (!profile || profile.role !== 'admin') {
      // User is not an admin, redirect to dashboard
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Responsable routes protection
  if (user && path.startsWith('/responsable')) {
    const supabaseAdmin = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // No need to set cookies for admin client
          },
        },
      }
    );

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, tenant_id, equipe_id')
      .eq('id', user.id)
      .maybeSingle<{ role: string; tenant_id: string | null; equipe_id: string | null }>();

    if (!profile || profile.role !== 'responsable') {
      // User is not a responsable, redirect to dashboard
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Collaborateur routes protection
  if (user && path.startsWith('/collaborateur')) {
    const supabaseAdmin = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // No need to set cookies for admin client
          },
        },
      }
    );

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, tenant_id, equipe_id')
      .eq('id', user.id)
      .maybeSingle<{ role: string; tenant_id: string | null; equipe_id: string | null }>();

    if (!profile || profile.role !== 'collaborateur') {
      // User is not a collaborateur, redirect to dashboard
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
