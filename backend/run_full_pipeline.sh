#!/usr/bin/env bash

# Run the full pipeline:
# 1) run step1_PythonCourseScraper/step_1_open_subject.py inside its virtualenv
# 2) once step1 finishes, run the JSON parser/export pipeline with node
#
# This script detaches into a screen session so it can run for days and be attached later.
# Usage:
#   ./run_full_pipeline.sh          # resume from existing scraper output/progress
#   ./run_full_pipeline.sh --fresh  # archive scraper output/progress and start over
#   ./run_full_pipeline.sh --attach # starts/reuses a screen session and attaches to it
#
# You can also use screen directly:
#   screen -r york_pipeline

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STEP1_DIR="$SCRIPT_DIR/step1_PythonCourseScraper"
SCREEN_SESSION="york_pipeline"
RUNTIME_PIPELINE_DIR="$SCRIPT_DIR/runtime/pipeline"
LOGFILE="$RUNTIME_PIPELINE_DIR/pipeline.log"

mkdir -p "$RUNTIME_PIPELINE_DIR"

ATTACH=0
FRESH_START=0

for arg in "$@"; do
  case "$arg" in
    --attach)
      ATTACH=1
      ;;
    --fresh)
      FRESH_START=1
      ;;
    *)
      echo "ERROR: unknown argument: $arg" >&2
      echo "Usage: $0 [--attach] [--fresh]" >&2
      exit 1
      ;;
  esac
done

# Use the venv from step1 for the python run.
VENV_PYTHON="$STEP1_DIR/venv/bin/python"
if [ ! -x "$VENV_PYTHON" ]; then
  echo "ERROR: could not find python in virtualenv at $VENV_PYTHON" >&2
  echo "Make sure you have created the venv in $STEP1_DIR/venv." >&2
  exit 1
fi

FRESH_ENV=""
if [ "$FRESH_START" = "1" ]; then
  FRESH_ENV="FORCE_FRESH_SCRAPE=1 CONFIRM_FORCE_FRESH_SCRAPE=1"
fi

# Build the command that runs both steps.
# NOTE: We expand $STEP1_DIR / $VENV_PYTHON / $STEP2_DIR now (in this script),
# but keep $(date) for the remote shell to evaluate when the pipeline runs.
CMD=$(cat <<EOF
set -euo pipefail

echo "==> [\$(date)] running step1 (scrape subjects)"
cd "$STEP1_DIR"

# NOTE: step1 can take a long time. Output is captured in the screen log.
env -u FORCE_FRESH_SCRAPE -u CONFIRM_FORCE_FRESH_SCRAPE ${FRESH_ENV} "$VENV_PYTHON" step_1_open_subject.py

# Once step1 completes, run the parsing/export pipeline.
echo "==> [\$(date)] step1 complete; running JSON pipeline"

cd "$SCRIPT_DIR"
npm run pipeline

echo "==> [\$(date)] publishing generated frontend course data"
git -C "$REPO_ROOT" add \
  frontend/yorku-elective-tracker/public/data/electives.json \
  frontend/yorku-elective-tracker/public/data/course_meta.json

if git -C "$REPO_ROOT" diff --cached --quiet -- \
  frontend/yorku-elective-tracker/public/data/electives.json \
  frontend/yorku-elective-tracker/public/data/course_meta.json; then
  echo "==> [\$(date)] no frontend course data changes to publish"
else
  git -C "$REPO_ROOT" commit --only \
    frontend/yorku-elective-tracker/public/data/electives.json \
    frontend/yorku-elective-tracker/public/data/course_meta.json \
    -m "chore: update course data"

  pushed=0
  for attempt in 1 2 3; do
    if git -C "$REPO_ROOT" push origin main; then
      pushed=1
      break
    fi

    if [ "$attempt" -lt 3 ]; then
      echo "==> [\$(date)] remote changed; rebasing course data commit (retry $((attempt + 1))/3)"
      git -C "$REPO_ROOT" fetch origin main
      git -C "$REPO_ROOT" rebase origin/main
    fi
  done

  if [ "$pushed" -ne 1 ]; then
    echo "ERROR: could not push course data after 3 attempts" >&2
    exit 1
  fi

  echo "==> [\$(date)] frontend course data pushed"
fi

echo "==> [\$(date)] pipeline finished"
EOF
)

start_screen() {
  echo "Starting screen session '$SCREEN_SESSION' (log: $LOGFILE)"
  # -L enables logging to the -Logfile
  screen -S "$SCREEN_SESSION" -L -Logfile "$LOGFILE" -dm bash -lc "$CMD"
}

# If user requests attach, create the session if missing then attach.
if [ "$ATTACH" = "1" ]; then
  if ! screen -list | grep -q "\.${SCREEN_SESSION}\b"; then
    start_screen
  fi
  screen -r "$SCREEN_SESSION"
  exit
fi

# Otherwise, run detached; create the session if it does not exist.
if screen -list | grep -q "\.${SCREEN_SESSION}\b"; then
  echo "Screen session '$SCREEN_SESSION' is already running."
  echo "Attach with: screen -r $SCREEN_SESSION"
  echo "View log: $LOGFILE"
  exit 0
fi

start_screen

echo "Started as a detached screen session named '$SCREEN_SESSION'."
echo "Attach with: screen -r $SCREEN_SESSION"
echo "Log file: $LOGFILE"
