# Research Pipeline UI

Frontend for your multi-agent research pipeline (search → reader → writer → critic).

## 1. Start the backend

In your Python project folder (where `agents.py`, `pipeline.py`, `.env` live), add `api_server.py`
(provided separately), then:

```bash
pip install fastapi "uvicorn[standard]"
uvicorn api_server:app --reload --port 8000
```

Check it's alive at http://127.0.0.1:8000/api/health — you should see `{"status":"ok"}`.
(Visiting http://127.0.0.1:8000/ itself will 404 — that's expected, it's an API, not a webpage.)

## 2. Start this frontend

In this folder:

```bash
npm install
npm run dev
```

Then open the URL it prints — usually http://localhost:5173.

## Configuration

The UI calls `http://localhost:8000` by default. If your backend runs somewhere else, change
`API_BASE` near the top of `src/ResearchUI.jsx`.
