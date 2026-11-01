// POST /api/auth
// Authenticates user/agent with username and PIN.

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    if (!db) {
      return Response.json({ error: "Database not connected" }, { status: 500 });
    }

    const { username, pin } = await context.request.json();

    if (!username || !pin) {
      return Response.json({ error: "Username and PIN are required" }, { status: 400 });
    }

    const user = await db.prepare(
      "SELECT id, username, name, role FROM users WHERE LOWER(username) = LOWER(?) AND pin = ?"
    ).bind(username.trim(), pin.trim()).first();

    if (!user) {
      return Response.json({ error: "Invalid username or PIN" }, { status: 401 });
    }

    return Response.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

