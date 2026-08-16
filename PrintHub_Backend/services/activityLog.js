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

const { verifyAuthToken } = require("./auth");

/** Middleware: verifies a Bearer JWT from the Authorization header and
 *  sets req.actor from the DB record matching the token's verified id.
 *  Unlike identifyActor, this is NOT spoofable — the id comes from a
 *  cryptographically signed token, not a client-supplied header.
 *  Rejects the request with 401 if the token is missing or invalid. */
function requireAuth(prismaClient) {
  return async (req, res, next) => {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const decoded = verifyAuthToken(token);
      const user = await prismaClient.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        return res.status(401).json({ message: "Invalid session" });
      }

      req.actor = {
        id: user.id,
        name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
        email: user.email,
        role: roleFromDb(user.role),
      };
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}

/** Middleware factory: use after requireAuth to restrict a route to
 *  specific core roles, e.g. requireRole("admin") or requireRole("staff","admin"). */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.actor || !allowedRoles.includes(req.actor.role)) {
      return res.status(403).json({
        error: "Access Denied: insufficient permissions for this action.",
      });
    }
    next();
  };
}

module.exports = { 
  logActivity, 
  identifyActor, 
  requireAuth, 
  requireRole 
};