const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "doctor-hub-local-development-secret";
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");

const VERCEL = !!process.env.VERCEL;
const DATA_DIR = VERCEL ? "/tmp" : path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const ROLES = {
  PATIENT: "patient",
  DOCTOR: "doctor",
  ASSISTANT: "assistant",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin"
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function now() {
  return new Date().toISOString();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, original] = stored.split(":");
  const candidate = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(original, "hex"));
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function signToken(payload) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 }));
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || token.split(".").length !== 3) return null;
  const [header, body, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function publicUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function canManage(user) {
  return [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user.role);
}

function isAssistantOrManager(user) {
  return [ROLES.ASSISTANT, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user.role);
}

async function readDb() {
  await ensureDb();
  return JSON.parse(await fsp.readFile(DB_FILE, "utf8"));
}

async function writeDb(db) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

let dbEnsured = false;
async function ensureDb() {
  if (dbEnsured) return;
  if (fs.existsSync(DB_FILE)) {
    dbEnsured = true;
    return;
  }
  await fsp.mkdir(DATA_DIR, { recursive: true });
  
  const bundledDbPath = path.join(ROOT, "data", "db.json");
  if (VERCEL && fs.existsSync(bundledDbPath)) {
    try {
      await fsp.copyFile(bundledDbPath, DB_FILE);
      console.log("Copied bundled db.json to /tmp/db.json");
      dbEnsured = true;
      return;
    } catch (err) {
      console.error("Failed to copy bundled db.json to /tmp/db.json, seeding instead", err);
    }
  }
  
  await writeDb(seedDatabase());
  dbEnsured = true;
}

function seedDatabase() {
  const createdAt = now();
  const users = [
    { id: "usr_patient", name: "Ali Patient", email: "patient@doctorhub.test", role: ROLES.PATIENT, phone: "0300-1111111", status: "active", passwordHash: hashPassword("password123"), createdAt },
    { id: "usr_doctor_allo", name: "Dr. Ayesha Khan", email: "doctor.allo@doctorhub.test", role: ROLES.DOCTOR, phone: "0300-2222221", status: "active", passwordHash: hashPassword("password123"), createdAt },
    { id: "usr_doctor_homeo", name: "Dr. Hamza Malik", email: "doctor.homeo@doctorhub.test", role: ROLES.DOCTOR, phone: "0300-2222222", status: "active", passwordHash: hashPassword("password123"), createdAt },
    { id: "usr_doctor_herbal", name: "Dr. Sara Javed", email: "doctor.herbal@doctorhub.test", role: ROLES.DOCTOR, phone: "0300-2222223", status: "active", passwordHash: hashPassword("password123"), createdAt },
    { id: "usr_assistant", name: "Clinic Assistant", email: "assistant@doctorhub.test", role: ROLES.ASSISTANT, phone: "0300-3333333", status: "active", passwordHash: hashPassword("password123"), createdAt },
    { id: "usr_admin", name: "System Admin", email: "admin@doctorhub.test", role: ROLES.ADMIN, phone: "0300-4444444", status: "active", passwordHash: hashPassword("password123"), createdAt },
    { id: "usr_super", name: "Super Admin", email: "superadmin@doctorhub.test", role: ROLES.SUPER_ADMIN, phone: "0300-5555555", status: "active", passwordHash: hashPassword("password123"), createdAt }
  ];

  const doctors = [
    {
      id: "doc_ayesha",
      userId: "usr_doctor_allo",
      name: "Dr. Ayesha Khan",
      treatmentType: "Allopathic",
      specialization: "Cardiology",
      diseases: ["heart pain", "blood pressure", "diabetes"],
      fee: 1800,
      rating: 4.8,
      experienceYears: 9,
      assistantId: "usr_assistant",
      schedule: ["Monday 05:00 PM - 09:00 PM", "Wednesday 05:00 PM - 09:00 PM", "Saturday 02:00 PM - 06:00 PM"],
      clinicIds: ["cln_central"]
    },
    {
      id: "doc_hamza",
      userId: "usr_doctor_homeo",
      name: "Dr. Hamza Malik",
      treatmentType: "Homeopathic",
      specialization: "Skin and Allergy",
      diseases: ["allergy", "eczema", "migraine"],
      fee: 1200,
      rating: 4.6,
      experienceYears: 7,
      assistantId: "usr_assistant",
      schedule: ["Tuesday 04:00 PM - 08:00 PM", "Friday 04:00 PM - 08:00 PM"],
      clinicIds: ["cln_north"]
    },
    {
      id: "doc_sara",
      userId: "usr_doctor_herbal",
      name: "Dr. Sara Javed",
      treatmentType: "Herbal",
      specialization: "Digestive Health",
      diseases: ["stomach pain", "liver weakness", "sleep issues"],
      fee: 1000,
      rating: 4.7,
      experienceYears: 6,
      assistantId: "usr_assistant",
      schedule: ["Monday 11:00 AM - 03:00 PM", "Thursday 11:00 AM - 03:00 PM"],
      clinicIds: ["cln_wellness"]
    }
  ];

  const clinics = [
    { id: "cln_central", doctorId: "doc_ayesha", name: "Central Care Clinic", city: "Lahore", address: "Main Boulevard, Gulberg", paymentAccount: "JazzCash 0300-2222221" },
    { id: "cln_north", doctorId: "doc_hamza", name: "North Homeo Clinic", city: "Islamabad", address: "F-8 Markaz", paymentAccount: "EasyPaisa 0300-2222222" },
    { id: "cln_wellness", doctorId: "doc_sara", name: "Wellness Herbal Center", city: "Karachi", address: "PECHS Block 2", paymentAccount: "Bank Transfer PK00-DHUB-0001" }
  ];

  const appointments = [
    {
      id: "apt_seed_1",
      patientId: "usr_patient",
      doctorId: "doc_ayesha",
      clinicId: "cln_central",
      date: "2026-06-18",
      time: "18:30",
      symptoms: "Chest heaviness and high blood pressure",
      status: "confirmed",
      createdAt
    }
  ];

  const payments = [
    {
      id: "pay_seed_1",
      appointmentId: "apt_seed_1",
      patientId: "usr_patient",
      amount: 1800,
      screenshotName: "seed-payment.png",
      screenshotData: "",
      status: "verified",
      verifiedBy: "usr_assistant",
      verifiedAt: createdAt,
      createdAt
    }
  ];

  const medicalHistory = [
    {
      id: "hist_seed_1",
      patientId: "usr_patient",
      doctorId: "doc_ayesha",
      appointmentId: "apt_seed_1",
      type: "prescription",
      title: "Blood pressure consultation",
      diagnosis: "Hypertension follow-up",
      notes: "Monitor BP twice daily. Reduce salt intake.",
      medicines: "Amlodipine 5mg once daily",
      createdBy: "usr_doctor_allo",
      createdAt
    }
  ];

  return {
    users,
    doctors,
    patients: [{ id: "pat_ali", userId: "usr_patient", bloodGroup: "B+", allergies: "None", emergencyContact: "0300-9999999" }],
    appointments,
    prescriptions: [
      {
        id: "rx_seed_1",
        patientId: "usr_patient",
        doctorId: "doc_ayesha",
        appointmentId: "apt_seed_1",
        diagnosis: "Hypertension follow-up",
        medicines: "Amlodipine 5mg once daily",
        notes: "Return after 2 weeks with BP log.",
        createdAt
      }
    ],
    medical_history: medicalHistory,
    payments,
    assistants: [{ id: "ast_seed", userId: "usr_assistant", assignedDoctorIds: ["doc_ayesha", "doc_hamza", "doc_sara"] }],
    clinics,
    messages: [
      { id: "msg_seed_1", fromUserId: "usr_patient", toUserId: "usr_doctor_allo", text: "Doctor, should I bring my previous BP reports?", createdAt },
      { id: "msg_seed_2", fromUserId: "usr_doctor_allo", toUserId: "usr_patient", text: "Yes, please bring the last three readings.", createdAt }
    ],
    auditLog: [{ id: "aud_seed", actorId: "system", action: "database_seeded", createdAt }]
  };
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    ...headers
  });
  res.end(payload);
}

function sendJson(res, status, body) {
  send(res, status, body, { "Cache-Control": "no-store" });
}

function notFound(res) {
  sendJson(res, 404, { error: "Not found" });
}

function forbidden(res) {
  sendJson(res, 403, { error: "You do not have permission for this action" });
}

async function bodyJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.length > 5 * 1024 * 1024) throw new Error("Request body is too large");
  return JSON.parse(raw);
}

function authUser(req, db) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = db.users.find((candidate) => candidate.id === payload.sub && candidate.status === "active");
  return user || null;
}

function enrichAppointment(db, appointment) {
  const doctor = db.doctors.find((item) => item.id === appointment.doctorId);
  const patient = db.users.find((item) => item.id === appointment.patientId);
  const clinic = db.clinics.find((item) => item.id === appointment.clinicId);
  const payment = db.payments.find((item) => item.appointmentId === appointment.id);
  return {
    ...appointment,
    doctorName: doctor?.name || "Unknown doctor",
    patientName: patient?.name || "Unknown patient",
    clinicName: clinic?.name || "Unknown clinic",
    treatmentType: doctor?.treatmentType || "",
    paymentStatus: payment?.status || "missing",
    paymentId: payment?.id || null,
    fee: doctor?.fee || 0
  };
}

function visibleAppointments(db, user) {
  if (user.role === ROLES.PATIENT) return db.appointments.filter((item) => item.patientId === user.id);
  if (user.role === ROLES.DOCTOR) {
    const doctor = db.doctors.find((item) => item.userId === user.id);
    return db.appointments.filter((item) => item.doctorId === doctor?.id);
  }
  if (user.role === ROLES.ASSISTANT) {
    const assistant = db.assistants.find((item) => item.userId === user.id);
    return db.appointments.filter((item) => assistant?.assignedDoctorIds.includes(item.doctorId));
  }
  return db.appointments;
}

function visibleHistory(db, user, patientId) {
  if (user.role === ROLES.PATIENT) return db.medical_history.filter((item) => item.patientId === user.id);
  if (user.role === ROLES.DOCTOR) {
    const doctor = db.doctors.find((item) => item.userId === user.id);
    return db.medical_history.filter((item) => item.doctorId === doctor?.id && (!patientId || item.patientId === patientId));
  }
  if (canManage(user) || user.role === ROLES.ASSISTANT) {
    return db.medical_history.filter((item) => !patientId || item.patientId === patientId);
  }
  return [];
}

function doctorForUser(db, user) {
  return db.doctors.find((item) => item.userId === user.id);
}

function addAudit(db, actorId, action, meta = {}) {
  db.auditLog.push({ id: id("aud"), actorId, action, meta, createdAt: now() });
}

async function serveStatic(req, res) {
  const requestPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!filePath.startsWith(PUBLIC_DIR)) return forbidden(res);
  try {
    const content = await fsp.readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream" });
    res.end(content);
  } catch {
    notFound(res);
  }
}

async function handleApi(req, res) {
  const db = await readDb();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;
  const route = url.pathname;

  try {
    if (method === "POST" && route === "/api/auth/register") {
      const body = await bodyJson(req);
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const role = [ROLES.PATIENT, ROLES.DOCTOR].includes(body.role) ? body.role : ROLES.PATIENT;
      if (!name || !email || password.length < 6) return sendJson(res, 400, { error: "Name, valid email, and 6 character password are required" });
      if (db.users.some((item) => item.email === email)) return sendJson(res, 409, { error: "Email already exists" });
      const user = { id: id("usr"), name, email, role, phone: body.phone || "", status: "active", passwordHash: hashPassword(password), createdAt: now() };
      db.users.push(user);
      if (role === ROLES.PATIENT) {
        db.patients.push({ id: id("pat"), userId: user.id, bloodGroup: body.bloodGroup || "", allergies: body.allergies || "", emergencyContact: body.emergencyContact || "" });
      }
      if (role === ROLES.DOCTOR) {
        db.doctors.push({
          id: id("doc"),
          userId: user.id,
          name,
          treatmentType: body.treatmentType || "Allopathic",
          specialization: body.specialization || "General Physician",
          diseases: String(body.diseases || "fever,cough").split(",").map((item) => item.trim()).filter(Boolean),
          fee: Number(body.fee || 1000),
          rating: 4.3,
          experienceYears: Number(body.experienceYears || 1),
          assistantId: "usr_assistant",
          schedule: ["Monday 05:00 PM - 08:00 PM"],
          clinicIds: []
        });
      }
      addAudit(db, user.id, "registered");
      await writeDb(db);
      return sendJson(res, 201, { token: signToken({ sub: user.id, role: user.role }), user: publicUser(user) });
    }

    if (method === "POST" && route === "/api/auth/login") {
      const body = await bodyJson(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = db.users.find((item) => item.email === email);
      if (!user || user.status !== "active" || !verifyPassword(password, user.passwordHash)) {
        return sendJson(res, 401, { error: "Invalid email or password" });
      }
      addAudit(db, user.id, "logged_in");
      await writeDb(db);
      return sendJson(res, 200, { token: signToken({ sub: user.id, role: user.role }), user: publicUser(user) });
    }

    const user = authUser(req, db);
    if (!user) return sendJson(res, 401, { error: "Authentication required" });

    if (method === "GET" && route === "/api/me") {
      return sendJson(res, 200, { user: publicUser(user), doctor: doctorForUser(db, user) || null });
    }

    if (method === "GET" && route === "/api/options") {
      const diseases = [...new Set(db.doctors.flatMap((doctor) => doctor.diseases))].sort();
      const treatmentTypes = [...new Set(db.doctors.map((doctor) => doctor.treatmentType))].sort();
      return sendJson(res, 200, { diseases, treatmentTypes });
    }

    if (method === "GET" && route === "/api/doctors") {
      const disease = String(url.searchParams.get("disease") || "").toLowerCase();
      const treatment = String(url.searchParams.get("treatment") || "").toLowerCase();
      const q = String(url.searchParams.get("q") || "").toLowerCase();
      const doctors = db.doctors
        .filter((doctor) => !disease || doctor.diseases.some((item) => item.toLowerCase().includes(disease)))
        .filter((doctor) => !treatment || doctor.treatmentType.toLowerCase() === treatment)
        .filter((doctor) => !q || `${doctor.name} ${doctor.specialization} ${doctor.diseases.join(" ")}`.toLowerCase().includes(q))
        .map((doctor) => ({
          ...doctor,
          clinics: db.clinics.filter((clinic) => doctor.clinicIds.includes(clinic.id)),
          user: publicUser(db.users.find((candidate) => candidate.id === doctor.userId) || {})
        }));
      return sendJson(res, 200, { doctors });
    }

    if (method === "POST" && route === "/api/doctors") {
      if (!canManage(user)) return forbidden(res);
      const body = await bodyJson(req);
      const email = String(body.email || "").trim().toLowerCase();
      if (!body.name || !email) return sendJson(res, 400, { error: "Doctor name and email are required" });
      if (db.users.some((item) => item.email === email)) return sendJson(res, 409, { error: "Email already exists" });
      const doctorUser = { id: id("usr"), name: body.name, email, role: ROLES.DOCTOR, phone: body.phone || "", status: "active", passwordHash: hashPassword(body.password || "password123"), createdAt: now() };
      const doctor = {
        id: id("doc"),
        userId: doctorUser.id,
        name: body.name,
        treatmentType: body.treatmentType || "Allopathic",
        specialization: body.specialization || "General Physician",
        diseases: String(body.diseases || "").split(",").map((item) => item.trim()).filter(Boolean),
        fee: Number(body.fee || 1000),
        rating: 4.1,
        experienceYears: Number(body.experienceYears || 1),
        assistantId: body.assistantId || "usr_assistant",
        schedule: [],
        clinicIds: []
      };
      db.users.push(doctorUser);
      db.doctors.push(doctor);
      addAudit(db, user.id, "doctor_created", { doctorId: doctor.id });
      await writeDb(db);
      return sendJson(res, 201, { doctor, user: publicUser(doctorUser) });
    }

    const doctorScheduleMatch = route.match(/^\/api\/doctors\/([^/]+)\/schedule$/);
    if (method === "PATCH" && doctorScheduleMatch) {
      const doctor = db.doctors.find((item) => item.id === doctorScheduleMatch[1]);
      if (!doctor) return notFound(res);
      if (!canManage(user) && doctor.userId !== user.id) return forbidden(res);
      const body = await bodyJson(req);
      doctor.schedule = Array.isArray(body.schedule) ? body.schedule.filter(Boolean) : String(body.schedule || "").split("\n").map((item) => item.trim()).filter(Boolean);
      addAudit(db, user.id, "doctor_schedule_updated", { doctorId: doctor.id });
      await writeDb(db);
      return sendJson(res, 200, { doctor });
    }

    if (method === "POST" && route === "/api/clinics") {
      const body = await bodyJson(req);
      const doctor = db.doctors.find((item) => item.id === body.doctorId);
      if (!doctor) return sendJson(res, 400, { error: "Valid doctor is required" });
      if (!canManage(user) && doctor.userId !== user.id) return forbidden(res);
      const clinic = { id: id("cln"), doctorId: doctor.id, name: body.name, city: body.city, address: body.address, paymentAccount: body.paymentAccount || "" };
      if (!clinic.name || !clinic.city || !clinic.address) return sendJson(res, 400, { error: "Clinic name, city, and address are required" });
      db.clinics.push(clinic);
      doctor.clinicIds.push(clinic.id);
      addAudit(db, user.id, "clinic_created", { clinicId: clinic.id });
      await writeDb(db);
      return sendJson(res, 201, { clinic });
    }

    if (method === "GET" && route === "/api/appointments") {
      const appointments = visibleAppointments(db, user).map((item) => enrichAppointment(db, item)).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
      return sendJson(res, 200, { appointments });
    }

    if (method === "POST" && route === "/api/appointments") {
      if (user.role !== ROLES.PATIENT) return forbidden(res);
      const body = await bodyJson(req);
      const doctor = db.doctors.find((item) => item.id === body.doctorId);
      const clinic = db.clinics.find((item) => item.id === body.clinicId && item.doctorId === doctor?.id);
      if (!doctor || !clinic || !body.date || !body.time) return sendJson(res, 400, { error: "Doctor, clinic, date, and time are required" });
      const appointment = {
        id: id("apt"),
        patientId: user.id,
        doctorId: doctor.id,
        clinicId: clinic.id,
        date: body.date,
        time: body.time,
        symptoms: body.symptoms || "",
        status: "payment_pending",
        createdAt: now()
      };
      const payment = {
        id: id("pay"),
        appointmentId: appointment.id,
        patientId: user.id,
        amount: doctor.fee,
        screenshotName: body.screenshotName || "payment-proof",
        screenshotData: body.screenshotData || "",
        status: "pending",
        verifiedBy: null,
        verifiedAt: null,
        createdAt: now()
      };
      db.appointments.push(appointment);
      db.payments.push(payment);
      addAudit(db, user.id, "appointment_booked", { appointmentId: appointment.id });
      await writeDb(db);
      return sendJson(res, 201, { appointment: enrichAppointment(db, appointment), payment });
    }

    const appointmentStatusMatch = route.match(/^\/api\/appointments\/([^/]+)\/status$/);
    if (method === "PATCH" && appointmentStatusMatch) {
      if (!isAssistantOrManager(user)) return forbidden(res);
      const body = await bodyJson(req);
      const appointment = db.appointments.find((item) => item.id === appointmentStatusMatch[1]);
      if (!appointment) return notFound(res);
      if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user.role)) {
        const assistant = db.assistants.find((item) => item.userId === user.id);
        if (!assistant?.assignedDoctorIds.includes(appointment.doctorId)) return forbidden(res);
      }
      const allowed = ["payment_pending", "confirmed", "cancelled", "completed"];
      if (!allowed.includes(body.status)) return sendJson(res, 400, { error: "Invalid appointment status" });
      appointment.status = body.status;
      addAudit(db, user.id, "appointment_status_updated", { appointmentId: appointment.id, status: body.status });
      await writeDb(db);
      return sendJson(res, 200, { appointment: enrichAppointment(db, appointment) });
    }

    if (method === "GET" && route === "/api/payments") {
      if (!isAssistantOrManager(user) && user.role !== ROLES.PATIENT) return forbidden(res);
      let payments = db.payments;
      if (user.role === ROLES.PATIENT) payments = payments.filter((item) => item.patientId === user.id);
      if (user.role === ROLES.ASSISTANT) {
        const assistant = db.assistants.find((item) => item.userId === user.id);
        payments = payments.filter((payment) => {
          const appointment = db.appointments.find((item) => item.id === payment.appointmentId);
          return assistant?.assignedDoctorIds.includes(appointment?.doctorId);
        });
      }
      return sendJson(res, 200, {
        payments: payments.map((payment) => ({
          ...payment,
          appointment: enrichAppointment(db, db.appointments.find((item) => item.id === payment.appointmentId) || {})
        }))
      });
    }

    if (method === "POST" && route === "/api/payments") {
      if (user.role !== ROLES.PATIENT) return forbidden(res);
      const body = await bodyJson(req);
      const appointment = db.appointments.find((item) => item.id === body.appointmentId && item.patientId === user.id);
      if (!appointment) return sendJson(res, 400, { error: "Valid appointment is required" });
      let payment = db.payments.find((item) => item.appointmentId === appointment.id);
      if (!payment) {
        payment = { id: id("pay"), appointmentId: appointment.id, patientId: user.id, amount: Number(body.amount || 0), createdAt: now() };
        db.payments.push(payment);
      }
      payment.screenshotName = body.screenshotName || payment.screenshotName || "payment-proof";
      payment.screenshotData = body.screenshotData || payment.screenshotData || "";
      payment.status = "pending";
      payment.verifiedBy = null;
      payment.verifiedAt = null;
      appointment.status = "payment_pending";
      addAudit(db, user.id, "payment_uploaded", { paymentId: payment.id });
      await writeDb(db);
      return sendJson(res, 200, { payment });
    }

    const paymentVerifyMatch = route.match(/^\/api\/payments\/([^/]+)\/verify$/);
    if (method === "PATCH" && paymentVerifyMatch) {
      if (!isAssistantOrManager(user)) return forbidden(res);
      const body = await bodyJson(req);
      const payment = db.payments.find((item) => item.id === paymentVerifyMatch[1]);
      if (!payment) return notFound(res);
      const appointment = db.appointments.find((item) => item.id === payment.appointmentId);
      if (user.role === ROLES.ASSISTANT) {
        const assistant = db.assistants.find((item) => item.userId === user.id);
        if (!assistant?.assignedDoctorIds.includes(appointment?.doctorId)) return forbidden(res);
      }
      const status = body.status === "rejected" ? "rejected" : "verified";
      payment.status = status;
      payment.verifiedBy = user.id;
      payment.verifiedAt = now();
      if (appointment) appointment.status = status === "verified" ? "confirmed" : "payment_pending";
      addAudit(db, user.id, "payment_verification_updated", { paymentId: payment.id, status });
      await writeDb(db);
      return sendJson(res, 200, { payment, appointment: appointment ? enrichAppointment(db, appointment) : null });
    }

    if (method === "GET" && route === "/api/history") {
      const patientId = url.searchParams.get("patientId") || "";
      return sendJson(res, 200, { history: visibleHistory(db, user, patientId) });
    }

    if (method === "POST" && route === "/api/history") {
      if (![ROLES.DOCTOR, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user.role)) return forbidden(res);
      const body = await bodyJson(req);
      const doctor = doctorForUser(db, user) || db.doctors.find((item) => item.id === body.doctorId);
      const patient = db.users.find((item) => item.id === body.patientId && item.role === ROLES.PATIENT);
      if (!doctor || !patient || !body.title) return sendJson(res, 400, { error: "Doctor, patient, and title are required" });
      if (user.role === ROLES.DOCTOR && doctor.userId !== user.id) return forbidden(res);
      const entry = {
        id: id("hist"),
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: body.appointmentId || null,
        type: body.type || "note",
        title: body.title,
        diagnosis: body.diagnosis || "",
        notes: body.notes || "",
        medicines: body.medicines || "",
        createdBy: user.id,
        createdAt: now()
      };
      db.medical_history.push(entry);
      addAudit(db, user.id, "medical_history_added", { historyId: entry.id });
      await writeDb(db);
      return sendJson(res, 201, { entry });
    }

    if (method === "GET" && route === "/api/prescriptions") {
      let prescriptions = db.prescriptions;
      if (user.role === ROLES.PATIENT) prescriptions = prescriptions.filter((item) => item.patientId === user.id);
      if (user.role === ROLES.DOCTOR) {
        const doctor = doctorForUser(db, user);
        prescriptions = prescriptions.filter((item) => item.doctorId === doctor?.id);
      }
      return sendJson(res, 200, { prescriptions });
    }

    if (method === "POST" && route === "/api/prescriptions") {
      if (user.role !== ROLES.DOCTOR && !canManage(user)) return forbidden(res);
      const body = await bodyJson(req);
      const doctor = doctorForUser(db, user) || db.doctors.find((item) => item.id === body.doctorId);
      const patient = db.users.find((item) => item.id === body.patientId && item.role === ROLES.PATIENT);
      if (!doctor || !patient || !body.diagnosis || !body.medicines) return sendJson(res, 400, { error: "Patient, diagnosis, and medicines are required" });
      const prescription = {
        id: id("rx"),
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: body.appointmentId || null,
        diagnosis: body.diagnosis,
        medicines: body.medicines,
        notes: body.notes || "",
        createdAt: now()
      };
      db.prescriptions.push(prescription);
      db.medical_history.push({
        id: id("hist"),
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: prescription.appointmentId,
        type: "prescription",
        title: `Prescription by ${doctor.name}`,
        diagnosis: prescription.diagnosis,
        notes: prescription.notes,
        medicines: prescription.medicines,
        createdBy: user.id,
        createdAt: prescription.createdAt
      });
      addAudit(db, user.id, "prescription_added", { prescriptionId: prescription.id });
      await writeDb(db);
      return sendJson(res, 201, { prescription });
    }

    if (method === "GET" && route === "/api/messages") {
      const messages = db.messages.filter((item) => item.fromUserId === user.id || item.toUserId === user.id || canManage(user));
      return sendJson(res, 200, { messages, users: db.users.map(publicUser) });
    }

    if (method === "POST" && route === "/api/messages") {
      const body = await bodyJson(req);
      const toUser = db.users.find((item) => item.id === body.toUserId && item.status === "active");
      if (!toUser || !body.text) return sendJson(res, 400, { error: "Recipient and message are required" });
      const message = { id: id("msg"), fromUserId: user.id, toUserId: toUser.id, text: String(body.text).slice(0, 1000), createdAt: now() };
      db.messages.push(message);
      addAudit(db, user.id, "message_sent", { messageId: message.id });
      await writeDb(db);
      return sendJson(res, 201, { message });
    }

    if (method === "GET" && route === "/api/users") {
      if (!isAssistantOrManager(user) && user.role !== ROLES.DOCTOR) return forbidden(res);
      let users = db.users;
      if (user.role === ROLES.DOCTOR) {
        const doctor = doctorForUser(db, user);
        const patientIds = db.appointments.filter((item) => item.doctorId === doctor?.id).map((item) => item.patientId);
        users = db.users.filter((item) => patientIds.includes(item.id) || item.id === user.id);
      }
      return sendJson(res, 200, { users: users.map(publicUser) });
    }

    const userStatusMatch = route.match(/^\/api\/users\/([^/]+)\/status$/);
    if (method === "PATCH" && userStatusMatch) {
      if (!canManage(user)) return forbidden(res);
      const body = await bodyJson(req);
      const target = db.users.find((item) => item.id === userStatusMatch[1]);
      if (!target) return notFound(res);
      target.status = body.status === "inactive" ? "inactive" : "active";
      addAudit(db, user.id, "user_status_updated", { targetUserId: target.id, status: target.status });
      await writeDb(db);
      return sendJson(res, 200, { user: publicUser(target) });
    }

    if (method === "GET" && route === "/api/analytics") {
      if (!isAssistantOrManager(user)) return forbidden(res);
      const analytics = {
        users: db.users.length,
        doctors: db.doctors.length,
        patients: db.users.filter((item) => item.role === ROLES.PATIENT).length,
        appointments: db.appointments.length,
        confirmedAppointments: db.appointments.filter((item) => item.status === "confirmed").length,
        pendingPayments: db.payments.filter((item) => item.status === "pending").length,
        verifiedPayments: db.payments.filter((item) => item.status === "verified").length,
        historyRecords: db.medical_history.length,
        revenue: db.payments.filter((item) => item.status === "verified").reduce((sum, item) => sum + Number(item.amount || 0), 0),
        byTreatmentType: db.doctors.reduce((acc, doctor) => {
          acc[doctor.treatmentType] = (acc[doctor.treatmentType] || 0) + 1;
          return acc;
        }, {})
      };
      return sendJson(res, 200, { analytics, auditLog: db.auditLog.slice(-25).reverse() });
    }

    return notFound(res);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || "Server error" });
  }
}

const server = http.createServer(async (req, res) => {
  await ensureDb();
  if (req.url.startsWith("/api/")) return handleApi(req, res);
  return serveStatic(req, res);
});

ensureDb().then(() => {
  if (require.main === module) {
    server.listen(PORT, () => {
      console.log(`Doctor Hub running at http://localhost:${PORT}`);
    });
  }
});

module.exports = server;
