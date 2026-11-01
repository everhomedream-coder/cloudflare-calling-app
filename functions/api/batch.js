// GET /api/batch
// Fetches the top 20 unseen contacts (ordered by highest reconnection score)
// and immediately locks them as 'displayed' so they are NEVER displayed again.

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: "Database binding 'DB' not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. Fetch top 20 unseen contacts
    const { results } = await db.prepare(
      "SELECT id, sub_id, name, phone, formatted_phone, display_phone, offer, renewal_count, days_lapsed, city, tier, reconnection_score FROM contacts WHERE display_status = 'unseen' ORDER BY reconnection_score DESC LIMIT 20"
    ).all();

    if (!results || results.length === 0) {
      return new Response(JSON.stringify({ contacts: [], message: "No more unseen contacts in database!" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Lock their status to 'displayed' with current UTC timestamp
    const ids = results.map(r => r.id);
    const placeholders = ids.map(() => "?").join(",");
    await db.prepare(
      `UPDATE contacts SET display_status = 'displayed', displayed_at = datetime('now') WHERE id IN (${placeholders})`
    ).bind(...ids).run();

    return new Response(JSON.stringify({ contacts: results, count: results.length }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

