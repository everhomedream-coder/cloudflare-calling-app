// POST /api/admin/reset
// Allows admin to recycle / clean contacts back into the active queue.

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const body = await context.request.json();
    const { target } = body; // 'no_answer', 'displayed_only', 'full_reset'

    let result;

    if (target === "no_answer") {
      // Recycle leads where customer did not answer back into the queue
      result = await db.prepare(
        "UPDATE contacts SET display_status = 'unseen', assigned_to = NULL, outcome = NULL, called_at = NULL, callback_at = NULL, call_duration = 0 WHERE outcome LIKE '%No Answer%'"
      ).run();
      return Response.json({
        success: true,
        message: `Recycled ${result.meta.changes} 'No Answer' contacts back into active queue.`
      });
    }

    if (target === "displayed_only") {
      // Reset leads that were displayed but never actually logged with an outcome
      result = await db.prepare(
        "UPDATE contacts SET display_status = 'unseen', assigned_to = NULL, displayed_at = NULL WHERE display_status IN ('displayed', 'assigned')"
      ).run();
      return Response.json({
        success: true,
        message: `Reset ${result.meta.changes} uncalled displayed/assigned leads back to unseen queue.`
      });
    }

    if (target === "full_reset") {
      // Full reset of entire database
      result = await db.prepare(
        "UPDATE contacts SET display_status = 'unseen', assigned_to = NULL, displayed_at = NULL, outcome = NULL, notes = NULL, called_at = NULL, callback_at = NULL, call_duration = 0"
      ).run();
      return Response.json({
        success: true,
        message: "Full database reset complete. All contacts are now in unseen status."
      });
    }

    return Response.json({ error: "Invalid target specified" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
