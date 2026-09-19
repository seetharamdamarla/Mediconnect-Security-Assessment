# MediConnect — Healthcare Platform & Security Assessment

> **Comprehensive Security & Compliance Assessment**: OWASP Top 10 remediation, HIPAA Security Rule alignment (79% compliance), real-time security logging, and automated CI/CD security pipeline.

---

## Security Assessment & Deliverables

All technical deliverables, audit reports, threat models, and Burp Suite verification evidence are organized in this repository:

| Deliverable | Description | Link |
| :--- | :--- | :--- |
| **Master Security & Compliance Report** | Executive summary, methodology, vulnerability register, HIPAA controls & remediation roadmap | [docs/security_compliance_report.md](docs/security_compliance_report.md) |
| **OWASP Top 10 & Vulnerability Register** | Detailed technical analysis of all 10 identified vulnerabilities with CVSS scores | [docs/owasp_top10_and_vulnerability_register.md](docs/owasp_top10_and_vulnerability_register.md) |
| **Architecture & Threat Model** | STRIDE threat model, trust boundaries, and data flow analysis | [docs/architecture_dataflow_threat_model.md](docs/architecture_dataflow_threat_model.md) |
| **HIPAA Compliance Matrix** | Technical safeguard mapping (§164.312) raising compliance from 43% to 79% | [docs/hipaa_compliance_mapping.md](docs/hipaa_compliance_mapping.md) |
| **Incident Response Playbook** | 6-phase triage, containment, eradication, and notification procedures | [docs/incident_response_playbook.md](docs/incident_response_playbook.md) |
| **Burp Suite Evidence Screenshots** | 15 empirical before-and-after exploit and remediation proofs | [`evidence/burp_screenshots/`](evidence/burp_screenshots/) |
| **CI/CD Security Automation** | 4-stage GitHub Actions pipeline (Gitleaks, npm audit, Semgrep SAST, Regressions) | [`.github/workflows/security.yml`](.github/workflows/security.yml) |

---

## About MediConnect

MediConnect is a full-stack web application built with React for the frontend, Express.js for the backend, and PostgreSQL for the database. The system is designed to connect patients, doctors, and admins in a healthcare environment, allowing users to manage appointments, prescriptions, profiles, and communications through real-time chat. It implements Role-Based Access Control (RBAC) for different user roles (patient, doctor, admin) with secure authentication and profile management.

## Table of Contents

- [Security Assessment & Deliverables](#️-security-assessment--deliverables)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Project Setup](#project-setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the App](#running-the-app)
- [API Routes](#api-routes)
- [Database Structure](#database-structure)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Authentication & Authorization**: Users can register, log in, and securely manage their sessions. The app uses JWT for authentication and role-based access control (RBAC).
- **Profile Setup & Management**: Users must complete their profiles based on their role (patient, doctor, or admin) before they are fully registered.
- **Appointments**: Patients can book appointments with doctors, and doctors can view their schedules.
- **Prescription Management**: Doctors can add prescriptions for patients, which include the medication details, dosage, and instructions.
- **Real-time Chat**: Users (patients and doctors) can communicate in real-time through a live bidirectional chat system powered by Socket.IO.
- **Admin Dashboard**: Admins can manage users, view statistics, and monitor the platform's health.



### `GET /activity/recent`

- **Summary:** Get recent activity logs  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – Recent activities

---

## Admin

### `GET /admin/summary`

- **Summary:** Get admin dashboard summary  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – Admin summary

### `GET /admin/users`

- **Summary:** Get all users  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of all users

### `GET /admin/doctors`

- **Summary:** Get all doctors  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of doctors

### `GET /admin/patients`

- **Summary:** Get all patients  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of patients

### `GET /admin/admins`

- **Summary:** Get all admins  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of admins

### `DELETE /admin/delete/{userId}`

- **Summary:** Delete a user by ID  
- **Path Parameters:**  
  - `userId` (string, required)  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – User deleted

---

## Appointments

### `POST /appointments/availability`

- **Summary:** Doctor adds availability  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `201` – Availability added

### `GET /appointments/availability`

- **Summary:** Get all doctor availabilities  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of availability

### `GET /appointments/availability/my`

- **Summary:** Doctor’s own availability  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – Doctor’s availability

### `DELETE /appointments/availability/{id}`

- **Summary:** Doctor deletes availability by ID  
- **Path Parameters:**  
  - `id` (string, required)  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – Availability deleted

### `POST /appointments/book`

- **Summary:** Patient books appointment  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `201` – Appointment booked

### `GET /appointments/appointments/patient/my`

- **Summary:** Patient’s own appointments  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of patient’s appointments

### `GET /appointments/appointments/my`

- **Summary:** Doctor’s own appointments  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of doctor’s appointments

### `PUT /appointments/{id}/approve`

- **Summary:** Doctor approves appointment  
- **Path Parameters:**  
  - `id` (string, required)  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – Appointment approved

### `PUT /appointments/{id}/cancel`

- **Summary:** Cancel appointment (Doctor or Patient)  
- **Path Parameters:**  
  - `id` (string, required)  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – Appointment cancelled

---

## Auth

### `POST /auth/register`

- **Summary:** User registration  
- **Responses:**  
  - `201` – User registered

### `POST /auth/login`

- **Summary:** User login  
- **Responses:**  
  - `200` – User logged in

### `POST /auth/logout`

- **Summary:** User logout  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – User logged out

### `GET /auth/registration-role`

- **Summary:** Get registration role info  
- **Responses:**  
  - `200` – Registration role info

---

## Chat

### `GET /chat/doctors`

- **Summary:** Get available doctors for patient  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of doctors

### `GET /chat/chatted-doctors`

- **Summary:** Get doctors patient chatted with  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of chatted doctors

### `GET /chat/patients`

- **Summary:** Get patients for doctor  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of patients

### `GET /chat/chatted-patients`

- **Summary:** Get patients doctor chatted with  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of chatted patients

### `GET /chat/history/room/{roomId}`

- **Summary:** Get chat history by room ID  
- **Path Parameters:**  
  - `roomId` (string, required)  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – Chat history

### `GET /chat/unread`

- **Summary:** Get unread messages  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of unread messages

---

## Drugs

### `GET /drugs`

- **Summary:** Get all drugs  
- **Responses:**  
  - `200` – List of drugs

### `GET /drugs/search`

- **Summary:** Search for drugs  
- **Responses:**  
  - `200` – Search results

---

## Prescriptions

### `POST /prescriptions/add`

- **Summary:** Add a prescription  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `201` – Prescription added

### `GET /prescriptions/my`

- **Summary:** Get prescriptions for patient  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of prescriptions

### `GET /prescriptions/by-doctor`

- **Summary:** Get prescriptions written by doctor  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – List of prescriptions

### `PUT /prescriptions/end/{id}`

- **Summary:** End a prescription  
- **Path Parameters:**  
  - `id` (string, required)  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – Prescription ended

---

## Profile Setup

### `PUT /profile/setup`

- **Summary:** Setup user profile  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – Profile setup completed

---

## Protected

### `GET /protected`

- **Summary:** Access protected route  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – Access granted

---

## Symptoms

### `POST /symptoms/log`

- **Summary:** Log patient symptom  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `201` – Symptom logged

### `GET /symptoms/history`

- **Summary:** Get symptom history for patient  
- **Security:**  
  - `bearerAuth`  
- **Responses:**  
  - `200` – Symptom history

---
## Technologies Used

- **Frontend**:
  - React.js
  - React Router for routing
  - Zod
  - Socket.IO client

- **Backend**:
  - Express.js for handling HTTP requests
  - JWT for user authentication
  - Socket.IO for real-time communication
  - PostgreSQL database for data storage
  - bcryptjs for password hashing
  - Zod for schema validation

- **Deployment**:
  - Deployed on Vercel for frontend
  - Backend hosted on Render
  - PostgreSQL database on Render

## Project Setup

### Prerequisites

To get this project up and running, you will need the following:

- Node.js (version >= 14.x)
- PostgreSQL instance for the database
- npm for managing dependencies

### Running Locally

To run the MediConnect application locally, clone this repository. 
Then, run `npm install` to install all of the necessary packages, first in the backend folder and then in the frontend folder. 
Afterwords, the project may be started using the `npm start` command, once again starting in the backend folder and then the frontend.
Tests can be run using `npm run tests` and `npm run tests:integration`.

