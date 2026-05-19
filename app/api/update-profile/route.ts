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


    // Whitelist of fields users may self-edit. Department, position (role_title),
    // and year_joined are set by the BOD during invite and are not user-editable.
    const allowedFields = [
      'first_name', 'last_name', 'full_name', 'user_name',
      'phone', 'phone_country_code', 'birthday', 'home_address', 'school',
      'contact_person', 'contact_person_relationship', 'contact_person_phone',
      'avatar_url',
    ]

    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field] || null // convert empty string to null
      }
    }

    // If first_name or last_name was sent, keep full_name in sync as a derived
    // convenience field so legacy display paths still work.
    if (updates.first_name !== undefined || updates.last_name !== undefined) {
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', userId)
        .single()
      const first = updates.first_name ?? existing?.first_name ?? ''
      const last = updates.last_name ?? existing?.last_name ?? ''
      const joined = `${first ?? ''} ${last ?? ''}`.trim()
      updates.full_name = joined || null
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
