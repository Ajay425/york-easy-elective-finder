# Backend Setup and Run

This backend is now structured to run from any machine without relying on the current working directory.

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database
- Python 3.10+ only if you run the scraper pipeline step 1

## First-time setup

1. Copy environment template:
   - `cp .env.example .env`
2. Fill required values in `.env`:
   - `DATABASE_URL`
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`
3. Install and prepare local files:
   - `npm run setup`
4. Apply database migrations:
   - `npm run db:migrate`

## Run services

- API backend:
  - `npm start`

## Trending searches (REST)

- Read current top trending searches:
  - `GET /courses/trending`
- Track a query and return updated trending:
  - `POST /courses/trending/track`
  - Body: `{ "query": "EECS 1015" }`

## Pipeline scripts

- Run parsing pipeline directly:
  - `npm run pipeline`
- Export the current scraped course data into the static frontend:
  - `npm run export:frontend`
- Run parsing pipeline, then export static frontend data:
  - `npm run pipeline:export`
- Run full long-running scraper + parser in screen:
  - `npm run pipeline:full`

`pipeline:full` also runs the static frontend export after the scraper/parser finishes.
The public frontend reads `frontend/yorku-elective-tracker/public/data/electives.json`
and `frontend/yorku-elective-tracker/public/data/course_meta.json`, so the API server does
not need to stay online for normal student browsing.

The static export uses `step2_courseParsing/all_courses.json` first when that active parser
output exists. After a successful pipeline run, `runPipeline.js` moves that file into
`step2_courseParsing/archive/`, so the exporter falls back to the newest matching completed
archive for the current session term/year. `course_meta.json` records the selected source,
its modified time, and whether raw `step1_PythonCourseScraper/york_courses` files appear
newer than the selected JSON.

## Local files auto-created by setup

The setup flow creates missing local data files and directories safely:

- `runtime/state/count.json`
- `runtime/state/apiUsage.json`
- `runtime/state/trending.json`
- `runtime/pipeline/pipeline.log`
- `step2_courseParsing/step13_coursesWithoutRealPrereqs.json`
- `step2_courseParsing/archive/`
- `step2_courseParsing/logs/`

The setup script also migrates older scattered files into `runtime/` when found.

## Notes

- Path handling is absolute across runtime + parsing scripts, so launching commands from different directories is supported.
- `step2_courseParsing/all_courses.json` is the active parser output while a run is in progress;
  successful runs archive it under `step2_courseParsing/archive/`.
- Mutable runtime artifacts are centralized under `runtime/` to keep source folders clean.
