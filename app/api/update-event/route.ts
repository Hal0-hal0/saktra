import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

export async function PATCH(request: Request) {
  const {
    id,
    name,
    description,
    location,
    venue,
    date_start: dateStart,
    date_end: dateEnd,
    time_start: timeStart,
    time_end: timeEnd,
    event_chair_id: eventChairId,
    vc_id: vcId,
  } = await request.json()

  if (!eventChairId || !vcId) {
    return Response.json({ error: 'Event Chair and Vice Chair are required.' }, { status: 400 })
  }

  if (eventChairId === vcId) {
    return Response.json({ error: 'Event Chair and Vice Chair must be different members.' }, { status: 400 })
  }

  const { error: updateEvent } = await supabaseAdmin
    .from('events')
    .update({
      name,
      description,
      location,
      venue,
      date_start: dateStart,
      date_end: dateEnd,
      time_start: timeStart,
      time_end: timeEnd,
      event_chair_id: eventChairId,
      vc_id: vcId,
    })
    .eq('id', id)

  if (updateEvent) return Response.json({ error: updateEvent.message }, { status: 400 })
  return Response.json({ error: null })
}
