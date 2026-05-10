import { supabaseAdmin } from "@/lib/supabase/supabase-admin"

/**
 * Automatic cron job to move past events to history
 * This endpoint should be called daily by a cron service
 * Authorization is via CRON_SECRET environment variable
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get current date (start of today)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Find all events where date_end < today AND status != 'done'
    const { data: pastEvents, error: fetchError } = await supabaseAdmin
      .from("events")
      .select("id")
      .lt("date_end", todayStr)
      .neq("status", "done")

    if (fetchError) {
      console.error("Error fetching past events:", fetchError)
      return Response.json({ error: fetchError.message }, { status: 400 })
    }

    if (!pastEvents || pastEvents.length === 0) {
      return Response.json({ 
        success: true, 
        message: "No events to move",
        movedCount: 0 
      })
    }

    // Update all past events to status 'done' and set moved_to_history_at
    const { error: updateError, count } = await supabaseAdmin
      .from("events")
      .update({ 
        status: "done",
        moved_to_history_at: new Date().toISOString()
      })
      .lt("date_end", todayStr)
      .neq("status", "done")

    if (updateError) {
      console.error("Error updating events:", updateError)
      return Response.json({ error: updateError.message }, { status: 400 })
    }

    return Response.json({
      success: true,
      message: `${pastEvents.length} events moved to history`,
      movedCount: pastEvents.length
    })
  } catch (error) {
    console.error("Cron job error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
