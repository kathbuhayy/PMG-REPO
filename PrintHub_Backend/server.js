require("dotenv").config();

const express = require("express");
const prisma = require("./db/prisma");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const multer = require("multer");
const supabase = require("./db/supabase");
const { generateImage } = require("./services/falai");

const { 
  logActivity, 
  identifyActor, 
  requireAuth, 
  requireRole  
} = require("./services/activityLog");

const {
  generateModelFromText,
  generateModelFromImage,
} = require("./services/meshy");

const {
  buildReceiptPayload,
  paymongoAuth,
  paymongoPaymentMethods,
  paymongoRequest,
  customerBillingForOrder,
  generateLineItems,
  createSessionPayload,
  generatePartialPaymentLineItem,
  createPartialSessionPayload,
  createCheckoutSession,
  createQrphPayment,
  retrievePaymentIntent,
  retrieveCheckoutSession,
  verifyWebhookSignature,
  createInquiryAndUpdateOrder,
} = require("./services/paymongo");

const { generateInvoicePdf } = require("./services/invoice");

const {
  roleToDb,
  roleFromDb,
  signAuthToken,
} = require("./services/auth");

const {
  money,
  getCustomerName,
  ORDER_STATUS_LABELS,
  PRODUCTION_STATUSES,
  getRequiredPaymentAmount,
  getPaymentPhaseLabel,
  hasMetProductionPaymentThreshold,
} = require("./services/order");

const { 
  decrementMaterialsForOrder,
  createRequisitionsFromAlerts,
  getRelevantProductionStatuses,
} = require("./services/production");

const {
  saveOtp,
  getOtp,
  deleteOtp,
  sendSystemEmail,
  sendOtpEmail,
  notifyOrderStatus,
  notifyPaymentConfirmation,
  notifyPaymentFailed,
  notifyReturnComplaintReceived,
  notifyLowStockProducts,
  notifyOutOfStockProducts,
  notifyAdminsNewOrderForReview,
  notifyDesignApproval,
  notifyFinalPaymentDue,
} = require("./services/notification");

const { 
  handleChat 
} = require("./services/chatbot");

const { createNotification, 
  createNotificationForAdmins 
} = require("./services/notificationCenter");

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
  process.env.PUBLIC_FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some((allowed) => {
      return origin.replace(/\/$/, "") === allowed.replace(/\/$/, "");
    }) || origin.includes("10.0.2.2") || origin.includes("192.168.") || origin.includes("trycloudflare.com");

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true
}));
app.use(bodyParser.json({
  limit: "50mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use(identifyActor(prisma));

// =================================================
// AI CHATBOT API (Gemini)
// =================================================
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "Invalid messages format." });
  }

  try {
    const reply = await handleChat(messages);
    res.json({ reply });
  } catch (err) {
    console.error("Gemini API error:", err);
    res.json({
      reply:
        "I can help with PrintHub products, pricing, quantity options, " +
        "file requirements, delivery, and payments. Please ask me about " +
        "a product like business cards, flyers, posters, shirts, mugs, " +
        "stickers, or notebooks.",
    });
  }
});


// login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const match = await bcrypt.compare(password, user.password);
      if (!match)
        return res.status(400).json({ message: "Incorrect password" });

      await prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() },
      });

      const token = signAuthToken(user);

      return res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          role: roleFromDb(user.role),
        },
      });
    }

    const archivedUser = await prisma.archivedUser.findFirst({
      where: { email },
    });
    if (!archivedUser)
      return res.status(400).json({ message: "Email not registered" });

    const matchArchived = await bcrypt.compare(password, archivedUser.password);
    if (!matchArchived)
      return res.status(400).json({ message: "Incorrect password" });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    saveOtp(email, {
      code,
      expiresAt,
      verifiedUntil: null,
      purpose: "reactivate",
    });

    const emailRes = await sendOtpEmail({
      email,
      code,
      expiresAt,
      subject: "Account Reactivation OTP",
    });

    if (emailRes.status === "failed") {
      return res
        .status(500)
        .json({ message: "Failed to send reactivation OTP" });
    }

    return res.status(403).json({
      message: "This account is archived. OTP sent for reactivation.",
      needsReactivation: true,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Database error" });
  }
});

app.post("/api/reactivate/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP required" });

  const entry = getOtp(email);
  if (!entry || entry.purpose !== "reactivate") {
    return res.status(400).json({
      message: "No reactivation OTP request found. Try logging in again.",
    });
  }

  const now = new Date();
  if (now > entry.expiresAt) {
    deleteOtp(email);
    return res
      .status(400)
      .json({ message: "OTP expired. Please login again to resend OTP." });
  }

  if (String(otp) !== entry.code) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // Move back from archived_users -> users (Prisma transaction)
  try {
    const u = await prisma.archivedUser.findUnique({ where: { email } });
    if (!u)
      return res.status(404).json({ message: "Archived account not found" });

    await prisma.$transaction([
      prisma.user.create({
        data: {
          first_name: u.first_name,
          last_name: u.last_name,
          phone: u.phone,
          address: u.address,
          email: u.email,
          password: u.password,
          role: u.role ?? 2,
          status: "active",
          last_login: u.last_login,
          join_date: u.join_date,
          gender: u.gender,
          birthday: u.birthday,
          position: u.position,
        },
      }),
      prisma.archivedUser.delete({ where: { email } }),
    ]);

    deleteOtp(email);
    return res.json({
      message: "Account reactivated. Please login again.",
      reactivated: true,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Restore failed", error: err.message });
  }
});

// =================================================
// REGISTER: SEND OTP  (UPDATED ONLY OTP LOGIC)
// =================================================
app.post("/api/register/send-otp", (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  prisma.user
    .findUnique({ where: { email } })
    .then(async (existing) => {
      if (existing)
        return res.status(400).json({ message: "Email already registered" });

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      saveOtp(email, { code, expiresAt, verifiedUntil: null });

      const emailRes = await sendOtpEmail({
        email,
        code,
        expiresAt,
        subject: "Your OTP Code (Registration)",
      });

      if (emailRes.status === "failed") {
        return res.status(500).json({ message: "Failed to send OTP email" });
      }

      return res.status(200).json({ message: "OTP sent to your email." });
    })
    .catch((e) => {
      console.error(e);
      return res.status(500).json({ message: "Database error" });
    });
});

// =================================================
// REGISTER: VERIFY OTP (ADDED for User-otp.js)
// =================================================
app.post("/api/register/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP required" });

  const entry = getOtp(email);
  if (!entry)
    return res
      .status(400)
      .json({ message: "No OTP request found. Please resend OTP." });

  const now = new Date();
  if (now > entry.expiresAt) {
    deleteOtp(email);
    return res.status(400).json({ message: "OTP expired. Please resend OTP." });
  }

  if (String(otp) !== entry.code) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  entry.verifiedUntil = new Date(Date.now() + 10 * 60 * 1000);
  return res.json({ message: "OTP verified" });
});

// replaced MySQL-based OTP check with Prisma-based handler below
app.post("/api/password/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "Email not found" });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    saveOtp(email, { code, expiresAt, verifiedUntil: null });

    const emailRes = await sendOtpEmail({
      email,
      code,
      expiresAt,
      subject: "Your OTP Code (Password Change)",
    });

    if (emailRes.status === "failed") {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    return res.json({ message: "OTP sent to your email." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Database error" });
  }
});

// registration
app.post("/api/register/complete", async (req, res) => {
  const { firstName, lastName, email, phone, address, password } = req.body;

  if (phone && !/^\+639\d{9}$/.test(phone)) {
    return res
      .status(400)
      .json({ message: "Phone must be +639 followed by 9 digits" });
  }

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const entry = getOtp(email);
  if (!entry || !entry.verifiedUntil) {
    return res.status(403).json({ message: "OTP verification required" });
  }

  if (new Date() > new Date(entry.verifiedUntil)) {
    deleteOtp(email);
    return res
      .status(403)
      .json({ message: "OTP session expired. Please verify again." });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);

    const createdUser = await prisma.user.create({
      data: {
        first_name: firstName,
        last_name: lastName,
        email,
        password: hash,
        phone: phone || "+63",
        address: address || "",
        role: 2,
        join_date: new Date(),
        status: "active",
      },
    });

    deleteOtp(email);
    return res.json({
      message: "Registration successful",
      userId: createdUser.id,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Registration failed" });
  }
});

// =================================================
// RECYCLE BIN — Archived Users API
// =================================================

// GET all archived (soft-deleted) accounts
app.get("/api/admin/archived-users", async (req, res) => {
  try {
    const rows = await prisma.archivedUser.findMany({
      orderBy: { archived_at: "desc" },
    });
    const mapped = rows.map((u) => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      email: u.email,
      role: roleFromDb(u.role),
      status: u.status || "active",
      lastLogin: u.last_login,
      joinDate: u.join_date,
      archivedAt: u.archived_at,
    }));
    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB error" });
  }
});

// POST restore an archived account back into active users
app.post("/api/admin/archived-users/:id/restore", async (req, res) => {
  const archivedId = parseInt(req.params.id);
  try {
    const u = await prisma.archivedUser.findUnique({ where: { id: archivedId } });
    if (!u) return res.status(404).json({ message: "Archived user not found" });

    const dup = await prisma.user.findUnique({ where: { email: u.email } });
    if (dup) {
      return res.status(400).json({
        message: "A user with this email already exists. Cannot restore.",
      });
    }

    const restored = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          first_name: u.first_name,
          last_name: u.last_name,
          phone: u.phone,
          address: u.address,
          email: u.email,
          password: u.password,
          role: u.role ?? 2,
          status: "active",
          last_login: u.last_login,
          join_date: u.join_date,
          gender: u.gender,
          birthday: u.birthday,
          position: u.position,
        },
      });
      await tx.archivedUser.delete({ where: { id: archivedId } });
      return newUser;
    });

    await logActivity({
      actor: req.actor,
      action: "restored",
      module: "users",
      description: `Restored account "${restored.first_name} ${restored.last_name}" (${restored.email})`,
      metadata: { userId: restored.id, archivedId },
    });

    return res.json({ message: "Account restored", user: restored });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Restore failed" });
  }
});

app.get("/api/admin/activity-logs", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.module) where.module = req.query.module;
    if (req.query.action) where.action = req.query.action;
    if (req.query.userId) where.userId = parseInt(req.query.userId);
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(req.query.from);
      if (req.query.to) {
        const to = new Date(req.query.to);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch activity logs" });
  }
});

// DELETE permanently remove an archived account (no undo)
app.delete("/api/admin/archived-users/:id", async (req, res) => {
  const archivedId = parseInt(req.params.id);
  try {
    const deleted = await prisma.archivedUser.delete({ where: { id: archivedId } });

    await logActivity({
      actor: req.actor,
      action: "deleted",
      module: "users",
      description: `Permanently deleted archived account "${deleted.first_name} ${deleted.last_name}" (${deleted.email})`,
      metadata: { archivedId },
    });

    return res.json({ message: "Account permanently deleted" });
  } catch (e) {
    console.error(e);
    if (e.code === "P2025")
      return res.status(404).json({ message: "Archived user not found" });
    return res.status(500).json({ message: "Delete failed" });
  }
});

// admin manage user
app.get("/api/admin/users", async (req, res) => {
  try {
    const rows = await prisma.user.findMany();
    const mapped = rows.map((u) => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      email: u.email,
      role: roleFromDb(u.role),
      status: u.status || "active",
      lastLogin: u.last_login,
      joinDate: u.join_date,
    }));
    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB error" });
  }
});
app.post("/api/admin/users", (req, res) => {
  const { name, email, password, role } = req.body;

  const parts = name.split(" ");
  const first = parts[0];
  const last = parts.slice(1).join(" ");
  bcrypt.hash(password, 10, async (err, hash) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Password hash error" });
    }
    try {
      const created = await prisma.user.create({
        data: {
          first_name: first,
          last_name: last,
          email,
          password: hash,
          role: roleToDb(role),
        },
      });

      await logActivity({
        actor: req.actor,
        action: "created",
        module: "users",
        description: `Created account "${created.first_name} ${created.last_name}" (${created.email})`,
        metadata: { userId: created.id },
      });

      return res.json({ message: "User created" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "User create failed" });
    }
  });
});

app.put("/api/admin/users/:id", (req, res) => {
  const { name, email, role, status } = req.body;
  const parts = name.split(" ");
  const first = parts[0];
  const last = parts.slice(1).join(" ");
  prisma.user
    .update({
      where: { id: parseInt(req.params.id) },
      data: {
        first_name: first,
        last_name: last,
        email,
        role: roleToDb(role),
        status,
      },
    })
    .then(async (updated) => {
      await logActivity({
        actor: req.actor,
        action: "updated",
        module: "users",
        description: `Updated account "${updated.first_name} ${updated.last_name}" (${updated.email})`,
        metadata: { userId: updated.id },
      });
      res.json({ message: "User updated" });
    })
    .catch((e) => {
      console.error(e);
      res.status(500).json({ message: "User update failed" });
    });
});

app.delete("/api/admin/users/:id", async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u) return res.status(404).json({ message: "User not found" });

    await prisma.$transaction([
      prisma.archivedUser.create({
        data: {
          user_id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          phone: u.phone,
          address: u.address,
          email: u.email,
          password: u.password,
          role: u.role,
          status: u.status,
          last_login: u.last_login,
          join_date: u.join_date,
          gender: u.gender,
          birthday: u.birthday,
          position: u.position,
          archived_at: new Date(),
        },
      }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    await logActivity({
      actor: req.actor,
      action: "deleted",
      module: "users",
      description: `Archived account "${u.first_name} ${u.last_name}" (${u.email})`,
      metadata: { userId },
    });

    return res.json({ message: "User archived" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Archive failed" });
  }
});

// user cus prof
app.get("/api/user-profile/:id", (req, res) => {
  prisma.user
    .findUnique({ where: { id: parseInt(req.params.id) } })
    .then((u) => {
      if (!u) return res.status(404).json({ message: "User not found" });
      res.json({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email || "",
        phone: u.phone || "+63",
        address: u.address || "",
        gender: u.gender || "",
        avatar_url: u.avatar_url || "",
        birthday: u.birthday
          ? new Date(u.birthday).toISOString().slice(0, 10)
          : "",
      });
    })
    .catch((e) => {
      console.error(e);
      res.status(500).json({ message: "DB error" });
    });
});

app.put("/api/user-profile/:id", async (req, res) => {
  const { name, email, birthday, gender, phone, address, avatar_url } =
    req.body;

  // Validate phone only when provided
  if (phone !== undefined && phone !== "") {
    if (!/^\+639\d{9}$/.test(phone))
      return res
        .status(400)
        .json({ message: "Phone must be +639 followed by 9 digits" });
  }

  // Validate birthday only when provided
  if (birthday) {
    const y = new Date(birthday).getFullYear();
    if (y > 2011)
      return res
        .status(400)
        .json({ message: "Only users born in 2011 or earlier allowed" });
  }

  // normalize birthday: convert valid input to ISO string, otherwise set null
  const birthdayValue = (() => {
    if (birthday === undefined || birthday === "") return undefined;
    const d = new Date(birthday);
    return isNaN(d.getTime()) ? null : d.toISOString();
  })();

  // if email is provided, validate format
  if (email !== undefined && email && !/\S+@\S+\.\S+/.test(String(email))) {
    return res
      .status(400)
      .json({ message: "Please enter a valid email address" });
  }

  // Build update data object only with provided fields
  const updateData = {};
  if (name !== undefined) {
    const parts = String(name || "").split(" ");
    updateData.first_name = parts[0] || "";
    updateData.last_name = parts.slice(1).join(" ") || "";
  }
  if (email !== undefined) updateData.email = email;
  if (birthday !== undefined) updateData.birthday = birthdayValue;
  if (gender !== undefined) updateData.gender = gender;
  if (phone !== undefined) updateData.phone = phone;
  if (address !== undefined) updateData.address = address;
  if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

  try {
    // If email is being updated, ensure no duplicate exists
    if (email) {
      const dup = await prisma.user.findFirst({
        where: { email, id: { not: parseInt(req.params.id) } },
      });
      if (dup)
        return res.status(400).json({ message: "Email already registered" });
    }

    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });

    return res.json({ message: "Profile updated" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Database error" });
  }
});

// req pass(change pass)
app.post("/api/password/request-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) return res.status(404).json({ message: "Email not found" });

    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    saveOtp(email, { code, expiresAt, verifiedUntil: null });

    const emailRes = await sendOtpEmail({
      email,
      code,
      expiresAt,
      subject: "Your OTP Code (Password Change)",
    });

    if (emailRes.status === "failed") {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    return res.json({ message: "OTP sent to your email." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Database error" });
  }
});

// VERIFY OTP (for password change)
app.post("/api/password/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP required" });

  const entry = getOtp(email);
  if (!entry)
    return res
      .status(400)
      .json({ message: "No OTP request found. Please resend OTP." });

  const now = new Date();
  if (now > entry.expiresAt) {
    deleteOtp(email);
    return res.status(400).json({ message: "OTP expired. Please resend OTP." });
  }

  if (String(otp) !== entry.code) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  entry.verifiedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  return res.json({ message: "OTP verified" });
});

app.post("/api/password/send-otp", (req, res) => {
  req.url = "/api/password/request-otp";
  app._router.handle(req, res);
});

// Verify the currently logged-in admin's password before a sensitive action
app.post("/api/admin/verify-password", async (req, res) => {
  const { userId, email, password } = req.body;

  if ((!userId && !email) || !password) {
    return res.status(400).json({ message: "Credentials required" });
  }

  try {
    const user = userId
      ? await prisma.user.findUnique({ where: { id: parseInt(userId) } })
      : await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Incorrect password" });

    return res.json({ verified: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Verification failed" });
  }
});

// CHANGE PASSWORD (requires OTP verified)
app.put("/api/profile/:id/password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const upper = /[A-Z]/.test(newPassword);
  const num = /\d/.test(newPassword);
  const spec = /[^A-Za-z0-9]/.test(newPassword);
  const len = newPassword.length >= 8 && newPassword.length <= 12;

  if (!upper || !num || !spec || !len)
    return res.status(400).json({ message: "Password weak" });

  try {
    const row = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!row) return res.status(404).json({ message: "User not found" });

    const userEmail = row.email;
    const entry = getOtp(userEmail);
    if (!entry || !entry.verifiedUntil)
      return res.status(403).json({ message: "OTP verification required" });
    if (new Date() > new Date(entry.verifiedUntil)) {
      deleteOtp(userEmail);
      return res
        .status(403)
        .json({ message: "OTP session expired. Please verify again." });
    }

    const match = await bcrypt.compare(currentPassword, row.password);
    if (!match) return res.status(400).json({ message: "Wrong password" });

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { password: hash },
    });
    deleteOtp(userEmail);
    return res.json({ message: "Password changed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Database error" });
  }
});

// reset pass
app.post("/api/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword)
    return res
      .status(400)
      .json({ message: "Email and newPassword are required" });

  const entry = getOtp(email);
  if (!entry || !entry.verifiedUntil)
    return res.status(403).json({ message: "OTP verification required" });
  if (new Date() > new Date(entry.verifiedUntil)) {
    deleteOtp(email);
    return res
      .status(403)
      .json({ message: "OTP session expired. Please verify again." });
  }

  const upper = /[A-Z]/.test(newPassword);
  const num = /\d/.test(newPassword);
  const spec = /[^A-Za-z0-9]/.test(newPassword);
  const len = newPassword.length >= 8 && newPassword.length <= 12;
  if (!upper || !num || !spec || !len)
    return res.status(400).json({ message: "Password weak" });

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { email }, data: { password: hash } });
    deleteOtp(email);
    return res.json({ message: "Password reset successful" });
  } catch (e) {
    if (e.code === "P2025")
      return res.status(404).json({ message: "Email not found" });
    console.error(e);
    return res.status(500).json({ message: "Database error" });
  }
});


// Extract pcs count per item pack from customizations object
function extractPcsFromCustomizations(customizations) {
  if (!customizations) return 1;

  const qtyStr =
    typeof customizations.quantity === "object"
      ? customizations.quantity?.label || ""
      : String(customizations.quantity || "");

  const match = qtyStr.match(/(\d+)\s*(?:pc|pcs|piece|pieces)?/i);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    return parsed > 0 ? parsed : 1;
  }

  return 1;
}

// -------------------------
// Orders API
// -------------------------
app.post("/api/orders", async (req, res) => {
  const { userId, items, shipping_address, billing_address, shippingCost, payment_status } =
    req.body;

  console.log("📦 Order received:", {
    userId,
    itemsCount: items?.length,
    shippingCost,
  });
  console.log("📋 Items detail:", JSON.stringify(items, null, 2));

  if (!userId || !items || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: "Invalid order payload" });

  try {
    // Verify user exists to prevent foreign key violation
    const userExists = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify products exist and have sufficient stock
    const uniqueProductIds = [...new Set(items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
    });

    if (products.length !== uniqueProductIds.length) {
      return res
        .status(400)
        .json({ message: "One or more products not found" });
    }

    // Check stock availability for all items
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.productId);
      const lineQty = Number(item.quantity || 1);
      const pcsPerItem = extractPcsFromCustomizations(item.customizations);
      const requestedStock = pcsPerItem * lineQty;

      if (product.stock < requestedStock) {
        return res.status(400).json({
          message:
            `Insufficient stock for ${product.name}. ` +
            `Available: ${product.stock}, Requested: ${requestedStock}`,
          productId: item.productId,
          productName: product.name,
          available: product.stock,
          requested: requestedStock,
        });
      }
    }

    let itemsTotal = 0;

    // Validate submitted unitPrice against product DB price to prevent spoofing
    for (const it of items) {
      const product = productMap.get(it.productId);
      const submittedUnit = parseFloat(it.unitPrice || 0);
      const dbPrice = parseFloat(product.price || 0);

      // Allow unitPrice >= 50% of DB price (accommodates bulk batch
      // discounts, material surcharges, and rounding)
      if (dbPrice > 0 && submittedUnit < dbPrice * 0.5) {
        return res.status(400).json({
          message:
            `Price mismatch for "${product.name}". ` +
            "Submitted price is below acceptable range.",
          productId: it.productId,
        });
      }
    }

    const createItems = items.map((it) => {
      // Use unitPrice from frontend (what customer saw at checkout)
      const unit = parseFloat(it.unitPrice || 0);
      const quantity = Number(it.quantity || 1);
      const itemTotal = unit * quantity;
      console.log(
        `  Item: productId=${it.productId}, unitPrice=${unit}, ` +
        `qty=${quantity}, itemTotal=${itemTotal}`,
      );
      itemsTotal += itemTotal;
      return {
        productId: it.productId,
        quantity,
        unit_price: parseFloat(unit.toFixed(2)),
        total_price: parseFloat(itemTotal.toFixed(2)),
        customizations: {
          ...(it.customizations || {}),
          // Preserve any imageUrl provided by frontend
          ...(it.imageUrl ? { imageUrl: it.imageUrl } : {}),
        },
      };
    });

    // Add shipping to total
    const shipping = parseFloat(shippingCost || 0);
    const total = itemsTotal + shipping;

    console.log(
      `💰 Calculation: itemsTotal=${itemsTotal}, shipping=${shipping}, total=${total}`,
    );

    // Create order and deduct stock in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          userId,
          total: parseFloat(total.toFixed(2)),
          currency: "PHP",
          status: "pending",
          payment_status: payment_status || "awaiting_payment",
          shipping_address,
          billing_address,
          items: { create: createItems },
        },
        include: { items: true },
      });

      // Deduct stock for each item based on requestedStock
      for (const item of items) {
        const lineQty = Number(item.quantity || 1);
        const pcsPerItem = extractPcsFromCustomizations(item.customizations);
        const requestedStock = pcsPerItem * lineQty;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: requestedStock } },
        });
      }

      return newOrder;
    });

    const orderWithDetails = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });
    const notification = await notifyOrderStatus(orderWithDetails, "pending");
    const adminReviewNotification =
      await notifyAdminsNewOrderForReview(orderWithDetails);
    const updatedProducts = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
    });
    const lowStockAlert = await notifyLowStockProducts(updatedProducts, 10);
    const outOfStockAlert =
      await notifyOutOfStockProducts(updatedProducts);

    console.log(`✅ Order created: ID=${order.id}, total=${order.total}`);
    res.json({
      message: "Order created",
      order: orderWithDetails || order,
      notification,
      adminReviewNotification,
      lowStockAlert,
      outOfStockAlert,
    });
  } catch (e) {
    console.error("❌ Order creation failed:", e.message);
    res.status(500).json({ message: "Order creation failed" });
  }
});

app.get("/api/orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, user: true },
    });
    if (!order || order.deleted_at)
      return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB error" });
  }
});

app.get("/api/user/:id/orders", async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const orders = await prisma.order.findMany({
      where: { userId, deleted_at: null },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true } },
          },
        },
      },
    });
    res.json(orders);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB error" });
  }
});

const normalizeCartCustomizations = (value) => {
  if (!value || typeof value !== "object") return {};
  return value;
};

const cartItemPayload = (item) => ({
  id: item.id,
  productId: item.productId,
  title: item.title,
  name: item.title,
  price: Number(item.price),
  qty: item.qty,
  productImage:
    item.productImage ||
    item.customizations?.imageUrl ||
    item.product?.images?.[0] ||
    null,
  images: item.product?.images || [],
  customizations: item.customizations || {},
});

// Customer cart API - shared by web and mobile clients.
app.get("/api/user/:id/cart", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (!userId) return res.status(400).json({ message: "Invalid user id" });

  try {
    // Verify user exists to detect stale local session
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    const items = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: { select: { id: true, name: true, images: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(items.map(cartItemPayload));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load cart" });
  }
});

app.post("/api/user/:id/cart", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (!userId) return res.status(400).json({ message: "Invalid user id" });

  const {
    productId,
    title,
    name,
    price,
    qty = 1,
    productImage,
    images,
    customizations,
  } = req.body || {};

  if (!productId || !(title || name)) {
    return res.status(400).json({ message: "Invalid cart item" });
  }

  try {
    // Verify user exists to avoid foreign key constraints violation
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    const normalizedCustomizations = normalizeCartCustomizations(customizations);
    const existingItems = await prisma.cartItem.findMany({
      where: { userId, productId: Number(productId) },
    });
    const match = existingItems.find(
      (item) =>
        JSON.stringify(item.customizations || {}) ===
        JSON.stringify(normalizedCustomizations),
    );

    const saved = match
      ? await prisma.cartItem.update({
        where: { id: match.id },
        data: { qty: { increment: Number(qty) || 1 } },
        include: {
          product: { select: { id: true, name: true, images: true } },
        },
      })
      : await prisma.cartItem.create({
        data: {
          userId,
          productId: Number(productId),
          title: title || name,
          price: Number(price || 0),
          qty: Math.max(1, Number(qty) || 1),
          productImage: productImage || images?.[0] || null,
          customizations: normalizedCustomizations,
        },
        include: {
          product: { select: { id: true, name: true, images: true } },
        },
      });

    res.status(match ? 200 : 201).json(cartItemPayload(saved));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to save cart item" });
  }
});

app.patch("/api/user/:id/cart/:itemId", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const itemId = parseInt(req.params.itemId, 10);
  const qty = Math.floor(Number(req.body?.qty || 0));

  if (!userId || !itemId) {
    return res.status(400).json({ message: "Invalid cart item" });
  }

  try {
    if (qty < 1) {
      await prisma.cartItem.deleteMany({ where: { id: itemId, userId } });
      return res.json({ message: "Cart item removed" });
    }

    const existing = await prisma.cartItem.findFirst({
      where: { id: itemId, userId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    const item = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { qty },
      include: { product: { select: { id: true, name: true, images: true } } },
    });

    res.json(cartItemPayload(item));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to update cart item" });
  }
});

app.delete("/api/user/:id/cart/:itemId", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const itemId = parseInt(req.params.itemId, 10);
  if (!userId || !itemId) return res.status(400).json({ message: "Invalid cart item" });

  try {
    await prisma.cartItem.deleteMany({ where: { id: itemId, userId } });
    res.json({ message: "Cart item removed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to remove cart item" });
  }
});

app.delete("/api/user/:id/cart", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (!userId) return res.status(400).json({ message: "Invalid user id" });

  try {
    await prisma.cartItem.deleteMany({ where: { userId } });
    res.json({ message: "Cart cleared" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to clear cart" });
  }
});

app.get("/api/admin/products", async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;

    const products = await prisma.product.findMany({
      where: { deleted_at: null },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.product.count({
      where: { deleted_at: null },
    });

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch admin products" });
  }
});

app.get("/api/admin/orders", async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { deleted_at: null },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true } },
          },
        },
        user: true,
      },
    });
    res.json(orders);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB error" });
  }
});

app.get("/api/admin/production-queue", requireAuth(prisma), requireRole("staff", "admin"), async (req, res) => {
  try {
    const where = {
      deleted_at: null,
      status: { notIn: ["cancelled", "return_requested"] },
    };

    let scopedToStatuses = null;
    if (req.actor.role === "staff") {
      const relevantStatuses = await getRelevantProductionStatuses(req.actor.id);
      if (relevantStatuses.length === 0) {
        return res.json({ statuses: PRODUCTION_STATUSES, queue: [], scoped: true });
      }
      scopedToStatuses = relevantStatuses;
      where.productionStatus = { in: relevantStatuses };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: true,
        items: { include: { product: true } },
      },
      orderBy: [{ due_date: "asc" }, { createdAt: "asc" }],
    });

    res.json({
      statuses: PRODUCTION_STATUSES,
      scoped: !!scopedToStatuses,
      scopedToStatuses,
      queue: orders.map((order) => ({
        id: order.id,
        customer: getCustomerName(order),
        status: order.status,
        statusLabel: ORDER_STATUS_LABELS[order.status] || order.status,
        productionStatus: order.productionStatus,
        payment_status: order.payment_status,
        total: order.total,
        createdAt: order.createdAt,
        due_date: order.due_date,
        items: order.items,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch production queue" });
  }
});

// GET /api/me/staff-roles — the logged-in user's own active job roles
app.get("/api/me/staff-roles", requireAuth(prisma), async (req, res) => {
  try {
    const roles = await prisma.userStaffRole.findMany({
      where: { userId: req.actor.id, unassignedAt: null },
      select: { role: true },
    });
    res.json({ roles: roles.map((r) => r.role) });
  } catch (e) {
    console.error("Fetch my staff roles error:", e.message);
    res.status(500).json({ message: "Failed to fetch staff roles" });
  }
});


// GET /api/admin/users/:id/staff-roles — list a user's active sub-roles
app.get("/api/admin/users/:id/staff-roles", requireAuth(prisma), requireRole("admin"), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const roles = await prisma.userStaffRole.findMany({
      where: { userId, unassignedAt: null },
      select: { role: true },
    });
    res.json({ roles: roles.map((r) => r.role) });
  } catch (e) {
    console.error("Fetch staff roles error:", e.message);
    res.status(500).json({ message: "Failed to fetch staff roles" });
  }
});

// POST /api/admin/users/:id/staff-roles — grant a sub-role
app.post("/api/admin/users/:id/staff-roles", requireAuth(prisma), requireRole("admin"), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "role is required" });

    // Re-activate if it was previously revoked, otherwise create fresh
    const existing = await prisma.userStaffRole.findFirst({ where: { userId, role } });
    const result = existing
      ? await prisma.userStaffRole.update({
          where: { id: existing.id },
          data: { unassignedAt: null, assignedBy: req.actor.id, assignedAt: new Date() },
        })
      : await prisma.userStaffRole.create({
          data: { userId, role, assignedBy: req.actor.id },
        });

    await logActivity({
      actor: req.actor,
      action: "staff_role_granted",
      module: "users",
      description: `Granted ${role} to user #${userId}`,
      metadata: { userId, role },
    });

    res.status(201).json({ message: "Role granted", staffRole: result });
  } catch (e) {
    console.error("Grant staff role error:", e.message);
    res.status(500).json({ message: "Failed to grant role" });
  }
});

// DELETE /api/admin/users/:id/staff-roles/:role — revoke a sub-role
app.delete("/api/admin/users/:id/staff-roles/:role", requireAuth(prisma), requireRole("admin"), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.params;

    await prisma.userStaffRole.updateMany({
      where: { userId, role, unassignedAt: null },
      data: { unassignedAt: new Date() },
    });

    await logActivity({
      actor: req.actor,
      action: "staff_role_revoked",
      module: "users",
      description: `Revoked ${role} from user #${userId}`,
      metadata: { userId, role },
    });

    res.json({ message: "Role revoked" });
  } catch (e) {
    console.error("Revoke staff role error:", e.message);
    res.status(500).json({ message: "Failed to revoke role" });
  }
});



// PUT /api/production/orders/:id/status — advance an order's production status
app.put("/api/production/orders/:id/status", requireAuth(prisma), requireRole("staff", "admin"), async (req, res) => {
  const orderId = parseInt(req.params.id);
  const { productionStatus } = req.body;

  const VALID_STATUSES = [
    "PENDING_FILE_CHECK",
    "AWAITING_PAYMENT",
    "PRINTING_QUEUE",
    "QUALITY_ASSURANCE",
    "PACKAGING_READY",
    "COMPLETED",
  ];

  if (!orderId || !productionStatus) {
    return res.status(400).json({ message: "id and productionStatus are required" });
  }
  if (!VALID_STATUSES.includes(productionStatus)) {
    return res.status(400).json({ message: `Invalid productionStatus. Must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  try {
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) return res.status(404).json({ message: "Order not found" });

    if (productionStatus === "PRINTING_QUEUE") {
      if (!existing.proofApproved) {
        return res.status(403).json({
          message:
            "This order cannot enter the print queue until the design proof has been approved.",
        });
      }

      if (!hasMetProductionPaymentThreshold(existing)) {
        const total = parseFloat(existing.total);
        const paid = parseFloat(existing.amountPaid);
        const requiredAmount = existing.isBulkOrder ? total * 0.5 : total;

        return res.status(403).json({
          message: existing.isBulkOrder
            ? `This bulk order requires at least 50% down payment before entering production. Paid: ₱${paid.toFixed(2)} / Required: ₱${requiredAmount.toFixed(2)}.`
            : `This order must be fully paid before entering production. Paid: ₱${paid.toFixed(2)} / Required: ₱${requiredAmount.toFixed(2)}.`,
        });
      }
    }

    let lowStockAlerts = [];
    let requisitions = [];

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: { productionStatus },
      });

      if (productionStatus === "PRINTING_QUEUE") {
        const decrementResults = await decrementMaterialsForOrder(tx, orderId);
        lowStockAlerts = decrementResults.filter((r) => r.belowThreshold);

        await tx.activityLog.create({
          data: {
            userId: req.actor?.id ?? null,
            userName: req.actor?.name ?? null,
            userEmail: req.actor?.email ?? null,
            userRole: req.actor?.role ?? null,
            action: "inventory_decremented",
            module: "inventory",
            description:
              `Order #${orderId} entered PRINTING_QUEUE — decremented materials ` +
              `for ${decrementResults.length} tracked item(s).`,
            metadata: { orderId, productionStatus, decrementResults },
          },
        });

        for (const alert of lowStockAlerts) {
          const label = alert.type === "substrate" ? alert.materialName : alert.colorChannel;
          await tx.activityLog.create({
            data: {
              userId: req.actor?.id ?? null,
              userName: req.actor?.name ?? null,
              userEmail: req.actor?.email ?? null,
              userRole: req.actor?.role ?? null,
              action: "low_stock_alert",
              module: "inventory",
              description:
                `⚠️ ${alert.type === "substrate" ? "Substrate" : "Ink"} "${label}" ` +
                `dropped to ${alert.remainingStock} (safety threshold: ${alert.safetyThreshold}) ` +
                `after order #${orderId}.`,
              metadata: alert,
            },
          });
        }

        // Auto-generate purchase requisitions for every material that
        // breached its safety threshold, so procurement has an actionable
        // document without waiting on someone to notice the alert log.
        if (lowStockAlerts.length > 0) {
          requisitions = await createRequisitionsFromAlerts(
            tx,
            lowStockAlerts,
            orderId,
            req.actor?.id
          );

          await tx.activityLog.create({
            data: {
              userId: req.actor?.id ?? null,
              userName: req.actor?.name ?? null,
              userEmail: req.actor?.email ?? null,
              userRole: req.actor?.role ?? null,
              action: "requisition_generated",
              module: "inventory",
              description:
                `Auto-generated ${requisitions.length} purchase requisition(s) ` +
                `from order #${orderId}'s low-stock alerts.`,
              metadata: { orderId, requisitionIds: requisitions.map((r) => r.id) },
            },
          });
        }
      }

      return order;
    });

    await logActivity({
      actor: req.actor,
      action: "status_changed",
      module: "orders",
      description: `Order #${orderId} production status changed to "${productionStatus}"`,
      metadata: { orderId, previousStatus: existing.productionStatus, newStatus: productionStatus },
    });

    if (requisitions.length > 0) {
      await createNotificationForAdmins({
        title: `${requisitions.length} purchase requisition(s) generated`,
        body: `Order #${orderId} triggered automatic restock requisitions for low-stock materials.`,
        type: "requisition",
        link: `/admin/inventory`,
      });
    }

    // When production finishes, notify the customer if a balance remains
    // (bulk orders that only paid the 50% down payment).
    if (productionStatus === "COMPLETED") {
      const total = parseFloat(updatedOrder.total);
      const paid = parseFloat(updatedOrder.amountPaid || 0);
      const remaining = Math.max(total - paid, 0);

      if (remaining > 0) {
        const orderWithUser = await prisma.order.findUnique({
          where: { id: orderId },
          include: { user: true },
        });
        await notifyFinalPaymentDue(orderWithUser, remaining);
        if (orderWithUser.userId) {
          await createNotification({
            userId: orderWithUser.userId,
            title: `Balance due — Order #${orderId}`,
            body: `Production is complete. Remaining balance: ₱${remaining.toFixed(2)}.`,
            type: "payment_due",
            link: `/orders/${orderId}`,
          });
        }
      }
    }

    return res.json({
      message: "Production status updated",
      order: updatedOrder,
      lowStockAlerts,
      requisitions,
    });
  } catch (e) {
    console.error("Production status update error:", e.message);
    if (e.code === "P2025") {
      return res.status(404).json({ message: "Order not found" });
    }
    return res.status(500).json({ message: "Failed to update production status" });
  }
});

// GET /api/production/requisitions — list purchase requisitions (admin/staff)
app.get("/api/production/requisitions", requireAuth(prisma), requireRole("staff", "admin"), async (req, res) => {
  try {
    const { status } = req.query;
    const requisitions = await prisma.purchaseRequisition.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: "desc" },
    });
    return res.json({ requisitions });
  } catch (e) {
    console.error("Requisitions fetch error:", e.message);
    return res.status(500).json({ message: "Failed to fetch requisitions" });
  }
});

// PATCH /api/production/requisitions/:id — update requisition status (e.g. mark ORDERED/RECEIVED)
app.patch("/api/production/requisitions/:id", requireAuth(prisma), requireRole("staff", "admin"), async (req, res) => {
  const requisitionId = parseInt(req.params.id);
  const { status } = req.body;

  const VALID_STATUSES = ["PENDING", "ORDERED", "RECEIVED", "CANCELLED"];
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  try {
    const updated = await prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: {
        status,
        ...(status === "RECEIVED" && { resolvedAt: new Date() }),
      },
    });

    // If marked RECEIVED, restock the actual inventory row so the cycle closes.
    if (status === "RECEIVED") {
      if (updated.materialType === "substrate") {
        await prisma.inventorySubstrate.updateMany({
          where: { materialName: updated.materialName },
          data: { stockMeters: { increment: updated.requestedAmount } },
        });
            } else if (updated.materialType === "ink") {
        await prisma.inventoryInk.updateMany({
          where: { colorChannel: updated.materialName },
          data: { volumeMl: { increment: updated.requestedAmount } },
        });
      } else if (updated.materialType === "unit") {
        await prisma.inventoryUnit.updateMany({
          where: { itemName: updated.materialName },
          data: { stockUnits: { increment: Math.round(updated.requestedAmount) } },
        });
      }
    }

    await logActivity({
      actor: req.actor,
      action: "requisition_status_changed",
      module: "inventory",
      description: `Requisition #${requisitionId} (${updated.materialName}) marked as ${status}`,
      metadata: { requisitionId, status },
    });

    return res.json({ message: "Requisition updated", requisition: updated });
  } catch (e) {
    console.error("Requisition update error:", e.message);
    if (e.code === "P2025") return res.status(404).json({ message: "Requisition not found" });
    return res.status(500).json({ message: "Failed to update requisition" });
  }
});

// GET /api/production/requisitions/:id/document — plain-text restock sheet for printing/emailing
app.get("/api/production/requisitions/:id/document", requireAuth(prisma), requireRole("staff", "admin"), async (req, res) => {
  try {
    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!requisition) return res.status(404).json({ message: "Requisition not found" });

    res.set("Content-Type", "text/plain");
    return res.send(requisition.documentText);
  } catch (e) {
    console.error("Requisition document error:", e.message);
    return res.status(500).json({ message: "Failed to fetch requisition document" });
  }
});

// GET /api/notifications — current user's notifications, paginated
app.get("/api/notifications", requireAuth(prisma), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [notifications, unreadCount, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.actor.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId: req.actor.id, isRead: false } }),
      prisma.notification.count({ where: { userId: req.actor.id } }),
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("Notifications fetch error:", e.message);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// GET /api/notifications/unread-count — lightweight badge-count check
app.get("/api/notifications/unread-count", requireAuth(prisma), async (req, res) => {
  try {
    const unreadCount = await prisma.notification.count({
      where: { userId: req.actor.id, isRead: false },
    });
    res.json({ unreadCount });
  } catch (e) {
    console.error("Unread count error:", e.message);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
});

// PATCH /api/notifications/:id/read — mark a single notification read
app.patch("/api/notifications/:id/read", requireAuth(prisma), async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!notification || notification.userId !== req.actor.id) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });
    res.json({ notification: updated });
  } catch (e) {
    console.error("Notification read error:", e.message);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

// PATCH /api/notifications/mark-all-read
app.patch("/api/notifications/mark-all-read", requireAuth(prisma), async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.actor.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: "All notifications marked as read" });
  } catch (e) {
    console.error("Mark-all-read error:", e.message);
    res.status(500).json({ message: "Failed to mark notifications as read" });
  }
});

app.get("/api/admin/reports/sales", async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if (to) to.setHours(23, 59, 59, 999);

    const createdAt = {};
    if (from && !isNaN(from.getTime())) createdAt.gte = from;
    if (to && !isNaN(to.getTime())) createdAt.lte = to;

    const where = {
      deleted_at: null,
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    };

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const paidOrders = orders.filter((order) => order.payment_status === "paid");
    const completedOrders = orders.filter((order) =>
      ["completed", "delivered"].includes(order.status),
    );
    const revenue = paidOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );

    const byStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const productMap = new Map();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.productId;
        const current = productMap.get(key) || {
          productId: key,
          name: item.product?.name || `Product #${key}`,
          quantity: 0,
          revenue: 0,
        };
        current.quantity += Number(item.quantity || 0);
        current.revenue += Number(item.total_price || 0);
        productMap.set(key, current);
      });
    });

    res.json({
      range: {
        from: from && !isNaN(from.getTime()) ? from.toISOString() : null,
        to: to && !isNaN(to.getTime()) ? to.toISOString() : null,
      },
      summary: {
        orders: orders.length,
        paidOrders: paidOrders.length,
        completedOrders: completedOrders.length,
        revenue,
        averageOrderValue: paidOrders.length ? revenue / paidOrders.length : 0,
      },
      byStatus,
      topProducts: Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      recentOrders: orders.slice(0, 25).map((order) => ({
        id: order.id,
        customer: getCustomerName(order),
        status: order.status,
        payment_status: order.payment_status,
        total: order.total,
        createdAt: order.createdAt,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to build sales report" });
  }
});


// GET /api/admin/payments — list all orders with payment detail, for the admin Payments page
app.get("/api/admin/payments", async (req, res) => {
  try {
    const { status } = req.query;

    const where = {
      deleted_at: null,
      ...(status ? { payment_status: status } : {}),
    };

    const orders = await prisma.order.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    const payments = orders.map((order) => {
      const total = parseFloat(order.total);
      const amountPaid = parseFloat(order.amountPaid || 0);
      return {
        orderId: order.id,
        customer: getCustomerName(order),
        total,
        amountPaid,
        remaining: Math.max(total - amountPaid, 0),
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        paymentReference: order.payment_reference,
        isBulkOrder: order.isBulkOrder,
        createdAt: order.createdAt,
      };
    });

    const summary = {
      totalCollected: payments.reduce((s, p) => s + p.amountPaid, 0),
      awaitingPayment: payments.filter((p) => p.paymentStatus === "awaiting_payment").length,
      partiallyPaid: payments.filter((p) => p.paymentStatus === "partially_paid").length,
      fullyPaid: payments.filter((p) => p.paymentStatus === "paid").length,
    };

    res.json({ payments, summary });
  } catch (e) {
    console.error("Admin payments fetch error:", e.message);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

// GET /api/admin/inventory — current stock levels for all substrate/ink materials
app.get("/api/admin/inventory", async (req, res) => {
  try {
        const [substrates, inks, units] = await Promise.all([
      prisma.inventorySubstrate.findMany({ orderBy: { materialName: "asc" } }),
      prisma.inventoryInk.findMany({ orderBy: { colorChannel: "asc" } }),
      prisma.inventoryUnit.findMany({ orderBy: { itemName: "asc" } }),
    ]);

    const materials = [
      ...substrates.map((s) => ({
        id: `substrate-${s.id}`,
        type: "substrate",
        name: s.materialName,
        unit: "meters",
        stock: s.stockMeters,
        safetyThreshold: s.safetyThreshold,
        belowThreshold: s.stockMeters <= s.safetyThreshold,
      })),
      ...inks.map((i) => ({
        id: `ink-${i.id}`,
        type: "ink",
        name: i.colorChannel,
        unit: "ml",
        stock: i.volumeMl,
        safetyThreshold: i.safetyThreshold,
        belowThreshold: i.volumeMl <= i.safetyThreshold,
      })),
      ...units.map((u) => ({
        id: `unit-${u.id}`,
        type: "unit",
        name: u.itemName,
        unit: "pcs",
        stock: u.stockUnits,
        safetyThreshold: u.safetyThreshold,
        belowThreshold: u.stockUnits <= u.safetyThreshold,
      })),
    ];

    res.json({
      materials,
      summary: {
        total: materials.length,
        belowThreshold: materials.filter((m) => m.belowThreshold).length,
      },
    });
  } catch (e) {
    console.error("Admin inventory fetch error:", e.message);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

// POST /api/admin/inventory — add a new tracked material
app.post("/api/admin/inventory", async (req, res) => {
  try {
    const { type, name, stock, safetyThreshold } = req.body;
    if (!type || !name || stock === undefined) {
      return res.status(400).json({ message: "type, name, and stock are required" });
    }

    let created;
    if (type === "substrate") {
      created = await prisma.inventorySubstrate.create({
        data: {
          materialName: name,
          stockMeters: parseFloat(stock),
          ...(safetyThreshold !== undefined && { safetyThreshold: parseFloat(safetyThreshold) }),
        },
      });
        } else if (type === "ink") {
      created = await prisma.inventoryInk.create({
        data: {
          colorChannel: name,
          volumeMl: parseFloat(stock),
          ...(safetyThreshold !== undefined && { safetyThreshold: parseFloat(safetyThreshold) }),
        },
      });
    } else if (type === "unit") {
      created = await prisma.inventoryUnit.create({
        data: {
          itemName: name,
          stockUnits: parseInt(stock),
          ...(safetyThreshold !== undefined && { safetyThreshold: parseInt(safetyThreshold) }),
        },
      });
    } else {
      return res.status(400).json({ message: "type must be 'substrate', 'ink', or 'unit'" });
    }

    await logActivity({
      actor: req.actor,
      action: "created",
      module: "inventory",
      description: `Added new ${type} material "${name}"`,
      metadata: { type, name },
    });

    res.status(201).json({ message: "Material added", material: created });
  } catch (e) {
    console.error("Add inventory material error:", e.message);
    if (e.code === "P2002") {
      return res.status(400).json({ message: "A material with this name already exists" });
    }
    res.status(500).json({ message: "Failed to add material" });
  }
});

// PUT /api/admin/inventory/:type/:id — correct stock or safety threshold
// PUT /api/admin/inventory/:type/:id — restock (add-only) or adjust safety threshold.
// Stock can only ever be increased here — decrements happen exclusively
// through decrementMaterialsForOrder during production, never manually,
// so staff can't accidentally (or intentionally) zero out real stock.
app.put("/api/admin/inventory/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    const { addStock, safetyThreshold } = req.body;

    if (addStock !== undefined && parseFloat(addStock) < 0) {
      return res.status(400).json({ message: "Stock can only be added, not removed." });
    }

    let updated;
    if (type === "substrate") {
      updated = await prisma.inventorySubstrate.update({
        where: { id: parseInt(id) },
        data: {
          ...(addStock !== undefined && addStock !== "" && {
            stockMeters: { increment: parseFloat(addStock) },
          }),
          ...(safetyThreshold !== undefined && { safetyThreshold: parseFloat(safetyThreshold) }),
        },
      });
        } else if (type === "ink") {
      updated = await prisma.inventoryInk.update({
        where: { id: parseInt(id) },
        data: {
          ...(addStock !== undefined && addStock !== "" && {
            volumeMl: { increment: parseFloat(addStock) },
          }),
          ...(safetyThreshold !== undefined && { safetyThreshold: parseFloat(safetyThreshold) }),
        },
      });
    } else if (type === "unit") {
      updated = await prisma.inventoryUnit.update({
        where: { id: parseInt(id) },
        data: {
          ...(addStock !== undefined && addStock !== "" && {
            stockUnits: { increment: parseInt(addStock) },
          }),
          ...(safetyThreshold !== undefined && { safetyThreshold: parseInt(safetyThreshold) }),
        },
      });
    } else {
      return res.status(400).json({ message: "type must be 'substrate', 'ink', or 'unit'" });
    }

    await logActivity({
      actor: req.actor,
      action: "updated",
      module: "inventory",
      description: `Restocked ${type} material #${id} by ${addStock || 0}`,
      metadata: { type, id, addStock, safetyThreshold },
    });

    res.json({ message: "Material updated", material: updated });
  } catch (e) {
    console.error("Update inventory material error:", e.message);
    if (e.code === "P2025") return res.status(404).json({ message: "Material not found" });
    res.status(500).json({ message: "Failed to update material" });
  }
});

// =================================================
// INQUIRIES API
// =================================================

// POST /api/inquiries — customer submits a quote request
app.post("/api/inquiries", async (req, res) => {
  const {
    userId, product_title, subject, name, email,
    quantity, size, color, material, finishing, printing,
    processing, delivery, other, design_data,
    isRushOrder, rushOrderFee, sizeSurcharge, // ADD THESE
  } = req.body;

  if (!subject || !name || !email) {
    return res.status(400).json({ message: "Subject, name, and email are required" });
  }

  try {
    const inquiry = await prisma.inquiry.create({
      data: {
        userId: userId ? parseInt(userId) : null,
        product_title, subject, name, email, quantity, size, color,
        material, finishing, printing, processing, delivery, other,
        design_data: design_data || null,
        isRushOrder: Boolean(isRushOrder),                 // ADD
        rushOrderFee: rushOrderFee ? parseFloat(rushOrderFee) : null,   // ADD
        sizeSurcharge: sizeSurcharge ? parseFloat(sizeSurcharge) : null, // ADD
        status: "new",
      },
    });
    res.status(201).json({ message: "Inquiry submitted", inquiry });
  } catch (e) {
    console.error("Inquiry creation failed:", e);
    res.status(500).json({ message: "Failed to submit inquiry" });
  }
});

// GET /api/inquiries — admin: list all inquiries (optionally filter by status)
app.get("/api/inquiries", async (req, res) => {
  const { status } = req.query;
  try {
    const inquiries = await prisma.inquiry.findMany({
      where: status ? { status } : { status: { not: "converted" } },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(inquiries);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch inquiries" });
  }
});

// GET /api/inquiries/:id — admin: single inquiry detail
app.get("/api/inquiries/:id", async (req, res) => {
  try {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });
    if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
    res.json(inquiry);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch inquiry" });
  }
});

// PUT /api/inquiries/:id — admin: update status / quoted_price / admin_notes
app.put("/api/inquiries/:id", async (req, res) => {
  const { status, quoted_price, admin_notes } = req.body;
  const inquiryId = parseInt(req.params.id);
  try {
    // Fetch current state to detect first-time quoted_price set
    const existing = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
    });
    if (!existing)
      return res.status(404).json({ message: "Inquiry not found" });

    const newPrice =
      quoted_price !== undefined
        ? quoted_price
          ? parseFloat(quoted_price)
          : null
        : undefined;

    const inquiry = await prisma.inquiry.update({
      where: { id: inquiryId },
      data: {
        status: status || existing.status,
        ...(newPrice !== undefined && { quoted_price: newPrice }),
        ...(admin_notes !== undefined && { admin_notes }),
      },
    });
    await logActivity({
      actor: req.actor,
      action: "updated",
      module: "inquiries",
      description: `Updated inquiry #${inquiryId}${status ? ` — status: ${status}` : ""}`,
      metadata: { inquiryId },
    });
    res.json({ message: "Inquiry updated", inquiry });
  } catch (e) {
    console.error(e);
    if (e.code === "P2025")
      return res.status(404).json({ message: "Inquiry not found" });
    res.status(500).json({ message: "Failed to update inquiry" });
  }
});

// PUT /api/inquiries/:id/save-and-convert — admin: save inquiry and convert to order
app.put("/api/inquiries/:id/save-and-convert", async (req, res) => {
  const { status, quoted_price, admin_notes } = req.body;
  const inquiryId = parseInt(req.params.id);

  try {
    const existing = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
    });
    if (!existing)
      return res.status(404).json({ message: "Inquiry not found" });

    const newPrice =
      quoted_price !== undefined
        ? quoted_price
          ? parseFloat(quoted_price)
          : null
        : undefined;

    if (!newPrice)
      return res
        .status(400)
        .json({ message: "Quoted price is required to convert inquiry" });

    if (existing.status === "converted" && existing.order_id)
      return res
        .status(400)
        .json({ message: "Inquiry already converted" });

    const { updatedInquiry, order } = await prisma.$transaction(
      async (tx) => {
        const updated = await tx.inquiry.update({
          where: { id: inquiryId },
          data: {
            status: "converted",
            quoted_price: newPrice,
            ...(admin_notes !== undefined && { admin_notes }),
          },
        });

        const summary = [
          updated.product_title && `Product: ${updated.product_title}`,
          updated.quantity && `Qty: ${updated.quantity}`,
          updated.size && `Size: ${updated.size}`,
          updated.sizeSurcharge ? `Size surcharge: ₱${updated.sizeSurcharge}` : null,  // ADD
          updated.isRushOrder ? `Rush order: +₱${updated.rushOrderFee || 0}` : null,   // ADD
          updated.color && `Color: ${updated.color}`,
          updated.material && `Material: ${updated.material}`,
          updated.finishing && `Finishing: ${updated.finishing}`,
          updated.printing && `Printing: ${updated.printing}`,
          updated.processing && `Processing: ${updated.processing}`,
          updated.delivery && `Delivery: ${updated.delivery}`,
          updated.other && `Other: ${updated.other}`,
        ]
          .filter(Boolean)
          .join(" | ");

        // Find or create a generic placeholder product for custom inquiry orders
        let inquiryProduct = await tx.product.findFirst({
          where: { sku: "INQUIRY-CUSTOM" },
        });
        if (!inquiryProduct) {
          inquiryProduct = await tx.product.create({
            data: {
              name: "Custom Inquiry Order",
              sku: "INQUIRY-CUSTOM",
              description: "Generic product for custom inquiry orders",
              price: "0.00",
              stock: 999,
              active: false, // Hidden from public catalog
            },
          });
        }

        const inquiryQty = parseInt(updated.quantity) || 1;

        const order = await tx.order.create({
          data: {
            userId: updated.userId || null,
            total: newPrice,
            currency: "PHP",
            status: "pending",
            payment_status: "awaiting_payment",
            isBulkOrder: true,
            shipping_address: summary || "Custom inquiry order",
            billing_address: `Inquiry #${updated.id} — ${updated.name} <${updated.email}>`,
            items: {
              create: {
                productId: inquiryProduct.id,
                quantity: inquiryQty,
                unit_price: newPrice,
                total_price: newPrice, // quoted price is treated as the line total
                customizations: {
                  inquiry_id: updated.id,
                  product_title: updated.product_title,
                  subject: updated.subject,
                  customer_name: updated.name,
                  customer_email: updated.email,
                  size: updated.size,
                  color: updated.color,
                  material: updated.material,
                  finishing: updated.finishing,
                  printing: updated.printing,
                  processing: updated.processing,
                  delivery: updated.delivery,
                  other: updated.other,
                  design: updated.design_data || null,   // ADD THIS LINE
                },
              },
            },
          },
          include: { items: true },
        });

        const updatedInquiry = await tx.inquiry.update({
          where: { id: inquiryId },
          data: { order_id: order.id },
        });

        return { updatedInquiry, order };
      },
    );

    await logActivity({
      actor: req.actor,
      action: "converted",
      module: "inquiries",
      description: `Saved and converted inquiry #${inquiryId} to order #${order.id}`,
      metadata: { inquiryId, orderId: order.id },
    });

    res.json({
      message: "Inquiry saved and converted to order",
      inquiry: updatedInquiry,
      order,
    });
  } catch (e) {
    console.error("Inquiry save-and-convert failed:", e);
    res.status(500).json({ message: "Failed to save and convert inquiry" });
  }
});

// GET /api/user/:id/inquiries — customer: own inquiries
app.get("/api/user/:id/inquiries", async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const inquiries = await prisma.inquiry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(inquiries);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch inquiries" });
  }
});

// PUT /api/inquiries/:id/convert — admin: convert accepted inquiry to an order
app.put("/api/inquiries/:id/convert", async (req, res) => {
  const inquiryId = parseInt(req.params.id);
  try {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
    });
    if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
    if (!inquiry.quoted_price)
      return res.status(400).json({ message: "Inquiry has no quoted price" });
    if (inquiry.status === "converted" && inquiry.order_id)
      return res.status(400).json({ message: "Inquiry already converted" });

    // Build a summary of what was quoted for the order notes
    const summary = [
      inquiry.product_title && `Product: ${inquiry.product_title}`,
      inquiry.quantity && `Qty: ${inquiry.quantity}`,
      inquiry.size && `Size: ${inquiry.size}`,
      inquiry.color && `Color: ${inquiry.color}`,
      inquiry.material && `Material: ${inquiry.material}`,
      inquiry.finishing && `Finishing: ${inquiry.finishing}`,
      inquiry.printing && `Printing: ${inquiry.printing}`,
      inquiry.processing && `Processing: ${inquiry.processing}`,
      inquiry.delivery && `Delivery: ${inquiry.delivery}`,
      inquiry.other && `Other: ${inquiry.other}`,
    ]
      .filter(Boolean)
      .join(" | ");

    const { order, updatedInquiry } = await prisma.$transaction(async (tx) => {
      let inquiryProduct = await tx.product.findFirst({
        where: { sku: "INQUIRY-CUSTOM" },
      });
      if (!inquiryProduct) {
        inquiryProduct = await tx.product.create({
          data: {
            name: "Custom Inquiry Order",
            sku: "INQUIRY-CUSTOM",
            description: "Generic product for custom inquiry orders",
            price: "0.00",
            stock: 999,
            active: false,
          },
        });
      }

      const inquiryQty = parseInt(inquiry.quantity) || 1;

      const order = await tx.order.create({
        data: {
          userId: inquiry.userId || null,
          total: inquiry.quoted_price,
          currency: "PHP",
          status: "pending",
          payment_status: "awaiting_payment",
          shipping_address: summary || "Custom inquiry order",
          billing_address: `Inquiry #${inquiry.id} — ${inquiry.name} <${inquiry.email}>`,
          items: {
            create: {
              productId: inquiryProduct.id,
              quantity: inquiryQty,
              unit_price: inquiry.quoted_price,
              total_price: inquiry.quoted_price,
              customizations: {
                inquiry_id: inquiry.id,
                product_title: inquiry.product_title,
                subject: inquiry.subject,
                customer_name: inquiry.name,
                customer_email: inquiry.email,
                size: inquiry.size,
                color: inquiry.color,
                material: inquiry.material,
                finishing: inquiry.finishing,
                processing: inquiry.processing,
                printing: inquiry.printing,
                delivery: inquiry.delivery,
                other: inquiry.other,
                design: inquiry.design_data || null,   // ADD THIS LINE
              },
            },
          },
        },
        include: { items: true },
      });

      const updatedInquiry = await tx.inquiry.update({
        where: { id: inquiryId },
        data: { status: "converted", order_id: order.id },
      });

      return { order, updatedInquiry };
    });

    await logActivity({
      actor: req.actor,
      action: "converted",
      module: "inquiries",
      description: `Converted inquiry #${inquiryId} to order #${order.id}`,
      metadata: { inquiryId, orderId: order.id },
    });

    res.json({
      message: "Inquiry converted to order",
      orderId: order.id,
      order,
      inquiry: updatedInquiry,
    });

  } catch (e) {
    console.error("Inquiry convert failed:", e);
    res.status(500).json({ message: "Failed to convert inquiry" });
  }
});

// =================================================
// PRODUCTS API
// =================================================

// GET all products with pagination
app.get("/api/products", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const products = await prisma.product.findMany({
      where: { active: true, deleted_at: null },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.product.count({
      where: { active: true, deleted_at: null },
    });

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// GET single product by ID
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { orderItems: true },
    });

    if (!product || product.deleted_at) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch product" });
  }
});

// GET low-stock products (admin dashboard)
app.get("/api/admin/low-stock", async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const products = await prisma.product.findMany({
      where: {
        active: true,
        deleted_at: null,
        stock: { lte: threshold },
      },
      orderBy: { stock: "asc" },
      skip,
      take: limit,
    });

    const total = await prisma.product.count({
      where: { active: true, deleted_at: null, stock: { lte: threshold } },
    });

    const outOfStockCount = await prisma.product.count({
      where: { active: true, deleted_at: null, stock: 0 },
    });

    res.json({
      products,
      outOfStockCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch low-stock products" });
  }
});

// CREATE new product (admin only)
app.post("/api/products", async (req, res) => {
  try {
    const {
      name,
      sku,
      description,
      price,
      currency,
      stock,
      width_mm,
      height_mm,
      depth_mm,
      material,
      colorOptions,
      color_options,
      size_options,
      material_options,
      side_options,
      finishing_options,
      processing_options,
      delivery_options,
      quantity_options,
      shipping_options,
      quantity_mode,
      quantity_count,
      print_type,
      turnaround_hours,
      ai_prompt_rules,
      print_zones,
      category,
      images,
      substrateMaterialName,
      substrateUsagePerUnit,
      inkColorChannel,
      inkUsagePerUnit,
      mockupViews,
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        description,
        price: parseFloat(price),
        currency: currency || "PHP",
        stock: parseInt(stock) || 0,
        width_mm: width_mm ? parseInt(width_mm) : null,
        height_mm: height_mm ? parseInt(height_mm) : null,
        depth_mm: depth_mm ? parseInt(depth_mm) : null,
        material,
        colorOptions: colorOptions || color_options || [],
        color_options: color_options || colorOptions || [],
        size_options: size_options || [],
        material_options: material_options || [],
        side_options: side_options || [],
        finishing_options: finishing_options || [],
        processing_options: processing_options || [],
        delivery_options: delivery_options || [],
        quantity_options: quantity_options || [],
        ...(quantity_mode !== undefined && { quantity_mode }),
        ...(quantity_count !== undefined && {
          quantity_count:
            quantity_count === null ? null : parseInt(quantity_count),
        }),
        shipping_options: shipping_options || [],
        print_type,
        turnaround_hours: turnaround_hours ? parseInt(turnaround_hours) : null,
        ai_prompt_rules: ai_prompt_rules || null,
        print_zones: print_zones || [],
        category: category || "other",
        images: images || [],
        active: true,
        substrateMaterialName: substrateMaterialName || null,
        substrateUsagePerUnit: substrateUsagePerUnit ? parseFloat(substrateUsagePerUnit) : null,
        inkColorChannel: inkColorChannel || null,
        inkUsagePerUnit: inkUsagePerUnit ? parseFloat(inkUsagePerUnit) : null,
        mockupViews: mockupViews || null,
      },
    });

    await logActivity({
      actor: req.actor,
      action: "created",
      module: "products",
      description: `Created product "${product.name}" (SKU: ${product.sku || "—"})`,
      metadata: { productId: product.id },
    });

    res.status(201).json({ message: "Product created", product });
  } catch (e) {
    console.error(e);
    if (e.code === "P2002") {
      return res.status(400).json({ message: "SKU already exists" });
    }
    res.status(500).json({ message: "Failed to create product" });
  }
});

// UPDATE product (admin only)
app.put("/api/products/:id", async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      currency,
      stock,
      width_mm,
      height_mm,
      depth_mm,
      material,
      colorOptions,
      color_options,
      size_options,
      material_options,
      side_options,
      finishing_options,
      processing_options,
      delivery_options,
      quantity_options,
      shipping_options,
      print_type,
      turnaround_hours,
      ai_prompt_rules,
      print_zones,
      category,
      images,
      active,
      sku,
      quantity_mode,
      quantity_count,
      substrateMaterialName,
      substrateUsagePerUnit,
      inkColorChannel,
      inkUsagePerUnit,
      mockupViews,
    } = req.body;

    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(sku !== undefined && { sku }),
        ...(description !== undefined && { description }),
        ...(price && { price: parseFloat(price) }),
        ...(currency && { currency }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(width_mm !== undefined && {
          width_mm: width_mm ? parseInt(width_mm) : null,
        }),
        ...(height_mm !== undefined && {
          height_mm: height_mm ? parseInt(height_mm) : null,
        }),
        ...(depth_mm !== undefined && {
          depth_mm: depth_mm ? parseInt(depth_mm) : null,
        }),
        ...(material !== undefined && { material }),
        ...(colorOptions !== undefined && { colorOptions }),
        ...(color_options !== undefined && { color_options }),
        ...(size_options !== undefined && { size_options }),
        ...(material_options !== undefined && { material_options }),
        ...(side_options !== undefined && { side_options }),
        ...(finishing_options !== undefined && { finishing_options }),
        ...(processing_options !== undefined && { processing_options }),
        ...(delivery_options !== undefined && { delivery_options }),
        ...(quantity_options !== undefined && { quantity_options }),
        ...(quantity_mode !== undefined && { quantity_mode }),
        ...(quantity_count !== undefined && {
          quantity_count:
            quantity_count === null ? null : parseInt(quantity_count),
        }),
        ...(shipping_options !== undefined && { shipping_options }),
        ...(print_type && { print_type }),
        ...(turnaround_hours !== undefined && {
          turnaround_hours: turnaround_hours
            ? parseInt(turnaround_hours)
            : null,
        }),
        ...(images !== undefined && { images }),
        ...(ai_prompt_rules !== undefined && { ai_prompt_rules }),
        ...(print_zones !== undefined && { print_zones }),
        ...(category !== undefined && { category }),
        ...(active !== undefined && { active }),
        ...(substrateMaterialName !== undefined && { substrateMaterialName: substrateMaterialName || null }),
        ...(substrateUsagePerUnit !== undefined && {
          substrateUsagePerUnit: substrateUsagePerUnit ? parseFloat(substrateUsagePerUnit) : null,
        }),
        ...(inkColorChannel !== undefined && { inkColorChannel: inkColorChannel || null }),
        ...(inkUsagePerUnit !== undefined && {
          inkUsagePerUnit: inkUsagePerUnit ? parseFloat(inkUsagePerUnit) : null,
        }),
        ...(mockupViews !== undefined && { mockupViews }),
      },
    });

    await logActivity({
      actor: req.actor,
      action: "updated",
      module: "products",
      description: `Updated product "${product.name}"`,
      metadata: { productId: product.id },
    });

    res.json({ message: "Product updated", product });
  } catch (e) {
    console.error(e);
    if (e.code === "P2025") {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(500).json({ message: "Failed to update product" });
  }
});

// POST /api/products/:id/add-stock — increment stock atomically and optionally update quantity_options
app.post("/api/products/:id/add-stock", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { add, quantity_options } = req.body;

    const inc = parseInt(add);
    if (!inc || isNaN(inc) || inc <= 0)
      return res.status(400).json({ message: "Invalid add amount" });

    const updateData = {
      stock: { increment: inc },
    };
    if (quantity_options !== undefined)
      updateData.quantity_options = quantity_options;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      actor: req.actor,
      action: "stock_added",
      module: "products",
      description: `Added ${inc} to stock of "${product.name}" (new stock: ${product.stock})`,
      metadata: { productId: product.id, added: inc },
    });

    res.json({ message: "Stock updated", product });
  } catch (e) {
    console.error(e);
    if (e.code === "P2025")
      return res.status(404).json({ message: "Product not found" });
    res.status(500).json({ message: "Failed to add stock" });
  }
});

// UPLOAD product image
const PRODUCT_MAX_UPLOAD_SIZE = 3 * 1024 * 1024; // 3 MB
const productUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PRODUCT_MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);
    if (allowed.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
  },
});

app.post(
  "/api/products/upload",
  productUpload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file provided" });

    try {
      const { data: existing } =
        await supabase.storage.getBucket("printhub_s3");
      if (!existing) {
        const { error: bucketErr } = await supabase.storage.createBucket(
          "printhub_s3",
          {
            public: true,
            fileSizeLimit: PRODUCT_MAX_UPLOAD_SIZE,
          },
        );
        if (bucketErr)
          throw new Error(`Cannot create storage bucket: ${bucketErr.message}`);
      }

      const ext = req.file.mimetype.split("/")[1] || "jpg";
      const path = `products/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("printhub_s3")
        .upload(path, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (error) throw new Error(`Storage upload failed: ${error.message}`);

      const { data: urlData } = supabase.storage
        .from("printhub_s3")
        .getPublicUrl(path);

      return res.status(201).json({
        url: urlData.publicUrl,
        path,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (e) {
      console.error("Product upload error:", e.message);
      return res.status(500).json({ message: e.message || "Upload failed" });
    }
  },
);

// Multer error handler for product upload
app.use((err, req, res, next) => {
  if (
    err instanceof multer.MulterError &&
    req.path === "/api/products/upload"
  ) {
    return res.status(400).json({ message: err.message });
  }
  if (err && req.path === "/api/products/upload") {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// DELETE product (soft delete via deleted_at field)
app.delete("/api/products/:id", async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: { deleted_at: new Date() },
    });

    await logActivity({
      actor: req.actor,
      action: "deleted",
      module: "products",
      description: `Deleted product "${product.name}"`,
      metadata: { productId: product.id },
    });

    res.json({ message: "Product deleted", product });
  } catch (e) {
    console.error(e);
    if (e.code === "P2025") {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(500).json({ message: "Failed to delete product" });
  }
});

// =================================================
// ORDERS API
// =================================================

// GET order by ID
app.get("/api/orders/:id", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        items: {
          include: { product: true },
        },
        user: true,
      },
    });

    if (!order || order.deleted_at) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

// UPDATE order status
app.put("/api/orders/:id", async (req, res) => {
  try {
    const {
      status,
      proofApproved,
      due_date,
      shipping_address,
      billing_address,
    } = req.body;

    const orderId = parseInt(req.params.id);

    // Fetch existing order to check current status
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Order not found" });
    }

    let totalPcsUpdated = 0;
    let stockChanged = false;
    let actionType = "";

    if (status && status !== existing.status) {
      if (status === "cancelled" && existing.status !== "cancelled") {
        stockChanged = true;
        actionType = "restored";
      } else if (existing.status === "cancelled" && status !== "cancelled") {
        stockChanged = true;
        actionType = "deducted";
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      if (stockChanged) {
        for (const item of existing.items) {
          const lineQty = Number(item.quantity || 1);
          const pcsPerItem = extractPcsFromCustomizations(item.customizations);
          const pcsCount = pcsPerItem * lineQty;
          totalPcsUpdated += pcsCount;

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                [actionType === "restored" ? "increment" : "decrement"]:
                  pcsCount,
              },
            },
          });
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          ...(status && { status }),
          ...(status === "cancelled" && { payment_status: "cancelled" }),
          ...(status === "delivered" && { delivered_at: new Date() }),
          ...(proofApproved !== undefined && { proofApproved }),
          ...(due_date && { due_date: new Date(due_date) }),
          ...(shipping_address && { shipping_address }),
          ...(billing_address && { billing_address }),
        },
        include: { items: true, user: true },
      });

      // When admin cancels an order, mark linked inquiries closed
      if (status === "cancelled") {
        await tx.inquiry.updateMany({
          where: { order_id: orderId },
          data: { status: "closed" },
        });
      }

      return updatedOrder;
    });

    if (actionType === "deducted" && existing.items) {
      const productIds = existing.items.map((item) => item.productId);
      const uniqueProductIds = [...new Set(productIds)];
      if (uniqueProductIds.length > 0) {
        // Trigger notification asynchronously
        notifyLowStockProducts(uniqueProductIds).catch((err) =>
          console.error(
            `[PutOrder] {NotifyLowStock}: ${err.message}`
          )
        );
      }
    }

    const notification = status ? await notifyOrderStatus(order, status) : null;
    if (status && order.userId) {
      await createNotification({
        userId: order.userId,
        title: `Order #${order.id} updated`,
        body: `Your order status is now "${ORDER_STATUS_LABELS[status] || status}".`,
        type: "order_status",
        link: `/orders/${order.id}`,
      });
    }

    await logActivity({
      actor: req.actor,
      action: "status_changed",
      module: "orders",
      description: `Order #${order.id} status changed to "${order.status}"`,
      metadata: { orderId: order.id, previousStatus: existing.status },
    });

    res.json({
      message: "Order updated",
      order,
      notification,
      stockRestored: actionType === "restored" ? totalPcsUpdated : 0,
      stockDeducted: actionType === "deducted" ? totalPcsUpdated : 0,
    });
  } catch (e) {
    console.error(`[PutOrder] {UpdateStatus}: ${e.message}`);
    if (e.code === "P2025") {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(500).json({ message: "Failed to update order" });
  }
});

app.post("/api/orders/:id/onsite-payment", async (req, res) => {
  try {
    const { payment_reference } = req.body || {};
    const existing = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { id: true, proofApproved: true, deleted_at: true, total: true, amountPaid: true, isBulkOrder: true },
    });
    if (!existing || existing.deleted_at) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!existing.proofApproved) {
      return res.status(403).json({
        message:
          "Design approval is required before recording payment for this order.",
      });
    }

    const requiredAmount = getRequiredPaymentAmount(existing);
    const newAmountPaid = parseFloat(existing.amountPaid || 0) + requiredAmount;
    const isFullyPaid = newAmountPaid >= parseFloat(existing.total);

    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: {
        payment_status: isFullyPaid ? "paid" : "partially_paid",
        status: "confirmed",
        payment_method: "onsite",
        payment_reference:
          payment_reference || `ONSITE-${Date.now()}-${req.params.id}`,
        amountPaid: newAmountPaid,
      },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });
    const paymentNotification = await notifyPaymentConfirmation(order);
    const statusNotification = await notifyOrderStatus(order, "confirmed");
    const emailSent = paymentNotification?.status === "sent";

    await logActivity({
      actor: req.actor,
      action: "payment_recorded",
      module: "orders",
      description: `Recorded onsite payment for order #${order.id}`,
      metadata: { orderId: order.id, paymentReference: order.payment_reference },
    });

    res.json({
      message: "Order marked as paid onsite",
      order,
      receipt: buildReceiptPayload(order, "paid", emailSent),
      notifications: [paymentNotification, statusNotification],
    });
  } catch (e) {
    console.error(e);
    if (e.code === "P2025") {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(500).json({ message: "Failed to record onsite payment" });
  }
});

app.post("/api/orders/:id/approve-design", async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: {
        proofApproved: true,
        productionStatus: "AWAITING_PAYMENT",
      },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });
    const notification = await notifyDesignApproval(order);

    if (order.userId) {
      await createNotification({
        userId: order.userId,
        title: `Design approved — Order #${order.id}`,
        body: `Your design has been approved. You can now proceed with payment.`,
        type: "design_approved",
        link: `/orders/${order.id}`,
      });
    }

    await logActivity({
      actor: req.actor,
      action: "design_approved",
      module: "orders",
      description: `Approved design proof for order #${order.id}`,
      metadata: { orderId: order.id },
    });

    res.json({
      message: "Design approved. Customer can now pay.",
      order,
      notification,
    });
  } catch (e) {
    console.error(e);
    if (e.code === "P2025") {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(500).json({ message: "Failed to approve design" });
  }
});

// MARK order as delivered
app.patch("/api/orders/:id/deliver", async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: "delivered",
        delivered_at: new Date(),
      },
      include: { items: true, user: true },
    });

    const notification = await notifyOrderStatus(order, "delivered");

    await logActivity({
      actor: req.actor,
      action: "delivered",
      module: "orders",
      description: `Marked order #${order.id} as delivered`,
      metadata: { orderId: order.id },
    });

    res.json({ message: "Order marked as delivered", order, notification });
  } catch (e) {
    console.error(e);
    if (e.code === "P2025") {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(500).json({ message: "Failed to deliver order" });
  }
});

// DELETE order (soft delete) - restore stock
app.delete("/api/orders/:id", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    // Fetch order with items before deletion
    const orderToDelete = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!orderToDelete) {
      return res.status(404).json({ message: "Order not found" });
    }

    let totalPcsRestored = 0;
    for (const item of orderToDelete.items) {
      const lineQty = Number(item.quantity || 1);
      const pcsPerItem = extractPcsFromCustomizations(item.customizations);
      totalPcsRestored += pcsPerItem * lineQty;
    }

    // Restore stock and delete order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Restore stock for all items using requested stock count
      for (const item of orderToDelete.items) {
        const lineQty = Number(item.quantity || 1);
        const pcsPerItem = extractPcsFromCustomizations(item.customizations);
        const restoredStock = pcsPerItem * lineQty;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: restoredStock } },
        });
      }

      // Soft delete the order
      const deletedOrder = await tx.order.update({
        where: { id: orderId },
        data: { deleted_at: new Date() },
        include: { items: true, user: true },
      });

      await tx.inquiry.updateMany({
        where: { order_id: orderId },
        data: { status: "closed" },
      });

      return deletedOrder;
    });

    console.log(`✅ Order ${orderId} deleted and stock restored`);
    await logActivity({
      actor: req.actor,
      action: "deleted",
      module: "orders",
      description: `Deleted order #${orderId}`,
      metadata: { orderId },
    });
    res.json({
      message: "Order deleted and stock restored",
      order,
      totalPcsRestored,
    });
  } catch (e) {
    console.error(e);
    if (e.code === "P2025") {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(500).json({ message: "Failed to delete order" });
  }
});

// DELETE order item - restore stock for that product
app.delete("/api/orders/:orderId/items/:itemId", async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const itemId = parseInt(req.params.itemId);

    // Fetch item before deletion
    const itemToDelete = await prisma.orderItem.findUnique({
      where: { id: itemId },
    });

    if (!itemToDelete) {
      return res.status(404).json({ message: "Order item not found" });
    }

    // Delete item and restore stock in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Restore stock using requested stock count
      const lineQty = Number(itemToDelete.quantity || 1);
      const pcsPerItem = extractPcsFromCustomizations(
        itemToDelete.customizations,
      );
      const restoredStock = pcsPerItem * lineQty;

      await tx.product.update({
        where: { id: itemToDelete.productId },
        data: { stock: { increment: restoredStock } },
      });

      // Delete the item
      await tx.orderItem.delete({ where: { id: itemId } });

      // Recalculate order total
      const items = await tx.orderItem.findMany({ where: { orderId } });
      const newTotal = items.reduce(
        (sum, item) => sum + parseFloat(item.total_price),
        0,
      );

      return await tx.order.update({
        where: { id: orderId },
        data: { total: newTotal },
        include: { items: true, user: true },
      });
    });

    console.log(`✅ Item ${itemId} removed and stock restored`);

    await logActivity({
      actor: req.actor,
      action: "item_removed",
      module: "orders",
      description: `Removed item #${itemId} from order #${orderId} and restored stock`,
      metadata: { orderId, itemId },
    });

    res.json({
      message: "Item removed from order and stock restored",
      order: updatedOrder,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to remove item" });
  }
});

// =================================================
// AI BUILDER API
// =================================================
const BUILDER_BUCKET = "printhub_s3";
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const GENERATION_COOLDOWN_MS = 30_000; // 30 s per user
const generationCooldown = {}; // ownerKey -> lastGeneratedAt (ms)

// Multer: memory storage, size + type guard
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
    }
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
    // Bucket exists but is private — make it public
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

// POST /api/builder/upload — upload a source asset to Supabase storage
app.post("/api/builder/upload", upload.single("file"), async (req, res) => {
  const userId = getUserId(req);
  const rawOwner = userId
    ? String(userId)
    : req.headers["x-forwarded-for"] || req.ip || "guest";
  const ownerKey = String(rawOwner).replace(/[^a-zA-Z0-9_-]/g, "_");

  if (!req.file) return res.status(400).json({ message: "No file provided" });

  try {
    await ensureBucket();

    const { description } = req.body;
    const ext = req.file.mimetype.split("/")[1] || "jpg";
    const path = userId
      ? `uploads/${userId}/${Date.now()}.${ext}`
      : `uploads/guest/${ownerKey}/${Date.now()}.${ext}`;

    if (description) {
      console.log(`📤 Builder upload: owner=${ownerKey}${userId ? ` (userId=${userId})` : " (guest)"}, description="${description.slice(0, 80)}..."`);
    }

    const { error } = await supabase.storage
      .from(BUILDER_BUCKET)
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage
      .from(BUILDER_BUCKET)
      .getPublicUrl(path);

    return res.status(201).json({
      url: urlData.publicUrl,
      path,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (e) {
    console.error("Builder upload error:", e.message);
    return res.status(500).json({ message: e.message || "Upload failed" });
  }
});

// POST /api/builder/migrate-guest-designs — migrate guest designs to user storage
app.post("/api/builder/migrate-guest-designs", async (req, res) => {
  const { userId, designs } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  if (!designs || !Array.isArray(designs)) {
    return res.status(400).json({ message: "designs array is required" });
  }

  try {
    await ensureBucket();
    const migrated = [];

    for (const design of designs) {
      const { imageUrl } = design;
      if (!imageUrl) continue;

      try {
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) {
          console.warn(`[Migrate] Fetch failed: ${imageUrl}`);
          continue;
        }

        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        const ext = imageUrl.includes(".png") ? "png" : "jpg";
        const path = `uploads/${userId}/${Date.now()}-${Math.floor(
          Math.random() * 1000
        )}.${ext}`;

        const { error } = await supabase.storage
          .from(BUILDER_BUCKET)
          .upload(path, imgBuffer, {
            contentType: ext === "png" ? "image/png" : "image/jpeg",
            upsert: false,
          });

        if (error) {
          console.error(`[Migrate] Upload error: ${error.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from(BUILDER_BUCKET)
          .getPublicUrl(path);

        migrated.push({
          originalUrl: imageUrl,
          migratedUrl: urlData.publicUrl,
          path,
        });
      } catch (err) {
        console.error(`[Migrate] Error migrating ${imageUrl}:`, err);
      }
    }

    return res.json({ message: "Migration completed", migrated });
  } catch (e) {
    console.error("Migration wrapper error:", e);
    return res.status(500).json({ message: "Migration failed" });
  }
});

// POST /api/builder/upload-url — download remote image and upload to Supabase
app.post("/api/builder/upload-url", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ message: "imageUrl is required" });
  }

  try {
    await ensureBucket();
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return res.status(400).json({ message: "Failed to fetch image" });
    }

    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const ext = imageUrl.includes(".png") ? "png" : "jpg";
    const path = `uploads/${userId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUILDER_BUCKET)
      .upload(path, imgBuffer, {
        contentType: ext === "png" ? "image/png" : "image/jpeg",
        upsert: false,
      });

    if (error) throw new Error(error.message);

    const { data: urlData } = supabase.storage
      .from(BUILDER_BUCKET)
      .getPublicUrl(path);

    return res.status(201).json({ url: urlData.publicUrl, path });
  } catch (e) {
    console.error("Upload URL error:", e);
    return res.status(500).json({ message: "Upload from URL failed" });
  }
});

// Avatar upload (2 MB)
const AVATAR_MAX_UPLOAD_SIZE = 2 * 1024 * 1024; // 2 MB
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
  },
});

app.post(
  "/api/user/avatar-upload",
  avatarUpload.single("file"),
  async (req, res) => {
    const userId = getUserId(req);
    if (!userId)
      return res
        .status(401)
        .json({ message: "Authentication required: send X-User-Id header" });

    if (!req.file) return res.status(400).json({ message: "No file provided" });

    try {
      await ensureBucket();

      const ext = req.file.mimetype.split("/")[1] || "jpg";
      const path = `avatars/${userId}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from(BUILDER_BUCKET)
        .upload(path, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (error) throw new Error(`Storage upload failed: ${error.message}`);

      const { data: urlData } = supabase.storage
        .from(BUILDER_BUCKET)
        .getPublicUrl(path);

      return res.status(201).json({
        url: urlData.publicUrl,
        path,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (e) {
      console.error("Avatar upload error:", e.message);
      return res.status(500).json({ message: e.message || "Upload failed" });
    }
  },
);

// Multer error handler for builder and avatar upload
app.use((err, req, res, next) => {
  if (
    err instanceof multer.MulterError ||
    (err &&
      ALLOWED_MIME !== undefined &&
      (req.path === "/api/builder/upload" ||
        req.path === "/api/user/avatar-upload"))
  ) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// POST /api/builder/generate-image — generate a 2D design image via fal.ai and store in Supabase
app.post("/api/builder/generate-image", async (req, res) => {
  const userId = getUserId(req);
  const rawOwner = userId
    ? String(userId)
    : req.headers["x-forwarded-for"] || req.ip || "guest";
  const ownerKey = String(rawOwner).replace(/[^a-zA-Z0-9_-]/g, "_");

  const { prompt, imageSize } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0)
    return res.status(400).json({ message: "prompt is required" });
  if (prompt.trim().length > 2000)
    return res
      .status(400)
      .json({ message: "prompt must be 2000 characters or fewer" });

  // Per-user cooldown (shared with 3D generation)
  const now = Date.now();
  const last = generationCooldown[ownerKey] || 0;
  const remaining = GENERATION_COOLDOWN_MS - (now - last);
  if (remaining > 0) {
    return res.status(429).json({
      message: `Please wait ${Math.ceil(remaining / 1000)} seconds before generating again`,
      retryAfterMs: remaining,
    });
  }
  generationCooldown[ownerKey] = now;

  try {
    console.log(
      `🎨 Builder generate-image (2D): owner=${ownerKey}${userId ? ` (userId=${userId})` : " (guest)"}, prompt="${prompt.slice(0, 80)}..."`,
    );

    // Append system-level prompt guidelines to avoid copyrighted content
    // and guide the generation to a transparent/white background graphic.
    const guidelines =
      "flat vector graphic design, isolated subject on transparent " +
      "or white background, no copyrighted characters, no trademarked logos, " +
      "print-ready artwork, high contrast, clean edges";

    const finalPrompt = `${prompt.trim()}, ${guidelines}`;

    const result = await generateImage({
      prompt: finalPrompt,
      imageSize: imageSize || "square_hd",
    });

    console.log(`✅ Generated 2D image (CDN direct)`);
    return res.json({
      imageUrl: result.url,
      width: result.width,
      height: result.height,
      prompt: prompt.trim(),
      stored: false,
      path: null,
    });
  } catch (e) {
    delete generationCooldown[ownerKey];
    console.error("Builder generate-image error:", e.message);
    return res
      .status(500)
      .json({ message: e.message || "Image generation failed" });
  }
});

// POST /api/builder/generate — generate a 3D model via Meshy and store in Supabase
app.post("/api/builder/generate", async (req, res) => {
  const userId = getUserId(req);
  // allow guests: derive an ownerKey for cooldown/storage (prefer userId when present)
  const rawOwner = userId
    ? String(userId)
    : req.headers["x-forwarded-for"] || req.ip || "guest";
  // sanitize owner key for use in storage paths and map keys
  const ownerKey = String(rawOwner).replace(/[^a-zA-Z0-9_-]/g, "_");

  const { prompt, quality, productId } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0)
    return res.status(400).json({ message: "prompt is required" });

  if (prompt.trim().length > 2000)
    return res
      .status(400)
      .json({ message: "prompt must be 2000 characters or fewer" });

  // Per-user cooldown
  const now = Date.now();
  const last = generationCooldown[ownerKey] || 0;
  const remaining = GENERATION_COOLDOWN_MS - (now - last);
  if (remaining > 0) {
    return res.status(429).json({
      message: `Please wait ${Math.ceil(remaining / 1000)} seconds before generating again`,
      retryAfterMs: remaining,
    });
  }

  generationCooldown[ownerKey] = now;

  try {
    console.log(
      `🎨 Builder generate (3D): owner=${ownerKey}${userId ? ` (userId=${userId})` : " (guest)"}, productId=${productId || "N/A"}, prompt="${prompt.slice(0, 80)}..."`,
    );

    // Call Meshy text-to-3D
    const { glbUrl, meshyTaskId } = await generateModelFromText({
      prompt: prompt.trim(),
      quality: quality || "standard",
    });

    console.log(`✅ Generated 3D model (Meshy direct)`);
    return res.json({
      glbUrl,
      meshyUrl: glbUrl,
      meshyTaskId,
      stored: false,
      path: null,
    });
  } catch (e) {
    // Reset cooldown on failure so user can retry
    delete generationCooldown[ownerKey];
    console.error("Builder generate (3D) error:", e.message);
    return res
      .status(500)
      .json({ message: e.message || "3D generation failed" });
  }
});

// POST /api/builder/generate-from-image — generate a 3D model from uploaded image via Meshy
app.post("/api/builder/generate-from-image", async (req, res) => {
  const userId = getUserId(req);
  const rawOwner = userId
    ? String(userId)
    : req.headers["x-forwarded-for"] || req.ip || "guest";
  const ownerKey = String(rawOwner).replace(/[^a-zA-Z0-9_-]/g, "_");

  const { imageUrl, description, quality } = req.body;
  if (
    !imageUrl ||
    typeof imageUrl !== "string" ||
    imageUrl.trim().length === 0
  ) {
    return res.status(400).json({ message: "imageUrl is required" });
  }

  // Per-user cooldown
  const now = Date.now();
  const last = generationCooldown[ownerKey] || 0;
  const remaining = GENERATION_COOLDOWN_MS - (now - last);
  if (remaining > 0) {
    return res.status(429).json({
      message: `Please wait ${Math.ceil(remaining / 1000)} seconds before generating again`,
      retryAfterMs: remaining,
    });
  }

  generationCooldown[ownerKey] = now;

  try {
    console.log(
      `🎨 Builder generate-from-image: owner=${ownerKey}${userId ? ` (userId=${userId})` : " (guest)"}, image=${imageUrl.slice(0, 60)}...${description ? ` description="${description.slice(0, 60)}..."` : ""}`,
    );

    // Call Meshy image-to-3D
    const { glbUrl, meshyTaskId } = await generateModelFromImage({
      imageUrl: imageUrl.trim(),
      description: description ? description.trim() : undefined,
      quality: quality || "standard",
    });

    console.log(`✅ Generated 3D model from image (Meshy direct)`);
    return res.json({
      glbUrl,
      meshyUrl: glbUrl,
      meshyTaskId,
      stored: false,
      path: null,
    });
  } catch (e) {
    delete generationCooldown[ownerKey];
    console.error("Builder generate-from-image error:", e.message);
    return res
      .status(500)
      .json({ message: e.message || "3D generation from image failed" });
  }
});

// POST /api/builder/generate-3d — wrap design image as texture on 3D object
app.post("/api/builder/generate-3d", async (req, res) => {
  const userId = getUserId(req);
  const { prompt, designImageUrl } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ message: "prompt is required" });
  }

  if (!designImageUrl) {
    return res.status(400).json({ message: "designImageUrl is required" });
  }

  try {
    console.log(
      `🎭 Builder generate-3d: userId=${userId || "guest"}, prompt="${prompt.slice(0, 80)}..."`,
    );

    // Return design image wrapped as a 3D textured object
    // Frontend will create a 3D scene with this image as a texture on a cube
    return res.json({
      message: "3D scene ready",
      type: "textured-cube",
      textureUrl: designImageUrl,
      prompt: prompt.trim(),
    });
  } catch (e) {
    console.error("Builder generate-3d error:", e.message);
    return res.status(500).json({
      message: e.message || "3D generation failed",
    });
  }
});

// =================================================
// PAYMONGO PAYMENT API
// =================================================

// POST /api/payments/checkout — create a PayMongo Checkout Session for an order
app.get("/api/user/:id/payment-logs", async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ message: "Invalid userId" });

  try {
    // Retrieve only orders that are not cancelled
    const orders = await prisma.order.findMany({
      where: {
        userId,
        deleted_at: null,
        status: { not: "cancelled" },
      },
      include: {
        user: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(orders.map((order) => buildReceiptPayload(order)));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch payment logs" });
  }
});

app.get("/api/orders/:id/receipt", async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId))
    return res.status(400).json({ message: "Invalid orderId" });

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });

    if (!order || order.deleted_at) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(buildReceiptPayload(order));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch receipt" });
  }
});

// GET /api/orders/:id/payment-summary — payment breakdown for order-detail UI
app.get("/api/orders/:id/payment-summary", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!order || order.deleted_at) {
      return res.status(404).json({ message: "Order not found" });
    }

    const total = parseFloat(order.total);
    const amountPaid = parseFloat(order.amountPaid || 0);
    const remaining = Math.max(total - amountPaid, 0);

    res.json({
      total,
      amountPaid,
      remaining,
      isBulkOrder: order.isBulkOrder,
      paymentStatus: order.payment_status,
      requiredNow: getRequiredPaymentAmount(order),
      phaseLabel: getPaymentPhaseLabel(order),
      isFullyPaid: remaining <= 0,
    });
  } catch (e) {
    console.error("Payment summary error:", e.message);
    res.status(500).json({ message: "Failed to fetch payment summary" });
  }
});

// GET /api/orders/:id/invoice — downloadable PDF invoice
app.get("/api/orders/:id/invoice", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });

    if (!order || order.deleted_at) {
      return res.status(404).json({ message: "Order not found" });
    }

    const pdfBuffer = await generateInvoicePdf(order);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-order-${order.id}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    return res.send(pdfBuffer);
  } catch (e) {
    console.error("Invoice generation error:", e.message);
    return res.status(500).json({ message: "Failed to generate invoice" });
  }
});

app.post("/api/orders/:id/return-complaint", async (req, res) => {
  const orderId = parseInt(req.params.id);
  const { userId, reason, details } = req.body;

  if (isNaN(orderId))
    return res.status(400).json({ message: "Invalid orderId" });
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ message: "Complaint reason is required" });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });

    if (!order || order.deleted_at) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (userId && order.userId !== parseInt(userId)) {
      return res.status(403).json({ message: "Order does not belong to user" });
    }

    if (order.payment_status !== "paid" || order.status !== "delivered") {
      return res.status(400).json({
        message:
          "Return complaints can only be submitted after a paid order is delivered.",
      });
    }

    const {
      inquiry,
      updatedOrder,
      customerEmail,
      customerName,
    } = await createInquiryAndUpdateOrder(order, reason, details);

    const emailRes = await notifyReturnComplaintReceived(order, inquiry);
    const emailSent = emailRes?.status === "sent";

    res.status(201).json({
      message: "Return complaint submitted",
      inquiry,
      order: updatedOrder,
      emailSent,
      mockEmail: {
        to: customerEmail,
        subject: `Return complaint received - Order #${order.id}`,
        body:
          `Hi ${customerName}, we received your return complaint for ` +
          `Order #${order.id}. Our staff will review it in the admin ` +
          `inquiries module.`,
      },
    });
  } catch (e) {
    console.error("Return complaint failed:", e);
    res.status(500).json({ message: "Failed to submit return complaint" });
  }
});

app.post("/api/payments/checkout", async (req, res) => {
  const {
    orderId,
    appReturnBase,
    returnBase,
    paymentMethods,
    compactCheckout,
  } = req.body;
  if (!orderId) return res.status(400).json({ message: "orderId is required" });

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { items: { include: { product: true } } },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.payment_status === "paid") {
      return res.status(400).json({ message: "Order already paid" });
    }
    if (!order.proofApproved) {
      return res.status(403).json({
        message:
          "Your order is waiting for admin design approval before payment.",
      });
    }

    const requiredAmount = getRequiredPaymentAmount(order);
    if (requiredAmount <= 0) {
      return res.status(400).json({ message: "Order already paid in full" });
    }

    const publicFrontendUrl =
      process.env.FRONTEND_URL || "https://project-n80jh.vercel.app";
    const paymentReturnBase =
      appReturnBase ||
      returnBase ||
      process.env.PAYMENT_RETURN_BASE ||
      publicFrontendUrl;
    const buildPaymentReturnUrl = (status) => {
      const needsExtraSlash = /^[a-z][a-z0-9+.-]*:\/\/$/i.test(
        paymentReturnBase
      );
      const separator =
        needsExtraSlash || !paymentReturnBase.endsWith("/") ? "/" : "";
      return `${paymentReturnBase}${separator}payment/return?orderId=${order.id}&status=${status}`;
    };

    const lineItems = order.isBulkOrder
      ? generatePartialPaymentLineItem(
          order,
          requiredAmount,
          getPaymentPhaseLabel(order)
        )
      : generateLineItems(order, publicFrontendUrl, compactCheckout);

    const sessionPayload = order.isBulkOrder
      ? createPartialSessionPayload(
          order,
          lineItems,
          paymentMethods,
          buildPaymentReturnUrl
        )
      : createSessionPayload(
          order,
          lineItems,
          paymentMethods,
          buildPaymentReturnUrl
        );

    const pmData = await createCheckoutSession(sessionPayload);
    const sessionId = pmData.data.id;
    const intentId = pmData.data.attributes.payment_intent?.id || "";
    const compositeSessionId = intentId
      ? `${sessionId}:${intentId}`
      : sessionId;
    const checkoutUrl = pmData.data.attributes.checkout_url;

    // Save session info on the order
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymongo_session_id: compositeSessionId,
        checkout_url: checkoutUrl,
        payment_status: "awaiting_payment",
        pendingPaymentAmount: requiredAmount,
      },
    });

    res.json({ checkout_url: checkoutUrl, session_id: sessionId });
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({
      message: e.message || "Internal server error",
      details: e.details,
    });
  }
});

// GET /api/payments/:orderId/status — poll payment status (fallback for missed webhooks)
// POST /api/payments/qrph — create a live QR Ph code customers can scan with GCash/Maya/banks
app.post("/api/payments/qrph", async (req, res) => {
  const { orderId } = req.body || {};
  if (!orderId) return res.status(400).json({ message: "orderId is required" });

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.payment_status === "paid") {
      return res.status(400).json({ message: "Order already paid" });
    }
    if (!order.proofApproved) {
      return res.status(403).json({
        message:
          "Your order is waiting for admin design approval before payment.",
      });
    }

    const requiredAmount = getRequiredPaymentAmount(order);
    if (requiredAmount <= 0) {
      return res.status(400).json({ message: "Order already paid in full" });
    }

    const amount = Math.round(requiredAmount * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const { intentId, clientKey, qrImageUrl } = await createQrphPayment(
      order,
      amount
    );

    if (!qrImageUrl) {
      return res.status(502).json({
        message: "PayMongo did not return a QR code. Please try again.",
      });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymongo_session_id: intentId,
        checkout_url: null,
        payment_status: "awaiting_payment",
        payment_method: "qrph",
        pendingPaymentAmount: requiredAmount,
      },
    });

    res.json({
      order_id: order.id,
      amount,
      currency: "PHP",
      payment_intent_id: intentId,
      qr_image_url: qrImageUrl,
      expires_in_seconds: 30 * 60,
    });
  } catch (e) {
    console.error("PayMongo QR Ph error:", e.details || e);
    res.status(e.status || 500).json({
      message:
        e.message === "PayMongo request failed"
          ? "Failed to create PayMongo QR payment"
          : e.message || "Internal server error",
      details: e.details,
    });
  }
});

app.get("/api/payments/:orderId/status", async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  if (isNaN(orderId)) {
    return res.status(400).json({ message: "Invalid orderId" });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    // If already marked paid, failed, or expired in DB, return early
    if (["paid", "failed", "expired"].includes(order.payment_status)) {
      return res.json({
        payment_status: order.payment_status,
        order,
        receipt:
          order.payment_status === "paid"
            ? buildReceiptPayload(order)
            : undefined,
      });
    }

    // If we have a QR Ph Payment Intent, check PayMongo for the latest status
    if (order.paymongo_session_id?.startsWith("pi_")) {
      const pmData = await retrievePaymentIntent(order.paymongo_session_id);
      const attrs = pmData.data.attributes || {};
      const payments = Array.isArray(attrs.payments) ? attrs.payments : [];
      const paidPayment = payments.find((payment) => {
        const paymentStatus = payment?.attributes?.status;
        return paymentStatus === "paid" || paymentStatus === "succeeded";
      });

      if (attrs.status === "succeeded" || paidPayment) {
        const chargedAmount = order.pendingPaymentAmount != null
          ? parseFloat(order.pendingPaymentAmount)
          : parseFloat(order.total);
        const newAmountPaid = parseFloat(order.amountPaid || 0) + chargedAmount;
        const isFullyPaid = newAmountPaid >= parseFloat(order.total);

        const paidOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            payment_status: isFullyPaid ? "paid" : "partially_paid",
            status: "confirmed",
            payment_method:
              paidPayment?.attributes?.source?.type ||
              attrs.payment_method_allowed?.[0] ||
              "qrph",
            payment_reference: paidPayment?.id || order.paymongo_session_id,
            amountPaid: newAmountPaid,
            pendingPaymentAmount: null,
          },
          include: {
            user: true,
            items: { include: { product: true } },
          },
        });

        const paymentNotification =
          await notifyPaymentConfirmation(paidOrder);
        const statusNotification = await notifyOrderStatus(
          paidOrder,
          "confirmed"
        );
        const emailSent = paymentNotification?.status === "sent";

        return res.json({
          payment_status: paidOrder.payment_status,
          order: paidOrder,
          receipt: buildReceiptPayload(paidOrder, undefined, emailSent),
          notifications: [paymentNotification, statusNotification],
        });
      } else {
        // Check if there is a failed payment attempt
        const failedPayment = payments.find((payment) => {
          return payment?.attributes?.status === "failed";
        });

        const nextAction = attrs.next_action || {};
        const codeInfo = nextAction.code || {};
        const expiresAtStr = codeInfo.expires_at || null;
        const isExpired = expiresAtStr && new Date() > new Date(expiresAtStr);

        if (isExpired || attrs.status === "cancelled") {
          const expiredOrder = await prisma.order.update({
            where: { id: orderId },
            data: { payment_status: "expired" },
            include: { user: true, items: { include: { product: true } } },
          });
          await notifyPaymentFailed(expiredOrder);
          return res.json({ payment_status: "expired", order: expiredOrder });
        }

        if (failedPayment) {
          const failedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { payment_status: "failed" },
            include: { user: true, items: { include: { product: true } } },
          });
          await notifyPaymentFailed(failedOrder);
          return res.json({ payment_status: "failed", order: failedOrder });
        }
      }
    }

    // If we have a session ID, check PayMongo for the latest status
    if (
      order.paymongo_session_id &&
      !order.paymongo_session_id.startsWith("pi_")
    ) {
      try {
        const sessionId = order.paymongo_session_id.split(":")[0];
        console.log(
          "Checking checkout session status for session ID:",
          sessionId
        );
        const pmData = await retrieveCheckoutSession(sessionId);
        console.log(
          "PayMongo Checkout Session response:",
          JSON.stringify(pmData, null, 2)
        );

        const attrs = pmData.data.attributes;
        const pmStatus = attrs.payment_intent?.attributes?.status;
        const pmPaymentMethod = attrs.payment_method_used || null;
        const payments = Array.isArray(attrs.payments) ? attrs.payments : [];
        const hasPaidPayment = payments.some((payment) => {
          const paymentStatus = payment?.attributes?.status;
          return paymentStatus === "paid" || paymentStatus === "succeeded";
        });

        if (pmStatus === "succeeded" || hasPaidPayment) {
          // Retrieve payment reference from linked payments if available
          const reference =
            payments.length > 0 ? payments[0].id : order.paymongo_session_id;

          const chargedAmount = order.pendingPaymentAmount != null
            ? parseFloat(order.pendingPaymentAmount)
            : parseFloat(order.total);
          const newAmountPaid = parseFloat(order.amountPaid || 0) + chargedAmount;
          const isFullyPaid = newAmountPaid >= parseFloat(order.total);

          const paidOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
              payment_status: isFullyPaid ? "paid" : "partially_paid",
              status: "confirmed",
              payment_method: pmPaymentMethod,
              payment_reference: reference,
              amountPaid: newAmountPaid,
              pendingPaymentAmount: null,
            },
            include: {
              user: true,
              items: { include: { product: true } },
            },
          });

          const paymentNotification =
            await notifyPaymentConfirmation(paidOrder);
          const statusNotification = await notifyOrderStatus(
            paidOrder,
            "confirmed"
          );
          const emailSent = paymentNotification?.status === "sent";

          return res.json({
            payment_status: paidOrder.payment_status,
            order: paidOrder,
            receipt: buildReceiptPayload(paidOrder, undefined, emailSent),
            notifications: [paymentNotification, statusNotification],
          });
        } else {
          // Check if there is a failed payment attempt in the session
          const hasFailedPayment = payments.some((payment) => {
            return payment?.attributes?.status === "failed";
          });
          if (hasFailedPayment || pmStatus === "failed") {
            const failedOrder = await prisma.order.update({
              where: { id: orderId },
              data: { payment_status: "failed" },
              include: { user: true, items: { include: { product: true } } },
            });
            await notifyPaymentFailed(failedOrder);
            return res.json({ payment_status: "failed", order: failedOrder });
          }
        }
      } catch (sessionErr) {
        console.error("Failed to check checkout session:", sessionErr.message);
      }
    }

    res.json({ payment_status: order.payment_status, order });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/payments/webhook — PayMongo webhook handler
// Register this URL in app.paymongo.com → Developers → Webhooks
app.post(
  "/api/payments/webhook",
  async (req, res) => {
    // Acknowledge quickly to avoid PayMongo retrying
    res.sendStatus(200);

    try {
      const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
      const sigHeader = req.headers["paymongo-signature"];
      const rawBody = req.rawBody ? req.rawBody.toString() : "";

      const isValid = verifyWebhookSignature(
        rawBody,
        sigHeader,
        webhookSecret
      );
      if (!isValid) return;

      const payload = JSON.parse(rawBody);
      const eventType = payload?.data?.attributes?.type;
      const eventData = payload?.data?.attributes?.data;

      console.log(`PayMongo webhook received: ${eventType}`);

      const relevantEvents = [
        "checkout_session.payment.paid",
        "payment.paid",
        "payment.failed",
        "payment_intent.payment_failed",
        "qrph.expired",
      ];

      if (relevantEvents.includes(eventType)) {
        const attrs = eventData?.attributes || {};
        const metadata =
          attrs.metadata || eventData?.attributes?.metadata || {};
        let orderId =
          parseInt(metadata.order_id) ||
          parseInt(eventData?.attributes?.reference_number);

        if (!orderId) {
          const searchKey = attrs.payment_intent_id || eventData.id;
          if (searchKey) {
            const order = await prisma.order.findFirst({
              where: {
                OR: [
                  { paymongo_session_id: searchKey },
                  { paymongo_session_id: { contains: searchKey } },
                ],
              },
              select: { id: true },
            });
            orderId = order?.id;
          }
        }

        if (!orderId) {
          console.warn(
            `PayMongo webhook: no orderId found for event ${eventType}`
          );
          return;
        }

        if (
          eventType === "checkout_session.payment.paid" ||
          eventType === "payment.paid"
        ) {
          const paymentMethod =
            attrs.payment_method_type || attrs.source?.type || null;
          const paymentReference = eventData?.id || null;

          const orderForPayment = await prisma.order.findUnique({
            where: { id: orderId },
            select: { total: true, amountPaid: true, pendingPaymentAmount: true },
          });

          const chargedAmount = orderForPayment?.pendingPaymentAmount != null
            ? parseFloat(orderForPayment.pendingPaymentAmount)
            : parseFloat(orderForPayment?.total ?? 0);
          const newAmountPaid =
            parseFloat(orderForPayment?.amountPaid ?? 0) + chargedAmount;
          const isFullyPaid =
            newAmountPaid >= parseFloat(orderForPayment?.total ?? 0);

          const paidOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
              payment_status: isFullyPaid ? "paid" : "partially_paid",
              status: "confirmed",
              payment_method: paymentMethod,
              payment_reference: paymentReference,
              amountPaid: newAmountPaid,
              pendingPaymentAmount: null,
            },
            include: {
              user: true,
              items: { include: { product: true } },
            },
          });
          await notifyPaymentConfirmation(paidOrder);
          await notifyOrderStatus(paidOrder, "confirmed");

          console.log(`✅ Order #${orderId} marked as paid via PayMongo`);
        } else if (
          eventType === "payment.failed" ||
          eventType === "payment_intent.payment_failed"
        ) {
          const failedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { payment_status: "failed" },
            include: { user: true, items: { include: { product: true } } },
          });
          await notifyPaymentFailed(failedOrder);
          console.log(`❌ Order #${orderId} marked as failed via PayMongo`);
        } else if (eventType === "qrph.expired") {
          const expiredOrder = await prisma.order.update({
            where: { id: orderId },
            data: { payment_status: "expired" },
            include: { user: true, items: { include: { product: true } } },
          });
          await notifyPaymentFailed(expiredOrder);
          console.log(`⏰ Order #${orderId} marked as expired via PayMongo`);
        }
      }
    } catch (e) {
      console.error("PayMongo webhook processing error:", e);
    }
  }
);

// Start server. Run migrations only when explicitly requested.
(async () => {
  // Log PayMongo configuration status to help with live conversion
  function checkPaymongoConfig() {
    const key = process.env.PAYMONGO_SECRET_KEY || null;
    const webhook = process.env.PAYMONGO_WEBHOOK_SECRET || null;
    if (!key) {
      console.warn(
        "⚠️ PAYMONGO_SECRET_KEY is not set. Payments will fail until configured.",
      );
    } else if (key.startsWith("sk_live_") || key.startsWith("live_")) {
      console.log("✅ Using live PayMongo secret key");
    } else if (key.startsWith("sk_test_") || key.startsWith("test_")) {
      console.warn(
        "⚠️ Using PayMongo test key. Switch to live key for production.",
      );
    } else {
      console.log("PayMongo secret key appears set (unknown prefix)");
    }

    if (!webhook) {
      console.warn(
        "⚠️ PAYMONGO_WEBHOOK_SECRET is not set. Webhook signature verification disabled.",
      );
    }
  }

  checkPaymongoConfig();
  if (process.env.RUN_MIGRATIONS === "true") {
    try {
      // Run database migrations
      const { execSync } = require("child_process");
      console.log("Running Prisma migrations...");
      execSync("npx prisma migrate deploy", { stdio: "inherit" });
      console.log("Migrations completed");
    } catch (e) {
      console.log("Migration warning (may already be up to date):", e.message);
    }
  } else {
    console.log("Skipping Prisma migrations on startup.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
})();