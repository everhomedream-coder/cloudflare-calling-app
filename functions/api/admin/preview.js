// GET /api/admin/preview?count=20
// Returns the next batch of unassigned leads for the admin to inspect before assigning.

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    if (!db) {
      return Response.json({ error: "Database not connected" }, { status: 500 });
    }

    const url = new URL(context.request.url);
    const count = parseInt(url.searchParams.get("count")) || 20;

    const { results } = await db.prepare(`
      SELECT id, sub_id, name, phone, formatted_phone, display_phone, offer, renewal_count, days_lapsed, city, tier, reconnection_score 
      FROM contacts 
      WHERE (assigned_to IS NULL OR assigned_to = '') 
        AND display_status = 'unseen' 
      ORDER BY reconnection_score DESC 
      LIMIT ?
    `).bind(count).all();

    const pool = await db.prepare(`
      SELECT COUNT(*) as count 
      FROM contacts 
      WHERE (assigned_to IS NULL OR assigned_to = '') 
        AND display_status = 'unseen'
    `).first();

    return Response.json({
      success: true,
      count: results ? results.length : 0,
      totalUnassigned: pool ? pool.count : 0,
      leads: results || []
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

