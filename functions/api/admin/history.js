// /api/admin/history
// GET: Search, filter, and view call history with duration and agent assignment
// DELETE: Delete a specific call record or clean history

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    const url = new URL(context.request.url);
    const outcome = url.searchParams.get("outcome");
    const search = url.searchParams.get("search");
    const limit = parseInt(url.searchParams.get("limit") || "150");

    let query = `
      SELECT id, sub_id, name, display_phone, formatted_phone, offer, city, tier, outcome, notes, called_at, assigned_to, call_duration, callback_at 
      FROM contacts 
      WHERE display_status = 'called'
    `;
    const params = [];

    if (outcome && outcome !== "all") {
      query += " AND outcome LIKE ?";
      params.push(`%${outcome}%`);
    }

    if (search) {
      query += " AND (name LIKE ? OR phone LIKE ? OR sub_id LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += " ORDER BY called_at DESC LIMIT ?";
    params.push(limit);

    const { results } = await db.prepare(query).bind(...params).all();

    return Response.json({ history: results || [], count: results ? results.length : 0 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  try {
    const db = context.env.DB;
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");
    const action = url.searchParams.get("action"); // 'clear_all' or delete specific id

    if (action === "clear_all" || id === "all") {
      // Clear call history by resetting called contacts
      await db.prepare(`
        UPDATE contacts 
        SET display_status = 'unseen', outcome = NULL, notes = NULL, called_at = NULL, callback_at = NULL, call_duration = 0 
        WHERE display_status = 'called'
      `).run();
      return Response.json({ success: true, message: "All call history cleared and contacts returned to unseen queue." });
    }

    if (!id) {
      return Response.json({ error: "Missing record ID" }, { status: 400 });
    }

    // Reset single record back to unseen
    await db.prepare(`
      UPDATE contacts 
      SET display_status = 'unseen', outcome = NULL, notes = NULL, called_at = NULL, callback_at = NULL, call_duration = 0 
      WHERE id = ?
    `).bind(id).run();

    return Response.json({ success: true, id, message: "Record removed from history and returned to queue." });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
