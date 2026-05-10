import { supabaseAdmin } from "@/lib/supabase/supabase-admin";

export async function DELETE(request:Request) {
    
    const {id} = await request.json()

    const {error} = await supabaseAdmin
    .from('events')
    .update({ is_hidden: true })
    .eq('id', Number(id))

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
}