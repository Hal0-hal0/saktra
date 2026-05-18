// app/api/delete-user/route.ts
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { createRouteClient } from '@/lib/supabase/route-client'

export async function DELETE(request: Request) {
  const { userId } = await request.json()
  if (!userId || typeof userId !== 'string') {
    return Response.json({ error: 'Missing userId' }, { status: 400 })
  }

  // Caller must be a signed-in admin (Board of Directors).
  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const callerId = claimsData?.claims?.sub
  if (!callerId) {
    return Response.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', callerId)
    .single()

  if (callerProfile?.role !== 'admin' && callerProfile?.role !== 'bod') {
    return Response.json({ error: 'Only Board of Directors can delete users' }, { status: 403 })
  }

  // Look up the target so we can enforce the "at least one BOD remains" rule.
  const { data: targetProfile, error: targetErr } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (targetErr) {
    return Response.json({ error: targetErr.message }, { status: 400 })
  }

  if (targetProfile?.role === 'admin' || targetProfile?.role === 'bod') {
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .in('role', ['admin', 'bod'])

    if ((count ?? 0) <= 1) {
      return Response.json(
        { error: 'At least one Board of Directors must remain. Promote another member before deleting this one.' },
        { status: 400 },
      )
    }
  }

  // Remove the profile row first so the row is gone even if auth.users has FKs
  // without cascade. Service-role client bypasses RLS.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('user_id', userId)

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 400 })
  }

  // Remove from auth.users so the same credentials can be reused.
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authError) {
    return Response.json({ error: authError.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
