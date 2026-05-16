import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { createRouteClient } from '@/lib/supabase/route-client'

export async function POST(request: Request) {
  try {
    const supabase = await createRouteClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub

    if (!userId) {
      return Response.json({ error: 'Unauthorized – no session found' }, { status: 401 })
    }

// Determine request content type and parse JSON payload only
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return Response.json({ error: 'Unsupported Content-Type; only application/json is accepted' }, { status: 415 })
    }
    const body: Record<string, any> = await request.json()


    // Only include fields that were actually sent in the body (not undefined)
    const allowedFields = [
      'user_name', 'phone', 'birthday', 'home_address', 'school',
      'department', 'role_title', 'year_joined',
      'contact_person', 'contact_person_relationship', 'contact_person_phone',
      'avatar_url',
    ]

    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field] || null // convert empty string to null
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)

    if (error) {
      console.error('[update-profile] DB error:', error)
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ success: true })
  } catch (err: any) {
    console.error('[update-profile] Unexpected error:', err)
    return Response.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
