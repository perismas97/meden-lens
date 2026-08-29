# Meden Lens Frontend

Minimal React dashboard for reviewing AI agent execution runs from the Meden Lens API.

The dashboard includes simulator controls for creating sample runs from the browser.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

The app defaults to:

```text
http://localhost:5173
```

The backend API defaults to:

```text
http://localhost:8080
```

To point the frontend at a different backend, create `.env.local`:

```text
VITE_MEDEN_API_BASE_URL=http://localhost:8080
```
