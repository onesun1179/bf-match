#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATUS_DIR="$(mktemp -d)"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  trap - INT TERM EXIT
  if [[ -n "${BACKEND_PID}" ]]; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID}" ]]; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  rm -rf "${STATUS_DIR}"
}

run_service() {
  local name="$1"
  local command="$2"
  (
    set +e
    "${command}" &
    local service_pid=$!
    trap 'kill "${service_pid}" 2>/dev/null || true; wait "${service_pid}" 2>/dev/null || true; exit 143' INT TERM
    wait "${service_pid}"
    local code=$?
    echo "${code}" > "${STATUS_DIR}/${name}"
    exit "${code}"
  ) &
}

trap cleanup INT TERM EXIT

run_service "backend" "${ROOT_DIR}/backend/run-prod.sh"
BACKEND_PID=$!

run_service "frontend" "${ROOT_DIR}/frontend/run-prod.sh"
FRONTEND_PID=$!

echo "Backend:  http://localhost:8080"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop both services."

while true; do
  if [[ -f "${STATUS_DIR}/backend" ]]; then
    code="$(cat "${STATUS_DIR}/backend")"
    echo "Backend exited with code ${code}. Stopping frontend."
    cleanup
    exit "${code}"
  fi
  if [[ -f "${STATUS_DIR}/frontend" ]]; then
    code="$(cat "${STATUS_DIR}/frontend")"
    echo "Frontend exited with code ${code}. Stopping backend."
    cleanup
    exit "${code}"
  fi
  sleep 1
done
