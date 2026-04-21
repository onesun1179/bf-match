#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_INPUT_DIR="/Users/dongwon/Downloads/mTLS"
DEFAULT_OUTPUT_PATH="${DEFAULT_INPUT_DIR}/bf-match-client.p12"
DEFAULT_KEY_PATH="${DEFAULT_INPUT_DIR}/bf-match_private.key"
DEFAULT_CERT_PATH="${DEFAULT_INPUT_DIR}/bf-match_public.crt"

KEY_PATH="${1:-$DEFAULT_KEY_PATH}"
CERT_PATH="${2:-$DEFAULT_CERT_PATH}"
OUTPUT_PATH="${3:-$DEFAULT_OUTPUT_PATH}"
PASSWORD="${4:-change-this-password}"

if [[ ! -f "$KEY_PATH" ]]; then
  echo "Missing private key: $KEY_PATH"
  exit 1
fi

if [[ ! -f "$CERT_PATH" ]]; then
  echo "Missing certificate: $CERT_PATH"
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"

openssl pkcs12 -export \
  -inkey "$KEY_PATH" \
  -in "$CERT_PATH" \
  -name "bf-match-toss-mtls" \
  -out "$OUTPUT_PATH" \
  -passout "pass:${PASSWORD}"

cat <<EOF
Done.
- input key:  $KEY_PATH
- input cert: $CERT_PATH
- output p12: $OUTPUT_PATH

Set these env values:
APP_TOSS_MTLS_PKCS12_PATH=$OUTPUT_PATH
APP_TOSS_MTLS_PKCS12_PASSWORD=$PASSWORD
EOF
