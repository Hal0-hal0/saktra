import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

export async function POST(request: Request) {
  const { date_start, date_end, name, description, location, venue, time_start, time_end, event_chair_id, vc_id } = await request.json()

  if (!event_chair_id || !vc_id) {
    return Response.json({ error: 'Event Chair and Vice Chair are required.' }, { status: 400 })
  }

  if (event_chair_id === vc_id) {
    return Response.json({ error: 'Event Chair and Vice Chair must be different members.' }, { status: 400 })
  }

  const { error: insertEvent } = await supabaseAdmin
    .from('events')
    .insert({
      date_start,
      date_end,
      time_start,
      time_end,
      name,
      description,
      location,
      venue,
      event_chair_id,
      vc_id,
      status: 'ongoing',
    })

  if (insertEvent) return Response.json({ error: insertEvent.message }, { status: 400 })
  return Response.json({ error: null })
}
