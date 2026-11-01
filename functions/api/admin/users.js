// /api/admin/users
// GET: User list with live workload & performance statistics
// POST: Create or update user
// PATCH: Quick update for shift_status (online/offline) and daily_target
// DELETE: Delete user

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    if (!db) {
      return Response.json({ error: "Database not connected" }, { status: 500 });
    }

    const { results } = await db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.name, 
        u.role, 
        COALESCE(u.shift_status, 'offline') AS shift_status,
        COALESCE(u.daily_target, 30) AS daily_target,
        u.created_at,
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
        ) AS completed_calls,
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
      ORDER BY u.role DESC, u.id ASC
    `).all();

    const formattedUsers = (results || []).map(u => {
      const calls = u.calls_today || 0;
      const interested = u.interested_today || 0;
      return {
        ...u,
        conversion_rate_today: calls > 0 ? Math.round((interested / calls) * 100) : 0
      };
    });

    return Response.json({ users: formattedUsers });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    let body;
    try {
      const text = await context.request.text();
      body = JSON.parse(text);
    } catch (e) {
      body = {};
    }

    const { username, name, pin, role, daily_target, shift_status, action } = body;

    // Support presence / beacon heartbeat (e.g. from navigator.sendBeacon on tab close)
    if ((action === "presence" || shift_status !== undefined) && username && !pin) {
      const cleanShift = shift_status === "online" ? "online" : "offline";
      await db.prepare("UPDATE users SET shift_status = ? WHERE LOWER(username) = ?")
        .bind(cleanShift, username.trim().toLowerCase())
        .run();
      return Response.json({ success: true, shift_status: cleanShift });
    }

    if (!username || !pin || !name) {
      return Response.json({ error: "Username, Name, and Password/PIN are required" }, { status: 400 });
    }

    const assignedRole = role === "admin" ? "admin" : "agent";
    const target = parseInt(daily_target) || 30;
    const shift = shift_status === "online" ? "online" : "offline";

    await db.prepare(`
      INSERT INTO users (username, name, pin, role, daily_target, shift_status)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        name = excluded.name,
        pin = excluded.pin,
        role = excluded.role,
        daily_target = excluded.daily_target,
        shift_status = excluded.shift_status
    `).bind(
      username.trim().toLowerCase(), 
      name.trim(), 
      pin.trim(), 
      assignedRole, 
      target, 
      shift
    ).run();

    return Response.json({ success: true, message: `User '${username}' saved with role '${assignedRole}'.` });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPatch(context) {
  try {
    const db = context.env.DB;
    const body = await context.request.json();
    const { username, shift_status, daily_target } = body;

    if (!username) {
      return Response.json({ error: "Username is required" }, { status: 400 });
    }

    const updates = [];
    const params = [];

    if (shift_status !== undefined) {
      updates.push("shift_status = ?");
      params.push(shift_status === "online" ? "online" : "offline");
    }

    if (daily_target !== undefined) {
      updates.push("daily_target = ?");
      params.push(parseInt(daily_target) || 30);
    }

    if (updates.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    params.push(username.trim().toLowerCase());
    await db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE LOWER(username) = ?`).bind(...params).run();

    return Response.json({ success: true, message: "User updated successfully." });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  try {
    const db = context.env.DB;
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Missing user ID" }, { status: 400 });
    }

    // Protect master admin from deletion
    const target = await db.prepare("SELECT username FROM users WHERE id = ?").bind(id).first();
    if (target && target.username === "everhomedreamltd@gmail.com") {
      return Response.json({ error: "Cannot delete primary administrator account" }, { status: 403 });
    }

    await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();

    return Response.json({ success: true, message: "User deleted successfully." });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
