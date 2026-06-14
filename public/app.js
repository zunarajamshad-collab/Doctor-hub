const state = {
  token: localStorage.getItem("doctorHubToken") || "",
  user: JSON.parse(localStorage.getItem("doctorHubUser") || "null"),
  tab: "overview",
  cache: {}
};

const roles = {
  patient: "Patient",
  doctor: "Doctor",
  assistant: "Assistant",
  admin: "Admin",
  super_admin: "Super Admin"
};

const demoAccounts = [
  ["Patient", "patient@doctorhub.test"],
  ["Doctor", "doctor.allo@doctorhub.test"],
  ["Assistant", "assistant@doctorhub.test"],
  ["Admin", "admin@doctorhub.test"],
  ["Super Admin", "superadmin@doctorhub.test"]
];

const app = document.querySelector("#app");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currency(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function dateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("doctorHubToken", token);
  localStorage.setItem("doctorHubUser", JSON.stringify(user));
}

function clearSession() {
  state.token = "";
  state.user = null;
  state.cache = {};
  localStorage.removeItem("doctorHubToken");
  localStorage.removeItem("doctorHubUser");
}

function toast(message, type = "success") {
  const node = document.querySelector("#notice");
  if (!node) return;
  node.className = `notice ${type === "error" ? "error" : "success-note"}`;
  node.textContent = message;
  node.classList.remove("hidden");
  window.setTimeout(() => node.classList.add("hidden"), 4200);
}

function authScreen(mode = "login") {
  app.innerHTML = `
    <main class="auth-wrap">
      <section class="auth-panel">
        <div class="brand">
          <div class="mark">DH</div>
          <div>
            <h1>Doctor Hub</h1>
            <span>Healthcare consultation platform</span>
          </div>
        </div>
        <div class="tabs">
          <button class="${mode === "login" ? "active" : ""}" data-auth-mode="login">Login</button>
          <button class="${mode === "register" ? "active" : ""}" data-auth-mode="register">Register</button>
        </div>
        <div id="notice" class="notice hidden"></div>
        ${mode === "login" ? loginForm() : registerForm()}
        <div class="panel">
          <div class="panel-title"><h3>Demo Accounts</h3></div>
          <div class="list">
            ${demoAccounts.map(([label, email]) => `
              <button class="secondary demo-login" data-email="${email}">
                ${label} · ${email}
              </button>
            `).join("")}
          </div>
        </div>
      </section>
      <section class="auth-visual">
        <h2>Doctor Hub</h2>
        <p>Search doctors, book consultations, verify payments, and protect patient history in one connected system.</p>
      </section>
    </main>
  `;

  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => authScreen(button.dataset.authMode));
  });

  document.querySelector("#auth-form").addEventListener("submit", mode === "login" ? submitLogin : submitRegister);
  document.querySelectorAll(".demo-login").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const data = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: button.dataset.email, password: "password123" })
        });
        setSession(data.token, data.user);
        state.tab = "overview";
        await renderApp();
      } catch (error) {
        toast(error.message, "error");
      }
    });
  });
}

function loginForm() {
  return `
    <form id="auth-form" class="grid">
      <label>Email
        <input name="email" type="email" value="patient@doctorhub.test" required>
      </label>
      <label>Password
        <input name="password" type="password" value="password123" required>
      </label>
      <button type="submit">Login</button>
    </form>
  `;
}

function registerForm() {
  return `
    <form id="auth-form" class="grid">
      <div class="form-grid">
        <label>Name
          <input name="name" required>
        </label>
        <label>Email
          <input name="email" type="email" required>
        </label>
        <label>Password
          <input name="password" type="password" minlength="6" required>
        </label>
        <label>Role
          <select name="role">
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
          </select>
        </label>
        <label>Treatment Type
          <select name="treatmentType">
            <option>Allopathic</option>
            <option>Homeopathic</option>
            <option>Herbal</option>
          </select>
        </label>
        <label>Specialization
          <input name="specialization" placeholder="General Physician">
        </label>
        <label class="full">Diseases
          <input name="diseases" placeholder="fever, cough, allergy">
        </label>
      </div>
      <button type="submit">Create Account</button>
    </form>
  `;
}

async function submitLogin(event) {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify(form) });
    setSession(data.token, data.user);
    state.tab = "overview";
    await renderApp();
  } catch (error) {
    toast(error.message, "error");
  }
}

async function submitRegister(event) {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const data = await api("/api/auth/register", { method: "POST", body: JSON.stringify(form) });
    setSession(data.token, data.user);
    state.tab = "overview";
    await renderApp();
  } catch (error) {
    toast(error.message, "error");
  }
}

function tabsForRole(role) {
  if (role === "patient") return [
    ["overview", "Overview"],
    ["doctors", "Find Doctors"],
    ["appointments", "Appointments"],
    ["history", "Medical History"],
    ["messages", "Messages"]
  ];
  if (role === "doctor") return [
    ["overview", "Overview"],
    ["appointments", "Appointments"],
    ["prescriptions", "Prescriptions"],
    ["history", "Medical History"],
    ["clinics", "Clinics"],
    ["messages", "Messages"]
  ];
  if (role === "assistant") return [
    ["overview", "Overview"],
    ["payments", "Payments"],
    ["appointments", "Appointments"],
    ["messages", "Messages"]
  ];
  return [
    ["overview", "Overview"],
    ["analytics", "Analytics"],
    ["users", "Users"],
    ["doctors", "Doctors"],
    ["appointments", "Appointments"],
    ["payments", "Payments"],
    ["history", "History"],
    ["messages", "Messages"]
  ];
}

async function renderApp() {
  if (!state.token || !state.user) return authScreen();
  try {
    const me = await api("/api/me");
    state.user = me.user;
    state.cache.me = me;
    localStorage.setItem("doctorHubUser", JSON.stringify(me.user));
  } catch {
    clearSession();
    return authScreen();
  }

  const tabs = tabsForRole(state.user.role);
  if (!tabs.some(([id]) => id === state.tab)) state.tab = "overview";
  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="mark">DH</div>
          <div>
            <h1>Doctor Hub</h1>
            <span>${escapeHtml(state.user.name)} · ${escapeHtml(state.user.email)}</span>
          </div>
        </div>
        <div class="row">
          <span class="role-pill">${roles[state.user.role] || state.user.role}</span>
          <button class="secondary" id="logout">Logout</button>
        </div>
      </header>
      <section class="layout">
        <aside class="sidebar">
          <nav class="nav">
            ${tabs.map(([id, label]) => `<button class="${state.tab === id ? "active" : ""}" data-tab="${id}">${label}</button>`).join("")}
          </nav>
        </aside>
        <section class="content">
          <div id="notice" class="notice hidden"></div>
          <div id="view"></div>
        </section>
      </section>
    </main>
  `;

  document.querySelector("#logout").addEventListener("click", () => {
    clearSession();
    authScreen();
  });
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.tab = button.dataset.tab;
      await renderApp();
    });
  });
  await renderView();
}

async function renderView() {
  const view = document.querySelector("#view");
  view.innerHTML = `<div class="panel">Loading...</div>`;
  try {
    if (state.tab === "overview") view.innerHTML = await overviewView();
    if (state.tab === "doctors") view.innerHTML = await doctorsView();
    if (state.tab === "appointments") view.innerHTML = await appointmentsView();
    if (state.tab === "history") view.innerHTML = await historyView();
    if (state.tab === "prescriptions") view.innerHTML = await prescriptionsView();
    if (state.tab === "payments") view.innerHTML = await paymentsView();
    if (state.tab === "clinics") view.innerHTML = await clinicsView();
    if (state.tab === "users") view.innerHTML = await usersView();
    if (state.tab === "analytics") view.innerHTML = await analyticsView();
    if (state.tab === "messages") view.innerHTML = await messagesView();
    bindViewEvents();
  } catch (error) {
    view.innerHTML = `<div class="notice error">${escapeHtml(error.message)}</div>`;
  }
}

async function overviewView() {
  const [appointments, doctors, history] = await Promise.all([
    api("/api/appointments").catch(() => ({ appointments: [] })),
    api("/api/doctors").catch(() => ({ doctors: [] })),
    api("/api/history").catch(() => ({ history: [] }))
  ]);
  const metrics = [
    ["Appointments", appointments.appointments.length],
    ["Doctors", doctors.doctors.length],
    ["History Records", history.history.length],
    ["Role", roles[state.user.role] || state.user.role]
  ];
  return `
    <section class="panel">
      <div class="panel-title">
        <h2>Overview</h2>
        <span class="status active">${escapeHtml(state.user.status)}</span>
      </div>
      <div class="grid four">
        ${metrics.map(([label, value]) => `<div class="card metric"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
      </div>
    </section>
    <section class="grid two">
      <div class="panel">
        <div class="panel-title"><h3>Recent Appointments</h3></div>
        <div class="list">${appointments.appointments.slice(0, 4).map(appointmentCard).join("") || empty("No appointments found")}</div>
      </div>
      <div class="panel">
        <div class="panel-title"><h3>Medical History</h3></div>
        <div class="list">${history.history.slice(0, 4).map(historyCard).join("") || empty("No history records found")}</div>
      </div>
    </section>
  `;
}

async function doctorsView() {
  const options = await api("/api/options");
  const doctors = await api(`/api/doctors${location.search || ""}`);
  const canAdd = ["admin", "super_admin"].includes(state.user.role);
  return `
    <section class="panel">
      <div class="panel-title">
        <h2>${state.user.role === "patient" ? "Find Doctors" : "Doctors"}</h2>
      </div>
      <form id="doctor-filter" class="form-grid">
        <label>Disease
          <select name="disease">
            <option value="">All diseases</option>
            ${options.diseases.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}
          </select>
        </label>
        <label>Treatment
          <select name="treatment">
            <option value="">All treatment types</option>
            ${options.treatmentTypes.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}
          </select>
        </label>
        <label class="full">Search
          <input name="q" placeholder="Doctor, specialization, disease">
        </label>
        <button type="submit">Apply Filters</button>
      </form>
    </section>
    ${canAdd ? addDoctorPanel() : ""}
    <section class="grid three">
      ${doctors.doctors.map(doctorCard).join("") || empty("No matching doctors found")}
    </section>
  `;
}

function doctorCard(doctor) {
  const clinics = doctor.clinics || [];
  const firstClinic = clinics[0];
  return `
    <article class="card">
      <div class="row between">
        <h3>${escapeHtml(doctor.name)}</h3>
        <span class="status verified">${escapeHtml(doctor.treatmentType)}</span>
      </div>
      <div class="muted">${escapeHtml(doctor.specialization)} · ${doctor.experienceYears} years · ${currency(doctor.fee)}</div>
      <div>${doctor.diseases.map((item) => `<span class="status">${escapeHtml(item)}</span>`).join(" ")}</div>
      <div class="small">${escapeHtml(doctor.schedule.join(" | ") || "Schedule pending")}</div>
      <div class="small">${escapeHtml(clinics.map((clinic) => `${clinic.name}, ${clinic.city}`).join(" | ") || "Clinic pending")}</div>
      ${state.user.role === "patient" && firstClinic ? `
        <form class="book-form grid" data-doctor-id="${doctor.id}" data-clinic-id="${firstClinic.id}">
          <div class="form-grid">
            <label>Date<input name="date" type="date" required></label>
            <label>Time<input name="time" type="time" required></label>
            <label class="full">Symptoms<textarea name="symptoms" required></textarea></label>
            <label class="full">Payment Proof<input name="proof" type="file" accept="image/*"></label>
          </div>
          <button type="submit">Book Appointment</button>
        </form>
      ` : ""}
    </article>
  `;
}

function addDoctorPanel() {
  return `
    <section class="panel">
      <div class="panel-title"><h3>Add Doctor</h3></div>
      <form id="add-doctor" class="form-grid">
        <label>Name<input name="name" required></label>
        <label>Email<input name="email" type="email" required></label>
        <label>Treatment
          <select name="treatmentType">
            <option>Allopathic</option>
            <option>Homeopathic</option>
            <option>Herbal</option>
          </select>
        </label>
        <label>Specialization<input name="specialization" required></label>
        <label>Fee<input name="fee" type="number" value="1000" min="0"></label>
        <label>Experience<input name="experienceYears" type="number" value="1" min="0"></label>
        <label class="full">Diseases<input name="diseases" placeholder="fever, cough, allergy"></label>
        <button type="submit">Save Doctor</button>
      </form>
    </section>
  `;
}

async function appointmentsView() {
  const { appointments } = await api("/api/appointments");
  return `
    <section class="panel">
      <div class="panel-title"><h2>Appointments</h2></div>
      <div class="list">${appointments.map(appointmentCard).join("") || empty("No appointments found")}</div>
    </section>
  `;
}

function appointmentCard(item) {
  const canChange = ["assistant", "admin", "super_admin"].includes(state.user.role);
  return `
    <article class="card">
      <div class="row between">
        <h3>${escapeHtml(item.patientName)} → ${escapeHtml(item.doctorName)}</h3>
        <span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status.replaceAll("_", " "))}</span>
      </div>
      <div class="muted">${escapeHtml(item.date)} · ${escapeHtml(item.time)} · ${escapeHtml(item.clinicName)} · ${currency(item.fee)}</div>
      <div>${escapeHtml(item.symptoms || "No symptoms recorded")}</div>
      <div class="row">
        <span class="status ${escapeHtml(item.paymentStatus)}">Payment ${escapeHtml(item.paymentStatus)}</span>
        ${canChange ? `
          <button class="success appointment-status" data-id="${item.id}" data-status="confirmed">Confirm</button>
          <button class="secondary appointment-status" data-id="${item.id}" data-status="completed">Complete</button>
          <button class="danger appointment-status" data-id="${item.id}" data-status="cancelled">Cancel</button>
        ` : ""}
      </div>
    </article>
  `;
}

async function paymentsView() {
  const { payments } = await api("/api/payments");
  return `
    <section class="panel">
      <div class="panel-title"><h2>Payments</h2></div>
      <div class="list">${payments.map(paymentCard).join("") || empty("No payments found")}</div>
    </section>
  `;
}

function paymentCard(payment) {
  const canVerify = ["assistant", "admin", "super_admin"].includes(state.user.role);
  return `
    <article class="card">
      <div class="row between">
        <h3>${escapeHtml(payment.appointment.patientName)} · ${escapeHtml(payment.appointment.doctorName)}</h3>
        <span class="status ${escapeHtml(payment.status)}">${escapeHtml(payment.status)}</span>
      </div>
      <div class="muted">${currency(payment.amount)} · ${escapeHtml(payment.screenshotName || "No file name")}</div>
      ${payment.screenshotData ? `<img class="proof" src="${payment.screenshotData}" alt="Payment proof">` : `<div class="small muted">No preview available</div>`}
      ${canVerify ? `
        <div class="row">
          <button class="success verify-payment" data-id="${payment.id}" data-status="verified">Verify</button>
          <button class="danger verify-payment" data-id="${payment.id}" data-status="rejected">Reject</button>
        </div>
      ` : ""}
    </article>
  `;
}

async function historyView() {
  const { history } = await api("/api/history");
  const users = await api("/api/users").catch(() => ({ users: [] }));
  const canAdd = ["doctor", "admin", "super_admin"].includes(state.user.role);
  return `
    ${canAdd ? historyForm(users.users) : ""}
    <section class="panel">
      <div class="panel-title"><h2>Medical History</h2></div>
      <div class="notice">Medical history records are append-only. Previous prescriptions and doctor records are protected from edit and delete actions.</div>
      <div class="list" style="margin-top:14px">${history.map(historyCard).join("") || empty("No history records found")}</div>
    </section>
  `;
}

function historyForm(users) {
  const patients = users.filter((user) => user.role === "patient");
  return `
    <section class="panel">
      <div class="panel-title"><h3>Add Medical Record</h3></div>
      <form id="history-form" class="form-grid">
        <label>Patient
          <select name="patientId" required>
            ${patients.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} · ${escapeHtml(user.email)}</option>`).join("")}
          </select>
        </label>
        <label>Type
          <select name="type">
            <option value="note">Note</option>
            <option value="diagnosis">Diagnosis</option>
            <option value="prescription">Prescription</option>
          </select>
        </label>
        <label class="full">Title<input name="title" required></label>
        <label>Diagnosis<input name="diagnosis"></label>
        <label>Medicines<input name="medicines"></label>
        <label class="full">Notes<textarea name="notes"></textarea></label>
        <button type="submit">Add Record</button>
      </form>
    </section>
  `;
}

function historyCard(item) {
  return `
    <article class="card">
      <div class="row between">
        <h3>${escapeHtml(item.title)}</h3>
        <span class="status">${escapeHtml(item.type)}</span>
      </div>
      <div class="muted">${escapeHtml(dateTime(item.createdAt))}</div>
      <div><strong>Diagnosis:</strong> ${escapeHtml(item.diagnosis || "N/A")}</div>
      <div><strong>Medicines:</strong> ${escapeHtml(item.medicines || "N/A")}</div>
      <div>${escapeHtml(item.notes || "")}</div>
    </article>
  `;
}

async function prescriptionsView() {
  const users = await api("/api/users");
  const appointments = await api("/api/appointments");
  const prescriptions = await api("/api/prescriptions");
  const patients = users.users.filter((user) => user.role === "patient");
  return `
    <section class="panel">
      <div class="panel-title"><h2>Prescriptions</h2></div>
      <form id="prescription-form" class="form-grid">
        <label>Patient
          <select name="patientId" required>
            ${patients.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("")}
          </select>
        </label>
        <label>Appointment
          <select name="appointmentId">
            <option value="">None</option>
            ${appointments.appointments.map((item) => `<option value="${item.id}">${escapeHtml(item.patientName)} · ${escapeHtml(item.date)}</option>`).join("")}
          </select>
        </label>
        <label>Diagnosis<input name="diagnosis" required></label>
        <label>Medicines<input name="medicines" required></label>
        <label class="full">Notes<textarea name="notes"></textarea></label>
        <button type="submit">Add Prescription</button>
      </form>
    </section>
    <section class="panel">
      <div class="panel-title"><h3>Prescription Records</h3></div>
      <div class="list">${prescriptions.prescriptions.map((item) => `
        <article class="card">
          <strong>${escapeHtml(item.diagnosis)}</strong>
          <span>${escapeHtml(item.medicines)}</span>
          <span class="muted">${escapeHtml(dateTime(item.createdAt))}</span>
        </article>
      `).join("") || empty("No prescriptions found")}</div>
    </section>
  `;
}

async function clinicsView() {
  const doctor = state.cache.me.doctor;
  if (!doctor) return `<div class="notice error">Doctor profile not found.</div>`;
  const doctors = await api("/api/doctors");
  const current = doctors.doctors.find((item) => item.id === doctor.id) || doctor;
  return `
    <section class="panel">
      <div class="panel-title"><h2>Schedule</h2></div>
      <form id="schedule-form" data-doctor-id="${doctor.id}" class="grid">
        <label>Schedule Lines
          <textarea name="schedule">${escapeHtml((current.schedule || []).join("\n"))}</textarea>
        </label>
        <button type="submit">Update Schedule</button>
      </form>
    </section>
    <section class="panel">
      <div class="panel-title"><h2>Clinics</h2></div>
      <form id="clinic-form" class="form-grid">
        <input type="hidden" name="doctorId" value="${doctor.id}">
        <label>Name<input name="name" required></label>
        <label>City<input name="city" required></label>
        <label class="full">Address<input name="address" required></label>
        <label class="full">Payment Account<input name="paymentAccount"></label>
        <button type="submit">Add Clinic</button>
      </form>
      <div class="list" style="margin-top:14px">${(current.clinics || []).map((clinic) => `
        <article class="card">
          <strong>${escapeHtml(clinic.name)}</strong>
          <span>${escapeHtml(clinic.city)} · ${escapeHtml(clinic.address)}</span>
          <span class="muted">${escapeHtml(clinic.paymentAccount || "")}</span>
        </article>
      `).join("") || empty("No clinics found")}</div>
    </section>
  `;
}

async function usersView() {
  const { users } = await api("/api/users");
  return `
    <section class="panel">
      <div class="panel-title"><h2>Users</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>${users.map((user) => `
            <tr>
              <td>${escapeHtml(user.name)}</td>
              <td>${escapeHtml(user.email)}</td>
              <td>${escapeHtml(roles[user.role] || user.role)}</td>
              <td><span class="status ${escapeHtml(user.status)}">${escapeHtml(user.status)}</span></td>
              <td>
                <button class="secondary user-status" data-id="${user.id}" data-status="${user.status === "active" ? "inactive" : "active"}">
                  ${user.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

async function analyticsView() {
  const { analytics, auditLog } = await api("/api/analytics");
  const metrics = [
    ["Users", analytics.users],
    ["Doctors", analytics.doctors],
    ["Patients", analytics.patients],
    ["Appointments", analytics.appointments],
    ["Confirmed", analytics.confirmedAppointments],
    ["Pending Payments", analytics.pendingPayments],
    ["Verified Payments", analytics.verifiedPayments],
    ["Revenue", currency(analytics.revenue)]
  ];
  return `
    <section class="panel">
      <div class="panel-title"><h2>Analytics</h2></div>
      <div class="grid four">
        ${metrics.map(([label, value]) => `<div class="card metric"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
      </div>
    </section>
    <section class="grid two">
      <div class="panel">
        <div class="panel-title"><h3>Treatment Types</h3></div>
        <div class="list">${Object.entries(analytics.byTreatmentType).map(([key, value]) => `<div class="card"><strong>${escapeHtml(key)}</strong><span>${value} doctors</span></div>`).join("")}</div>
      </div>
      <div class="panel">
        <div class="panel-title"><h3>Audit Log</h3></div>
        <div class="list">${auditLog.map((item) => `<div class="card"><strong>${escapeHtml(item.action)}</strong><span class="muted">${escapeHtml(dateTime(item.createdAt))}</span></div>`).join("")}</div>
      </div>
    </section>
  `;
}

async function messagesView() {
  const { messages, users } = await api("/api/messages");
  const recipients = users.filter((user) => user.id !== state.user.id && user.status === "active");
  const userName = (id) => users.find((user) => user.id === id)?.name || id;
  return `
    <section class="panel">
      <div class="panel-title"><h2>Messages</h2></div>
      <form id="message-form" class="form-grid">
        <label>To
          <select name="toUserId" required>
            ${recipients.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} · ${escapeHtml(roles[user.role] || user.role)}</option>`).join("")}
          </select>
        </label>
        <label class="full">Message<textarea name="text" required></textarea></label>
        <button type="submit">Send Message</button>
      </form>
    </section>
    <section class="panel">
      <div class="panel-title"><h3>Conversation</h3></div>
      <div class="list">${messages.map((item) => `
        <article class="card">
          <div class="row between">
            <strong>${escapeHtml(userName(item.fromUserId))} → ${escapeHtml(userName(item.toUserId))}</strong>
            <span class="muted small">${escapeHtml(dateTime(item.createdAt))}</span>
          </div>
          <span>${escapeHtml(item.text)}</span>
        </article>
      `).join("") || empty("No messages found")}</div>
    </section>
  `;
}

function empty(message) {
  return `<div class="notice">${escapeHtml(message)}</div>`;
}

function bindViewEvents() {
  document.querySelector("#doctor-filter")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (value) params.set(key, value);
    }
    history.replaceState(null, "", params.toString() ? `?${params}` : location.pathname);
    await renderView();
  });

  document.querySelectorAll(".book-form").forEach((form) => {
    form.addEventListener("submit", bookAppointment);
  });

  document.querySelector("#add-doctor")?.addEventListener("submit", postForm("/api/doctors", "Doctor saved"));
  document.querySelector("#history-form")?.addEventListener("submit", postForm("/api/history", "Medical record added"));
  document.querySelector("#prescription-form")?.addEventListener("submit", postForm("/api/prescriptions", "Prescription added"));
  document.querySelector("#clinic-form")?.addEventListener("submit", postForm("/api/clinics", "Clinic added"));
  document.querySelector("#message-form")?.addEventListener("submit", postForm("/api/messages", "Message sent"));

  document.querySelector("#schedule-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(`/api/doctors/${event.currentTarget.dataset.doctorId}/schedule`, {
        method: "PATCH",
        body: JSON.stringify({ schedule: form.schedule })
      });
      toast("Schedule updated");
      await renderView();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  document.querySelectorAll(".appointment-status").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api(`/api/appointments/${button.dataset.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: button.dataset.status })
        });
        toast("Appointment updated");
        await renderView();
      } catch (error) {
        toast(error.message, "error");
      }
    });
  });

  document.querySelectorAll(".verify-payment").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api(`/api/payments/${button.dataset.id}/verify`, {
          method: "PATCH",
          body: JSON.stringify({ status: button.dataset.status })
        });
        toast("Payment updated");
        await renderView();
      } catch (error) {
        toast(error.message, "error");
      }
    });
  });

  document.querySelectorAll(".user-status").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api(`/api/users/${button.dataset.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: button.dataset.status })
        });
        toast("User status updated");
        await renderView();
      } catch (error) {
        toast(error.message, "error");
      }
    });
  });
}

function postForm(path, message) {
  return async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(path, { method: "POST", body: JSON.stringify(payload) });
      event.currentTarget.reset();
      toast(message);
      await renderView();
    } catch (error) {
      toast(error.message, "error");
    }
  };
}

async function bookAppointment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const file = form.querySelector("[name='proof']").files[0];
  let screenshotData = "";
  if (file) screenshotData = await fileToDataUrl(file);
  try {
    await api("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        doctorId: form.dataset.doctorId,
        clinicId: form.dataset.clinicId,
        date: data.date,
        time: data.time,
        symptoms: data.symptoms,
        screenshotName: file?.name || "",
        screenshotData
      })
    });
    form.reset();
    toast("Appointment booked and payment sent for verification");
  } catch (error) {
    toast(error.message, "error");
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

renderApp();
