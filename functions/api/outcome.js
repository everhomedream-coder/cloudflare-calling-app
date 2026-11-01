// POST /api/outcome
// Logs call outcome ('Interested', 'No Answer', 'Callback', 'Refused', 'Wrong #')
// and marks the contact as 'called' with current timestamp.

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
    const { id, outcome, notes } = body;

    if (!id || !outcome) {
      return new Response(JSON.stringify({ error: "Missing required fields: id, outcome" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await db.prepare(
      "UPDATE contacts SET display_status = 'called', outcome = ?, notes = ?, called_at = datetime('now') WHERE id = ?"
    ).bind(outcome, notes || "", id).run();

    return new Response(JSON.stringify({ success: true, id, outcome }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

