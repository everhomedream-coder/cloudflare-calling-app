// GET /api/history
// Returns the 50 most recently completed calls.

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: "Database binding 'DB' not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { results } = await db.prepare(
      "SELECT id, sub_id, name, display_phone, formatted_phone, offer, city, outcome, notes, called_at FROM contacts WHERE display_status = 'called' ORDER BY called_at DESC LIMIT 50"
    ).all();

    return new Response(JSON.stringify({ history: results || [] }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

