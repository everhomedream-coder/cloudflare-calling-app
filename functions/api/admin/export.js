// GET /api/admin/export
// Generates and downloads a clean CSV file of all called contacts and outcomes.

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    const { results } = await db.prepare(
      "SELECT sub_id, name, display_phone, formatted_phone, offer, renewal_count, days_lapsed, city, tier, outcome, notes, called_at, assigned_to, call_duration FROM contacts WHERE display_status = 'called' ORDER BY called_at DESC"
    ).all();

    const headers = [
      "Subscription ID",
      "Customer Name",
      "Display Phone",
      "Formatted Phone",
      "Offer Plan",
      "Past Renewals",
      "Days Overdue",
      "City",
      "Priority Tier",
      "Call Outcome",
      "Call Duration (sec)",
      "Call Notes",
      "Called Date & Time",
      "Agent"
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    let csvContent = headers.join(",") + "\n";

    if (results && results.length > 0) {
      for (const r of results) {
        const row = [
          escapeCsv(r.sub_id),
          escapeCsv(r.name),
          escapeCsv(r.display_phone),
          escapeCsv(r.formatted_phone),
          escapeCsv(r.offer),
          r.renewal_count || 0,
          r.days_lapsed || 0,
          escapeCsv(r.city),
          escapeCsv(r.tier),
          escapeCsv(r.outcome),
          r.call_duration || 0,
          escapeCsv(r.notes),
          escapeCsv(r.called_at),
          escapeCsv(r.assigned_to || "Telesales")
        ];
        csvContent += row.join(",") + "\n";
      }
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `canal_rwanda_call_history_${timestamp}.csv`;

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}
