# Doctor Hub Project Notes

## Overview

Doctor Hub is a healthcare consultation and patient history management system. Patients can search doctors by disease and treatment type, book appointments, upload payment screenshots, and view protected medical history. Doctors can manage clinics and schedules, add prescriptions, and add new history records. Assistants verify payments and appointment status. Admins manage users and doctors. Super admins get full analytics and audit visibility.

## Roles

| Role | Access |
| --- | --- |
| Patient | Search doctors, book appointments, upload payment proof, view own history, message doctors |
| Doctor | View own appointments, manage clinics/schedule, add prescriptions and history records |
| Assistant | Verify payments, confirm/cancel appointments for assigned doctors |
| Admin | Manage users/doctors, view analytics, access operational records |
| Super Admin | Full system control and reporting |

## Appointment Workflow

1. Patient searches doctors.
2. Patient filters by disease or treatment type.
3. Patient books an appointment.
4. Payment proof is uploaded with the booking.
5. Assistant verifies or rejects payment.
6. Verified payment confirms the appointment.
7. Doctor adds prescription/history after consultation.

## Security

- Passwords are hashed with PBKDF2 and per-user salt.
- Tokens are signed with HMAC SHA-256.
- Protected routes require bearer token authentication.
- Role checks guard assistant, doctor, admin, and super admin actions.
- Medical history records have create/read behavior only.

## Future Enhancements

- AI disease prediction
- Video consultation
- WhatsApp notifications
- E-prescription PDF generation
- SQL database migration
- Cloud deployment
