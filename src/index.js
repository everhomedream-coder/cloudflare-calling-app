// Cloudflare Worker API & Static Assets Router
// Serves API endpoints (/api/batch, /api/outcome, /api/stats, /api/history)
// and forwards all web traffic to static assets in ./public (index.html)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API Route Handlers
    if (url.pathname.startsWith("/api/")) {
      if (!env.DB) {
        return Response.json({
          error: "D1 database binding 'DB' is not connected yet. Go to Cloudflare Dashboard -> Settings -> Bindings -> Add D1 database named 'DB'."
        }, { status: 500 });
      }

      try {
        if (url.pathname === "/api/batch" && request.method === "GET") {
          return await handleBatch(env);
        }
        if (url.pathname === "/api/outcome" && request.method === "POST") {
          return await handleOutcome(request, env);
        }
        if (url.pathname === "/api/stats" && request.method === "GET") {
          return await handleStats(env);
        }
        if (url.pathname === "/api/history" && request.method === "GET") {
          return await handleHistory(env);
        }
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // Serve static frontend assets (public/index.html)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};

// 1. Fetch 20 unseen contacts and lock them as displayed
async function handleBatch(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, sub_id, name, phone, formatted_phone, display_phone, offer, renewal_count, days_lapsed, city, tier, reconnection_score FROM contacts WHERE display_status = 'unseen' ORDER BY reconnection_score DESC LIMIT 20"
  ).all();

  if (!results || results.length === 0) {
    return Response.json({ contacts: [], message: "No more unseen contacts in database!" });
  }

  // Lock status to 'displayed'
  const ids = results.map(r => r.id);
  const placeholders = ids.map(() => "?").join(",");
  await env.DB.prepare(
    `UPDATE contacts SET display_status = 'displayed', displayed_at = datetime('now') WHERE id IN (${placeholders})`
  ).bind(...ids).run();

  return Response.json({ contacts: results, count: results.length });
}

// 2. Log call outcome and mark contact as 'called'
async function handleOutcome(request, env) {
  const body = await request.json();
  const { id, outcome, notes } = body;

  if (!id || !outcome) {
    return Response.json({ error: "Missing required fields: id, outcome" }, { status: 400 });
  }

  await env.DB.prepare(
    "UPDATE contacts SET display_status = 'called', outcome = ?, notes = ?, called_at = datetime('now') WHERE id = ?"
  ).bind(outcome, notes || "", id).run();

  return Response.json({ success: true, id, outcome });
}

// 3. Return live database stats
async function handleStats(env) {
  const total = await env.DB.prepare("SELECT count(*) as count FROM contacts").first();
  const unseen = await env.DB.prepare("SELECT count(*) as count FROM contacts WHERE display_status = 'unseen'").first();
  const displayed = await env.DB.prepare("SELECT count(*) as count FROM contacts WHERE display_status = 'displayed'").first();
  const called = await env.DB.prepare("SELECT count(*) as count FROM contacts WHERE display_status = 'called'").first();
  const outcomes = await env.DB.prepare(
    "SELECT outcome, count(*) as count FROM contacts WHERE display_status = 'called' GROUP BY outcome"
  ).all();

  return Response.json({
    total: total ? total.count : 0,
    unseen: unseen ? unseen.count : 0,
    displayed: displayed ? displayed.count : 0,
    called: called ? called.count : 0,
    outcomes: outcomes ? outcomes.results : []
  });
}

// 4. Return recent call history
async function handleHistory(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, sub_id, name, display_phone, formatted_phone, offer, city, outcome, notes, called_at FROM contacts WHERE display_status = 'called' ORDER BY called_at DESC LIMIT 50"
  ).all();

  return Response.json({ history: results || [] });
}
