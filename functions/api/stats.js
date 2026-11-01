// GET /api/stats
// Returns live counts, outcome breakdown, today's callbacks, and per-agent analytics.

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: "Database binding 'DB' not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const total = await db.prepare("SELECT count(*) as count FROM contacts").first();
    const unseen = await db.prepare("SELECT count(*) as count FROM contacts WHERE display_status = 'unseen'").first();
    const displayed = await db.prepare("SELECT count(*) as count FROM contacts WHERE display_status = 'displayed'").first();
    const called = await db.prepare("SELECT count(*) as count FROM contacts WHERE display_status = 'called'").first();
    
    // Callbacks due today
    const callbacksToday = await db.prepare(`
      SELECT count(*) as count 
      FROM contacts 
      WHERE callback_at IS NOT NULL 
        AND date(callback_at) = date('now')
    `).first();

    const outcomes = await db.prepare(
      "SELECT outcome, count(*) as count FROM contacts WHERE display_status = 'called' GROUP BY outcome"
    ).all();

    // Per-Agent Outcome Analytics (Improvement #11)
    const agentStatsResult = await db.prepare(`
      SELECT 
        u.username,
        u.name,
        COALESCE(u.shift_status, 'offline') AS shift_status,
        COALESCE(u.daily_target, 30) AS daily_target,
        (
          SELECT COUNT(*) 
          FROM contacts c 
          WHERE LOWER(c.assigned_to) = LOWER(u.username) 
            AND c.display_status IN ('assigned', 'displayed')
        ) AS active_assigned,
        (
          SELECT COUNT(*) 
          FROM contacts c 
          WHERE LOWER(c.assigned_to) = LOWER(u.username) 
            AND c.display_status = 'called'
        ) AS total_called,
        (
          SELECT COUNT(*) 
          FROM contacts c 
          WHERE LOWER(c.assigned_to) = LOWER(u.username) 
            AND c.display_status = 'called' 
            AND (c.outcome LIKE '%Interested%' OR c.outcome LIKE '%Renewed%')
        ) AS interested_count,
        (
          SELECT COUNT(*) 
          FROM contacts c 
          WHERE LOWER(c.assigned_to) = LOWER(u.username) 
            AND c.display_status = 'called' 
            AND c.outcome LIKE '%No Answer%'
        ) AS no_answer_count,
        (
          SELECT COUNT(*) 
          FROM contacts c 
          WHERE LOWER(c.assigned_to) = LOWER(u.username) 
            AND c.display_status = 'called' 
            AND c.outcome LIKE '%Refused%'
        ) AS refused_count,
        (
          SELECT AVG(call_duration) 
          FROM contacts c 
          WHERE LOWER(c.assigned_to) = LOWER(u.username) 
            AND c.display_status = 'called' 
            AND call_duration > 0
        ) AS avg_duration_sec
      FROM users u
      WHERE u.role = 'agent'
      ORDER BY total_called DESC, interested_count DESC
    `).all();

    const agentStats = (agentStatsResult.results || []).map(a => {
      const calls = a.total_called || 0;
      const interested = a.interested_count || 0;
      const rate = calls > 0 ? ((interested / calls) * 100).toFixed(1) : "0.0";
      const avgSec = Math.round(a.avg_duration_sec || 0);
      const avgMin = Math.floor(avgSec / 60);
      const remSec = avgSec % 60;
      const formattedAvg = `${avgMin}m ${remSec}s`;

      return {
        ...a,
        conversion_rate: `${rate}%`,
        conversion_num: parseFloat(rate),
        avg_duration_formatted: avgSec > 0 ? formattedAvg : "--"
      };
    });

    return new Response(JSON.stringify({
      total: total ? total.count : 0,
      unseen: unseen ? unseen.count : 0,
      displayed: displayed ? displayed.count : 0,
      called: called ? called.count : 0,
      callbacksToday: callbacksToday ? callbacksToday.count : 0,
      outcomes: outcomes ? outcomes.results : [],
      agentStats: agentStats
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
