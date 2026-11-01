// POST /api/outcome
// Logs call outcome ('Interested', 'No Answer', 'Callback', 'Refused', 'Wrong #', etc.)
// Supports callback scheduling, call duration tracking, and agent assignment.

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: "Database binding 'DB' not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await context.request.json();
    const { id, outcome, notes, agent, callback_at, call_duration } = body;

    if (!id || !outcome) {
      return new Response(JSON.stringify({ error: "Missing required fields: id, outcome" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isCallback = outcome.toLowerCase().includes("callback") || Boolean(callback_at);
    const duration = parseInt(call_duration) || 0;
    const cleanAgent = agent ? agent.trim().toLowerCase() : null;

    if (isCallback) {
      // Keep contact in 'assigned' queue so the agent sees it in callbacks / scheduled queue
      await db.prepare(`
        UPDATE contacts 
        SET display_status = 'assigned', 
            outcome = ?, 
            notes = ?, 
            called_at = datetime('now'),
            callback_at = ?,
            call_duration = ?,
            assigned_to = COALESCE(NULLIF(assigned_to, ''), ?)
        WHERE id = ?
      `).bind(
        outcome,
        notes || "",
        callback_at || null,
        duration,
        cleanAgent,
        id
      ).run();
    } else {
      // Mark as called / completed
      await db.prepare(`
        UPDATE contacts 
        SET display_status = 'called', 
            outcome = ?, 
            notes = ?, 
            called_at = datetime('now'),
            callback_at = NULL,
            call_duration = ?,
            assigned_to = COALESCE(NULLIF(assigned_to, ''), ?)
        WHERE id = ?
      `).bind(
        outcome,
        notes || "",
        duration,
        cleanAgent,
        id
      ).run();
    }

    return new Response(JSON.stringify({ 
      success: true, 
      id, 
      outcome, 
      isCallback, 
      call_duration: duration 
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
