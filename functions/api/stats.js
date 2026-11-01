// GET /api/stats
// Returns live counts of unseen, displayed, called contacts, and outcome breakdown.

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
    const outcomes = await db.prepare(
      "SELECT outcome, count(*) as count FROM contacts WHERE display_status = 'called' GROUP BY outcome"
    ).all();

    return new Response(JSON.stringify({
      total: total ? total.count : 0,
      unseen: unseen ? unseen.count : 0,
      displayed: displayed ? displayed.count : 0,
      called: called ? called.count : 0,
      outcomes: outcomes ? outcomes.results : []
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

