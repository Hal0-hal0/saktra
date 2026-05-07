import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { createRouteClient } from '@/lib/supabase/route-client'
import { bodPositions, departmentOptions, normalizeEvaluationRole } from '@/lib/member-evaluation'

async function requireAdmin() {
  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (profile?.role !== 'admin') {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { userId }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return auth.error
  }

  const { email, password, role, position, department} = await request.json()
  const normalizedRole = normalizeEvaluationRole(role)

  if (!email || !password || !role) {
    return Response.json({ error: 'Email, password, and role are required.' }, { status: 400 })
  }

  if (!['user', 'executive', 'bod', 'admin'].includes(normalizedRole)) {
    return Response.json({ error: 'Invalid member role.' }, { status: 400 })
  }

  const validDepartments = new Set(departmentOptions.map((item) => item.value))
  const validBodPositions = new Set<string>(bodPositions)

  if ((normalizedRole === 'executive' || normalizedRole === 'user') && !validDepartments.has(department)) {
    return Response.json({ error: 'This role requires a valid department.' }, { status: 400 })
  }

  if (normalizedRole === 'bod' && !validBodPositions.has(position)) {
    return Response.json({ error: 'Board of Directors members require a valid BOD position.' }, { status: 400 })
  }

  const nextDepartment = (normalizedRole === 'executive' || normalizedRole === 'user') ? department : ''
  const nextPosition =
    normalizedRole === 'bod'
      ? position
      : normalizedRole === 'executive'
        ? 'Executive Member'
        : normalizedRole === 'admin'
          ? 'Admin'
          : position || 'Member'

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, 
  })

  if (error || !data.user) return Response.json({ error: error?.message ?? 'User creation failed' }, { status: 400 })

  const {error: insertPosAndDept} = await supabaseAdmin
  .from('profiles')
  .update({department:nextDepartment, position:nextPosition, role:normalizedRole}) 
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
