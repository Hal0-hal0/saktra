import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

export async function POST(request: Request) {
  const { email, password, role, position, department} = await request.json()

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, 
  })

  if (error || !data.user) return Response.json({ error: error?.message ?? 'User creation failed' }, { status: 400 })

  const {error: insertPosAndDept} = await supabaseAdmin
  .from('profiles')
  .update({department:department, position:position, role:role}) 
  .eq('user_id' , data.user.id)
  

if (insertPosAndDept) return Response.json({ error: insertPosAndDept.message }, { status: 400 })
    return Response.json({ data })
}

// import { createClient } from '@supabase/supabase-js'

// const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// )

// export async function POST(request: Request) {
//   // You only need the email for an invite
//   const { email } = await request.json()

//   // Use inviteUserByEmail instead of createUser
//   const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)

//   if (error) return Response.json({ error: error.message }, { status: 400 })
  
//   return Response.json({ data })
// }