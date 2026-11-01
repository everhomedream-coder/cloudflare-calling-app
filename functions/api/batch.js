// GET /api/batch?agent=<agent_username>
// Returns:
// - contacts: Fresh active leads assigned to this agent (excluding pending callbacks)
// - callbacks: Scheduled callbacks assigned to this agent
// - dailyTarget: Target call count set by admin (default 30)
// - callsToday: Total calls completed today by this agent
// - interestedToday: Total interested outcomes today

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    if (!db) {
      return Response.json({ error: "Database not connected" }, { status: 500 });
    }

    const url = new URL(context.request.url);
    const agent = url.searchParams.get("agent");

    if (!agent) {
      return Response.json({
        contacts: [],
        callbacks: [],
        dailyTarget: 30,
        callsToday: 0,
        interestedToday: 0,
        message: "No agent specified. Please sign in to view your assigned leads."
      });
    }

    const cleanAgent = agent.trim().toLowerCase();

    // 1. Fresh assigned leads (not scheduled callbacks)
    const { results: contacts } = await db.prepare(`
      SELECT id, sub_id, name, phone, formatted_phone, display_phone, offer, renewal_count, days_lapsed, city, tier, reconnection_score 
      FROM contacts 
      WHERE LOWER(assigned_to) = ? 
        AND display_status IN ('assigned', 'displayed')
        AND (outcome IS NULL OR outcome NOT LIKE '%Callback%')
      ORDER BY reconnection_score DESC
    `).bind(cleanAgent).all();

    // 2. Callbacks scheduled for this agent
    const { results: callbacks } = await db.prepare(`
      SELECT id, sub_id, name, phone, formatted_phone, display_phone, offer, renewal_count, days_lapsed, city, tier, reconnection_score, notes, callback_at 
      FROM contacts 
      WHERE LOWER(assigned_to) = ? 
        AND display_status IN ('assigned', 'displayed')
        AND outcome LIKE '%Callback%'
      ORDER BY callback_at ASC
    `).bind(cleanAgent).all();

    // 3. User info for daily target & shift status
    const userInfo = await db.prepare(`
      SELECT daily_target, shift_status 
      FROM users 
      WHERE LOWER(username) = ?
    `).bind(cleanAgent).first();

    // 4. Today's calls stats for this agent
    const todayStats = await db.prepare(`
      SELECT 
        COUNT(*) as calls_today,
        COUNT(CASE WHEN outcome LIKE '%Interested%' OR outcome LIKE '%Renewed%' THEN 1 END) as interested_today
      FROM contacts 
      WHERE LOWER(assigned_to) = ? 
        AND display_status = 'called'
        AND date(called_at) = date('now')
    `).bind(cleanAgent).first();

    return Response.json({
      contacts: contacts || [],
      callbacks: callbacks || [],
      count: contacts ? contacts.length : 0,
      dailyTarget: userInfo ? (userInfo.daily_target || 30) : 30,
      shiftStatus: userInfo ? (userInfo.shift_status || 'offline') : 'offline',
      callsToday: todayStats ? (todayStats.calls_today || 0) : 0,
      interestedToday: todayStats ? (todayStats.interested_today || 0) : 0,
      agent: agent
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
