GUHack2025 backend
===================

This folder contains the FastAPI backend for GUHack2025. The project follows a
simple feature-based layout:

- main.py - application entrypoint (creates FastAPI app and includes routers)
- db.py - Supabase client and DB helpers
- routers/ - API routers (one file per feature)
- services/ - business logic wrappers
- models/ - pydantic models (optional split)
- utils/ - small helpers (logger, date utils)

Quick start (development):

1. Create a `.env` file in this folder with SUPABASE_URL and SUPABASE_KEY, or set env vars.
2. Install dependencies (recommended in a venv):

```bash
pip install -r requirements.txt
```

3. Run the app:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

Cleanup note
------------
Some legacy helper scripts may exist in this folder (e.g. quick test scripts).
We recommend moving one-off scripts into `backend/scripts/` or `backend/tools/` to keep the main package clean.
