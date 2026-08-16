const prisma = require("../db/prisma");

/** Creates a single in-app notification for one user. Never throws — a
 *  failure here should never break the request it's attached to. */
async function createNotification({ userId, title, body, type, link, metadata }) {
  if (!userId) return null;
  try {
    return await prisma.notification.create({
      data: { userId: Number(userId), title, body, type, link: link ?? null, metadata: metadata ?? undefined },
    });
  } catch (err) {
    console.error("[NotificationCenter] Failed to create notification:", err.message);
    return null;
  }
}

/** Creates the same notification for every active admin (role 0) —
 *  used for inventory/requisition/order-review alerts. */
async function createNotificationForAdmins({ title, body, type, link, metadata }) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 0, status: "active" },
      select: { id: true },
    });
    return Promise.all(
      admins.map((admin) =>
        createNotification({ userId: admin.id, title, body, type, link, metadata })
      )
    );
  } catch (err) {
    console.error("[NotificationCenter] Failed to notify admins:", err.message);
    return [];
  }
}

module.exports = { 
    createNotification, 
    createNotificationForAdmins 
    };