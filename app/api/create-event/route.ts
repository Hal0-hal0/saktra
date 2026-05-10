import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { error } from 'console'

export async function POST(request: Request) {
  const { date_start, date_end, name, description, location, venue, time_start, time_end, event_chair_id, vc_id } = await request.json()

  const {error: insertPosAndDept} = await supabaseAdmin
  .from('events')
  .insert({
    date_start: date_start,
    date_end: date_end,
    time_start: time_start,
    time_end: time_end,
    name: name,
    description: description,
    location: location,
    venue: venue,
    event_chair_id: event_chair_id || null,
    vc_id: vc_id || null,
    status: 'ongoing',
  }) 

if (insertPosAndDept) return Response.json({ error: insertPosAndDept.message }, { status: 400 })
    return Response.json({ error })
}
