import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { error } from 'console'
import { supabase } from '@/lib/supabase/supabase-client'

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
} = await request.json()

  const {error: updateEvent} = await supabaseAdmin
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
  }) 
  .eq('id', id)

if (updateEvent) return Response.json({ error: updateEvent.message }, { status: 400 })
    return Response.json({ error })
}
