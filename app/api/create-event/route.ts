import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { error } from 'console'
import { supabase } from '@/lib/supabase/supabase-client'

export async function POST(request: Request) {
  const { date_start, date_end,name,description,location,venue,time_start,time_end} = await request.json()

  const {error: insertPosAndDept} = await supabaseAdmin
  .from('events')
  .insert({date_start:date_start,date_end:date_end,time_start:time_start,time_end:time_end,name:name,description:description,location:location,venue:venue}) 

if (insertPosAndDept) return Response.json({ error: insertPosAndDept.message }, { status: 400 })
    return Response.json({ error })
}
