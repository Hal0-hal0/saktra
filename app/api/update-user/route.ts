import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

export async function PATCH(request: Request) {

  try {
     const { email, status, role, position, department, user_id, user_name} = await request.json()

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        {
            email,
        } 
      )

      if (error || !data.user) return Response.json({ error: error?.message ?? 'User creation failed' }, { status: 400 })

      const {error: update} = await supabaseAdmin
      .from('profiles')
      .update({department:department, position:position, role:role, user_name:user_name,status }) 
      .eq('user_id' , data.user.id)
      

    if (update) return Response.json({ error: update.message }, { status: 400 })
        return Response.json({ data })
  } catch (err) {
    console.error('PATCH /api/update-user:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
 
}
