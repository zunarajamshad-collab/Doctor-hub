# Doctor Hub

Doctor Hub is a final semester healthcare consultation and patient history management project. It includes role-based dashboards for patients, doctors, assistants, admins, and super admins.

## Run

```powershell
cd C:\Users\Ali\Documents\Doctor\doctor-hub
node server.js
```

Open:

```text
http://localhost:3000
```

The project has no npm dependencies. It uses Node.js built-in modules and a JSON datastore at `data/db.json`.

## Demo Accounts

Every seeded account uses this password:

```text
password123
```

| Role | Email |
| --- | --- |
| Patient | patient@doctorhub.test |
| Doctor | doctor.allo@doctorhub.test |
| Assistant | assistant@doctorhub.test |
| Admin | admin@doctorhub.test |
| Super Admin | superadmin@doctorhub.test |

## Features

- User registration and login
- JWT-style authentication
- PBKDF2 password hashing
- Role-based access control
- Doctor search by disease, treatment type, and text
- Appointment booking
- Payment proof upload and verification
- Clinic and schedule management
- Prescription creation
- Append-only medical history
- Patient-doctor messages
- Admin user and doctor management
- Super admin analytics and audit log

## REST API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register patient or doctor |
| POST | `/api/auth/login` | Login and receive token |
| GET | `/api/doctors` | Search doctors |
| POST | `/api/appointments` | Book appointment |
| POST | `/api/payments` | Upload payment proof |
| PATCH | `/api/payments/:id/verify` | Verify or reject payment |
| GET | `/api/history` | View medical history |
| POST | `/api/history` | Add immutable medical record |
| POST | `/api/prescriptions` | Add prescription |
| GET | `/api/analytics` | Admin analytics |

## Project Structure

```text
doctor-hub/
  server.js
  package.json
  public/
    index.html
    styles.css
    app.js
    healthcare-visual.png
  data/
    db.json
  docs/
    PROJECT_NOTES.md
    DATABASE_DESIGN.md
  scripts/
    generate-hero.js
```

## Medical History Rule

Medical history and prescription records are append-only. The backend intentionally does not expose edit or delete endpoints for previous prescriptions or medical history.
