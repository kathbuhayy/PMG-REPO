const multer = require("multer");
const supabase = require("../db/supabase");
const { roleFromDb } = require("./auth");

const BUILDER_BUCKET = "printhub_s3";
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB
const AVATAR_MAX_UPLOAD_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const GENERATION_COOLDOWN_MS = 30_000; // 30 s per user
const generationCooldown = {}; // ownerKey -> lastGeneratedAt (ms)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
  },
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
  },
});

/** Ensure the storage bucket exists and is public */
async function ensureBucket() {
  const { data: existing } = await supabase.storage.getBucket(BUILDER_BUCKET);
  if (!existing) {
    const { error } = await supabase.storage.createBucket(BUILDER_BUCKET, {
      public: true,
      fileSizeLimit: MAX_UPLOAD_SIZE,
    });
    if (error)
      throw new Error(`Cannot create storage bucket: ${error.message}`);
  } else if (!existing.public) {
    const { error } = await supabase.storage.updateBucket(BUILDER_BUCKET, {
      public: true,
    });
    if (error)
      throw new Error(`Cannot update bucket visibility: ${error.message}`);
  }
}

/** Extract userId from X-User-Id header; returns null when missing/invalid */
function getUserId(req) {
  const raw = req.headers["x-user-id"];
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** True if the X-User-Id header belongs to an admin or staff user. */
async function isStaffOrAdmin(req, prisma) {
  const userId = getUserId(req);
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  const role = roleFromDb(user.role);
  return role === "admin" || role === "staff";
}

module.exports = {
  BUILDER_BUCKET,
  MAX_UPLOAD_SIZE,
  AVATAR_MAX_UPLOAD_SIZE,
  ALLOWED_MIME,
  GENERATION_COOLDOWN_MS,
  generationCooldown,
  upload,
  avatarUpload,
  ensureBucket,
  getUserId,
  isStaffOrAdmin,
};