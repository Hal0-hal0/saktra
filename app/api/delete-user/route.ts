// app/api/delete-user/route.ts
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { console } from 'inspector'

export async function DELETE(request: Request) {
  const { userId } = await request.json()
  console.log('user id: ', userId)

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}