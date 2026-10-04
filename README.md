# QuizCloud — Cloud Based Quiz Application

A full-stack quiz platform built with HTML/CSS/JavaScript, Node.js/Express, Supabase PostgreSQL/Auth, and Razorpay.

## Run locally

### Backend
```bash
cd backend
npm install
npm run dev
```
Backend: `http://localhost:5001`

### Frontend
From the project root:
```bash
python3 -m http.server 8001 --directory frontend
```
Frontend: `http://localhost:8001/login.html`

## Environment
Copy `backend/.env.example` to `backend/.env` and add your own Supabase/Razorpay credentials. Never commit secrets.

## Database
Run `backend/sql/supabase-schema.sql` in Supabase SQL Editor. After creating an admin account, promote it with the commented SQL statement at the bottom of the schema.

## Main flow
Register/Login → Dashboard → Quiz Arena → Education → Stream → Subject → Topic → Quiz → Questions → Server-side Submit → Result → Progress / Achievements / Leaderboard.
