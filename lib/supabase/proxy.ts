import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // Account-setup gate: a signed-in user with is_setup_complete=false must
  // finish /account-setup before they can navigate anywhere else in the app.
  // Once complete, they cannot revisit /account-setup either.
  if (user) {
    const pathname = request.nextUrl.pathname
    const isSetupPath = pathname.startsWith('/account-setup')
    const isPublicPath =
      pathname.startsWith('/login') ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/attend') ||
      pathname === '/'

    if (!isPublicPath) {
      const { data: setupProfile } = await supabase
        .from('profiles')
        .select('is_setup_complete, role')
        .eq('user_id', user.sub)
        .single()

      // If the signed-in user's profile is gone (deleted by an admin), the
      // session cookie is orphaned. Sign them out so they land on /login
      // instead of being redirected back into /account-setup forever.
      if (!setupProfile) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }

      const isComplete = setupProfile?.is_setup_complete === true

      if (!isComplete && !isSetupPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/account-setup'
        return NextResponse.redirect(url)
      }

      if (isComplete && isSetupPath) {
        const url = request.nextUrl.clone()
        url.pathname =
          setupProfile?.role === 'admin' || setupProfile?.role === 'bod'
            ? '/admin'
            : setupProfile?.role === 'user'
              ? '/users'
              : '/exec'
        return NextResponse.redirect(url)
      }
    }
  }

  // block active users from accessing /inactive directly
  if (user && request.nextUrl.pathname.startsWith('/inactive')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status,role')
      .eq('user_id', user.sub)
      .single()

    if (profile?.status === 'active') {
      const url = request.nextUrl.clone()
      url.pathname = (profile?.role === 'admin' || profile?.role === 'bod') ? '/admin' : '/users'
      return NextResponse.redirect(url)
    }
  }

  // block BOD/admin from accessing /users
  if (user && request.nextUrl.pathname.startsWith('/users')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.sub)
      .single()

    if (profile?.role === 'admin' || profile?.role === 'bod') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  }

//block inactive user
  if (user && request.nextUrl.pathname.startsWith('/users') || user && request.nextUrl.pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('user_id', user.sub)
      .single()

    if (profile?.status === 'inactive') {
      const url = request.nextUrl.clone()
      url.pathname = '/inactive' 
      return NextResponse.redirect(url)
    }
  }

  // admin route protection
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.sub ?? user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'bod')) {
      const url = request.nextUrl.clone()
      url.pathname = '/users'
      return NextResponse.redirect(url)
    }
  }

  // general auth protection
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/attend') &&
    request.nextUrl.pathname !== '/'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}