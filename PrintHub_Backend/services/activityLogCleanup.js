const cron = require("node-cron");
const prisma = require("../db/prisma");

const RETENTION_DAYS = 180;

/** Deletes ActivityLog rows older than the retention window. Never throws —
 *  a failed cleanup run should never crash the server process. */
async function purgeOldActivityLogs() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  try {
    const deleted = await prisma.activityLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    console.log(
      `[ActivityLog Cleanup] Purged ${deleted.count} record(s) older than ${cutoff.toISOString()}.`,
    );
    return deleted.count;
  } catch (err) {
    console.error("[ActivityLog Cleanup] Failed to purge old records:", err.message);
    return 0;
  }
}

/** Registers the daily midnight cron job. Call once at server startup. */
function scheduleActivityLogCleanup() {
  cron.schedule("0 0 * * *", () => {
    purgeOldActivityLogs();
  });
  console.log("[ActivityLog Cleanup] Scheduled daily purge job (retention: 180 days).");
}

module.exports = { scheduleActivityLogCleanup, purgeOldActivityLogs };
