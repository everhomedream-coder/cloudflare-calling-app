// /api/admin/assign
// GET: Returns the next batch of unassigned leads (default 20, or custom count, optionally filtered by city)
// POST: Assigns the batch of leads to a single agent or to all active/online agents.

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    if (!db) {
      return Response.json({ error: "Database not connected" }, { status: 500 });
    }

    const url = new URL(context.request.url);
    const count = parseInt(url.searchParams.get("count")) || 20;
    const city = url.searchParams.get("city");

    let query = `
      SELECT id, sub_id, name, phone, formatted_phone, display_phone, offer, renewal_count, days_lapsed, city, tier, reconnection_score 
      FROM contacts 
      WHERE (assigned_to IS NULL OR assigned_to = '') 
        AND display_status = 'unseen'
    `;
    const params = [];

    if (city && city.toLowerCase() !== "all") {
      query += ` AND LOWER(city) = LOWER(?)`;
      params.push(city.trim());
    }

    query += ` ORDER BY reconnection_score DESC LIMIT ?`;
    params.push(count);

    const { results } = await db.prepare(query).bind(...params).all();

    // Total unassigned count (overall)
    const pool = await db.prepare(`
      SELECT COUNT(*) as count 
      FROM contacts 
      WHERE (assigned_to IS NULL OR assigned_to = '') 
        AND display_status = 'unseen'
    `).first();

    // Distinct cities available in unseen contacts
    const citiesResult = await db.prepare(`
      SELECT DISTINCT city 
      FROM contacts 
      WHERE (assigned_to IS NULL OR assigned_to = '') 
        AND display_status = 'unseen' 
        AND city IS NOT NULL AND city != ''
      ORDER BY city ASC
    `).all();

    const cities = (citiesResult.results || []).map(r => r.city);

    return Response.json({
      success: true,
      count: results ? results.length : 0,
      totalUnassigned: pool ? pool.count : 0,
      cities: cities,
      leads: results || []
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    if (!db) {
      return Response.json({ error: "Database not connected" }, { status: 500 });
    }

    const body = await context.request.json();
    const { agent, count, leadIds, bulkAll, city } = body;

    const batchSize = parseInt(count) || 20;
    const cityFilter = (city && city.toLowerCase() !== "all") ? city.trim() : null;

    // Mode A: Bulk assign to all online agents
    if (bulkAll) {
      // Find online agents first, or fallback to all active agents if none are marked online
      let { results: targetAgents } = await db.prepare(`
        SELECT username FROM users 
        WHERE role = 'agent' AND shift_status = 'online'
      `).all();

      if (!targetAgents || targetAgents.length === 0) {
        const fallback = await db.prepare(`
          SELECT username FROM users WHERE role = 'agent'
        `).all();
        targetAgents = fallback.results || [];
      }

      if (targetAgents.length === 0) {
        return Response.json({
          success: false,
          message: "No agents found to assign leads to. Please add agents first."
        });
      }

      let totalAssigned = 0;
      const assignedAgents = [];

      for (const ag of targetAgents) {
        let fetchSql = `
          SELECT id FROM contacts 
          WHERE (assigned_to IS NULL OR assigned_to = '') 
            AND display_status = 'unseen'
        `;
        const fetchParams = [];
        if (cityFilter) {
          fetchSql += ` AND LOWER(city) = LOWER(?)`;
          fetchParams.push(cityFilter);
        }
        fetchSql += ` ORDER BY reconnection_score DESC LIMIT ?`;
        fetchParams.push(batchSize);

        const { results: batchLeads } = await db.prepare(fetchSql).bind(...fetchParams).all();

        if (batchLeads && batchLeads.length > 0) {
          const ids = batchLeads.map(l => l.id);
          const placeholders = ids.map(() => "?").join(",");
          await db.prepare(`
            UPDATE contacts 
            SET assigned_to = ?, display_status = 'assigned', displayed_at = datetime('now') 
            WHERE id IN (${placeholders})
          `).bind(ag.username.toLowerCase(), ...ids).run();

          totalAssigned += ids.length;
          assignedAgents.push(`${ag.username} (${ids.length})`);
        }
      }

      return Response.json({
        success: true,
        bulk: true,
        assignedCount: totalAssigned,
        agentsCount: targetAgents.length,
        message: totalAssigned > 0 
          ? `Bulk assigned ${totalAssigned} leads across ${assignedAgents.length} agents: ${assignedAgents.join(", ")}`
          : "No unassigned leads available in pool to assign."
      });
    }

    // Mode B: Assign to a single agent
    if (!agent) {
      return Response.json({ error: "Agent username is required" }, { status: 400 });
    }

    let ids = [];

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      ids = leadIds.map(Number).filter(n => !isNaN(n));
    } else {
      let fetchSql = `
        SELECT id FROM contacts 
        WHERE (assigned_to IS NULL OR assigned_to = '') 
          AND display_status = 'unseen'
      `;
      const fetchParams = [];
      if (cityFilter) {
        fetchSql += ` AND LOWER(city) = LOWER(?)`;
        fetchParams.push(cityFilter);
      }
      fetchSql += ` ORDER BY reconnection_score DESC LIMIT ?`;
      fetchParams.push(batchSize);

      const { results } = await db.prepare(fetchSql).bind(...fetchParams).all();
      if (results && results.length > 0) {
        ids = results.map(r => r.id);
      }
    }

    if (ids.length === 0) {
      return Response.json({
        success: false,
        message: "No unassigned leads matching your criteria were found to assign!"
      });
    }

    // Assign them to the specified agent
    const placeholders = ids.map(() => "?").join(",");
    await db.prepare(`
      UPDATE contacts 
      SET assigned_to = ?, display_status = 'assigned', displayed_at = datetime('now') 
      WHERE id IN (${placeholders})
    `).bind(agent.trim().toLowerCase(), ...ids).run();

    return Response.json({
      success: true,
      assignedCount: ids.length,
      agent: agent.trim().toLowerCase(),
      message: `Successfully assigned ${ids.length} leads to ${agent}.`
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
