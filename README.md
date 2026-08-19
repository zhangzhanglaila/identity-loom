# Identity Web

Local-first personal identity graph for accounts, login sources, and bindings.

## Stack

- Frontend: React + D3.js
- Backend: FastAPI
- Storage: Neo4j
- Runtime: Docker Compose

## Goals

- Record many accounts per platform
- Show relationship graph around `YOU`
- Keep private data out of git
- Support manual entry, JSON import, and CSV import

## Privacy

Real account data lives under `data/private/` and is ignored by git.

## Run

```bash
docker compose up --build
```

Then open:

- Frontend: http://localhost:5173
- API: http://localhost:8000
- Neo4j UI: http://localhost:7474

## CSV import

Use a combined CSV with a `record_type` column:

```csv
record_type,id,kind,name,source,target,relation_type,label,phone,email,username
node,you,you,YOU,,,,,,,
node,google,provider,Google,,,,,,,
relationship,rel_1,,,,you,google,owns,owns,,,
```

