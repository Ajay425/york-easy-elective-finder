#!/usr/bin/env bash

# Run the full pipeline:
# 1) run step1_PythonCourseScraper/step_1_open_subject.py inside its virtualenv
# 2) once step1 finishes, run step2_courseParsing/runPipeline.js with node
#
# This script detaches into a screen session so it can run for days and be attached later.
# Usage:
#   ./run_full_pipeline.sh         # starts in a detached screen session
#   ./run_full_pipeline.sh --attach  # starts (or reuses) a screen session and attaches to it
#
# You can also use screen directly:
#   screen -r york_pipeline

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STEP1_DIR="$SCRIPT_DIR/step1_PythonCourseScraper"
STEP2_DIR="$SCRIPT_DIR/step2_courseParsing"
SCREEN_SESSION="york_pipeline"
RUNTIME_PIPELINE_DIR="$SCRIPT_DIR/runtime/pipeline"
LOGFILE="$RUNTIME_PIPELINE_DIR/pipeline.log"

mkdir -p "$RUNTIME_PIPELINE_DIR"

# Use the venv from step1 for the python run.
VENV_PYTHON="$STEP1_DIR/venv/bin/python"
if [ ! -x "$VENV_PYTHON" ]; then
  echo "ERROR: could not find python in virtualenv at $VENV_PYTHON" >&2
  echo "Make sure you have created the venv in $STEP1_DIR/venv." >&2
  exit 1
fi

# Build the command that runs both steps.
# NOTE: We expand $STEP1_DIR / $VENV_PYTHON / $STEP2_DIR now (in this script),
# but keep $(date) for the remote shell to evaluate when the pipeline runs.
CMD=$(cat <<EOF
set -euo pipefail

echo "==> [\$(date)] running step1 (scrape subjects)"
cd "$STEP1_DIR"

# NOTE: step1 can take a long time. Output is captured in the screen log.
"$VENV_PYTHON" step_1_open_subject.py

# Once step1 completes, run the parsing pipeline.
echo "==> [\$(date)] step1 complete; running step2 (runPipeline.js)"

cd "$STEP2_DIR"
node runPipeline.js

echo "==> [\$(date)] step2 complete; exporting static frontend data"
cd "$SCRIPT_DIR"
node scripts/exportStaticFrontendData.js

echo "==> [\$(date)] pipeline finished"
EOF
)

start_screen() {
  echo "Starting screen session '$SCREEN_SESSION' (log: $LOGFILE)"
  # -L enables logging to the -Logfile
  screen -S "$SCREEN_SESSION" -L -Logfile "$LOGFILE" -dm bash -lc "$CMD"
}

# If user requests attach, create the session if missing then attach.
if [ "${1:-}" = "--attach" ]; then
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
