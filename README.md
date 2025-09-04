# Infosys Training & Examination Platform

Full‑stack MERN style application providing:
* User authentication (candidate, examiner, trainer, coordinator)
* Training session creation & enrollment
* Session calendar with highlighting
* Examiner availability management & exam allocation logic
* Email notifications for enrollment
* Real‑time session update broadcast via Socket.IO

## Backend
Tech: Express 5, Mongoose 8, JWT auth, Socket.IO, Nodemailer.

### Run
1. Copy backend/.env.example to backend/.env and set secrets.
2. Install deps:
	npm install --prefix backend
3. Start dev server:
	npm run dev --prefix backend

Server defaults to http://localhost:5000

### API (selected)
Auth:
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me (auth)

Sessions (auth):
POST /api/sessions/create (trainer)
GET  /api/sessions/my-sessions (trainer)
DELETE /api/sessions/:id (trainer owner)
POST /api/sessions/enroll/:id (candidate)
GET  /api/sessions/available (candidate)
GET  /api/sessions/enrolled (candidate)
GET  /api/sessions/highlight-dates

Examiner:
POST /api/examiner/availability/toggle
GET  /api/examiner/availability
GET  /api/examiner/calendar
POST /api/examiner/allocate-exam
GET  /api/examiner/candidate-exams (candidate)
GET  /api/examiner/exams-by-date?date=ISO

## Frontend
Tech: React 19 + Vite 6, Tailwind (via @tailwindcss/vite), React Router, react-calendar.

### Run
1. Install deps:
	npm install --prefix frontend
2. Start dev server (proxy to backend):
	npm run dev --prefix frontend

Frontend at http://localhost:5173 (default Vite) with /api proxied to backend.

## Development Notes
* JWT secret and email creds must be set in environment (never commit real secrets).
* Real‑time: client can subscribe to 'session-updated' Socket.IO events.
* Exam allocation logic ensures a candidate only gets an exam after 3 weeks of sessions, without date conflicts.

## Roadmap / Ideas
* Add automated tests (Jest + Supertest) for controllers.
* Add role-based route guards on frontend.
* Add password reset & email verification.
* Containerize with Docker Compose (Mongo + backend + frontend).
* Add CI pipeline (lint, test) & production build docs.

## License
MIT