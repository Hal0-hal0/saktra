import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { createRouteClient } from '@/lib/supabase/route-client'

export async function POST(request: Request) {
  // Verify the user is authenticated
  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const {
    full_name,
    user_name,
    phone,
    birthday,
    home_address,
    school,
    department,
    role_title,
    year_joined,
    contact_person,
    contact_person_relationship,
    contact_person_phone,
    new_password,
  } = body

  // Update password via admin client
  const { error: passError } = await supabaseAdmin.auth.admin.updateUserById(
    userId as string,
    { password: new_password }
  )

  if (passError) {
    return Response.json({ error: passError.message }, { status: 400 })
  }

  // Update profile via admin client (bypasses RLS)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name,
      user_name,
      phone,
      birthday,
      home_address,
      school,
      department,
      role_title,
      year_joined,
      contact_person,
      contact_person_relationship,
      contact_person_phone,
      is_setup_complete: true,
    })
    .eq('user_id', userId)

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 400 })
  }

  // Fetch and return the updated role for correct redirect
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()

  return Response.json({ role: profile?.role ?? 'user' })
}
