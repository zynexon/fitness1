# Zynexon - The War Within

Full-stack starter using React (Vite) + Django REST Framework + JWT auth.

## Stack

- Frontend: React + Vite + Tailwind
- Backend: Django + DRF + SimpleJWT
- DB: SQLite (can be switched to Postgres for production)

## Environment Setup

1. Frontend env
  - Copy `frontend/.env.example` to `frontend/.env`
  - Set:
    - `VITE_API_BASE_URL` (local: `http://127.0.0.1:8000`)

2. Backend env
  - Copy `backend/.env.example` to `backend/.env`
  - Set:
    - `DEBUG`
    - `ALLOWED_HOSTS`
    - `CORS_ALLOWED_ORIGINS`
    - `CSRF_TRUSTED_ORIGINS`
    - `FRONTEND_APP_URL` (used to build password reset links)
    - `EMAIL_BACKEND`, `DEFAULT_FROM_EMAIL`, `PASSWORD_RESET_TOKEN_MAX_AGE_SECONDS`
    - For real email delivery in production: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `EMAIL_USE_SSL`, `EMAIL_TIMEOUT`

## Run Locally

1. Start backend

```powershell
cd backend
.\.venv\Scripts\python manage.py runserver 8000
```

2. Start frontend in a second terminal

```powershell
cd frontend
npm run dev
```

## Railway + Vercel Deployment Connection

1. Deploy backend to Railway using `backend/requirements.txt` and start command:

```powershell
python manage.py migrate && python manage.py seed_tasks && python manage.py runserver 0.0.0.0:$PORT
```

2. On Railway set envs:
  - `DEBUG=0`
  - `ALLOWED_HOSTS=your-railway-domain.up.railway.app`
  - `CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app`
  - `CSRF_TRUSTED_ORIGINS=https://your-vercel-app.vercel.app`

3. On Vercel set frontend env:
  - `VITE_API_BASE_URL=https://your-railway-domain.up.railway.app`

Once set, frontend calls backend using absolute API URL, and Railway accepts requests from your Vercel domain.
