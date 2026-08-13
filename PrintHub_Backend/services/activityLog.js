const prisma = require("../db/prisma");
const { roleFromDb } = require("./auth");

/** Records an admin/staff action. Never throws — a logging failure
 *  should never break the request it's attached to. */
async function logActivity({ actor, action, module, description, metadata }) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: actor?.id ?? null,
        userName: actor?.name ?? null,
        userEmail: actor?.email ?? null,
        userRole: actor?.role ?? null,
        action,
        module,
        description,
        metadata: metadata ?? undefined,
      },
    });
  } catch (err) {
    console.error("[ActivityLog] Failed to record entry:", err.message);
  }
}

/** Middleware: reads X-User-Id header, attaches req.actor = {id,name,email,role}.
 *  Silently no-ops if the header is missing — it never blocks the request. */
function identifyActor(prismaClient) {
  return async (req, res, next) => {
    const raw = req.headers["x-user-id"];
    const id = raw ? parseInt(raw, 10) : null;
    if (!id) return next();

    try {
      const user = await prismaClient.user.findUnique({ where: { id } });
      if (user) {
        req.actor = {
          id: user.id,
          name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
          email: user.email,
          role: roleFromDb(user.role),
        };
      }
    } catch (err) {
      console.error("[ActivityLog] Failed to identify actor:", err.message);
    }
    next();
  };
}

module.exports = { logActivity, identifyActor };