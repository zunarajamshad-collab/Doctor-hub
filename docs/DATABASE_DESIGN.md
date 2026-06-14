# Database Design

The local project uses `data/db.json` as a simple datastore. Collections are shaped like database tables so the same design can be migrated to MySQL, PostgreSQL, or MongoDB.

## Tables

### users

Stores authentication and role data.

- `id`
- `name`
- `email`
- `role`
- `phone`
- `status`
- `passwordHash`
- `createdAt`

### doctors

Stores doctor profile and search data.

- `id`
- `userId`
- `name`
- `treatmentType`
- `specialization`
- `diseases`
- `fee`
- `rating`
- `experienceYears`
- `assistantId`
- `schedule`
- `clinicIds`

### patients

Stores patient profile details.

- `id`
- `userId`
- `bloodGroup`
- `allergies`
- `emergencyContact`

### appointments

Tracks booking workflow.

- `id`
- `patientId`
- `doctorId`
- `clinicId`
- `date`
- `time`
- `symptoms`
- `status`
- `createdAt`

### payments

Tracks payment verification.

- `id`
- `appointmentId`
- `patientId`
- `amount`
- `screenshotName`
- `screenshotData`
- `status`
- `verifiedBy`
- `verifiedAt`
- `createdAt`

### prescriptions

Stores doctor prescriptions. Records are not editable through the API.

- `id`
- `patientId`
- `doctorId`
- `appointmentId`
- `diagnosis`
- `medicines`
- `notes`
- `createdAt`

### medical_history

Stores protected patient records. Records are append-only.

- `id`
- `patientId`
- `doctorId`
- `appointmentId`
- `type`
- `title`
- `diagnosis`
- `notes`
- `medicines`
- `createdBy`
- `createdAt`

### assistants

Maps assistants to doctors.

- `id`
- `userId`
- `assignedDoctorIds`

### clinics

Stores clinic and payment account data.

- `id`
- `doctorId`
- `name`
- `city`
- `address`
- `paymentAccount`

### messages

Stores patient-doctor communication.

- `id`
- `fromUserId`
- `toUserId`
- `text`
- `createdAt`

### auditLog

Stores important system actions for admin review.

- `id`
- `actorId`
- `action`
- `meta`
- `createdAt`
