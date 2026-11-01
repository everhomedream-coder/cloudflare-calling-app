// GET /api/leaderboard
// Returns live agent ranking for today's calls, interested counts, and conversion rate.

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    if (!db) {
      return Response.json({ error: "Database not connected" }, { status: 500 });
    }

    const { results } = await db.prepare(`
      SELECT 
        u.username,
        u.name,
        COALESCE(u.shift_status, 'offline') AS shift_status,
        COALESCE(u.daily_target, 30) AS daily_target,
        (
          SELECT COUNT(*) 
          FROM contacts c 
          WHERE LOWER(c.assigned_to) = LOWER(u.username) 
            AND c.display_status = 'called' 
            AND date(c.called_at) = date('now')
        ) AS calls_today,
        (
          SELECT COUNT(*) 
          FROM contacts c 
          WHERE LOWER(c.assigned_to) = LOWER(u.username) 
            AND c.display_status = 'called' 
            AND (c.outcome LIKE '%Interested%' OR c.outcome LIKE '%Renewed%')
            AND date(c.called_at) = date('now')
        ) AS interested_today
      FROM users u
      WHERE u.role = 'agent'
      ORDER BY calls_today DESC, interested_today DESC, u.name ASC
    `).all();

    const leaderboard = (results || []).map(agent => {
      const calls = agent.calls_today || 0;
      const interested = agent.interested_today || 0;
      const rate = calls > 0 ? Math.round((interested / calls) * 100) : 0;
      return {
        ...agent,
        rate_today: rate
      };
    });

    return Response.json({
      success: true,
      leaderboard
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

