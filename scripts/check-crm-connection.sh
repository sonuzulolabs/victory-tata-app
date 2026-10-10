#!/usr/bin/env bash
# Smoke-test Victory CRM ↔ mobile app API contract (reads .env; does not print secrets).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
set -a && source "$ROOT/.env" && set +a

ORIGIN="${EXPO_PUBLIC_API_URL%/}"
ORIGIN="${ORIGIN%/api/v1}"
KEY="${EXPO_PUBLIC_API_KEY:?EXPO_PUBLIC_API_KEY missing}"
BASE="${ORIGIN}/api/v1"
AUTH=( -H "Accept: application/json" -H "Authorization: Bearer ${KEY}" )

fail=0
ok() { echo "  OK  $1"; }
bad() { echo "  FAIL $1"; fail=1; }

echo "=== Config ==="
echo "  App origin: $ORIGIN"
echo "  API base:   $BASE"
if [[ -z "$KEY" ]]; then bad "API key empty"; else ok "API key set (${#KEY} chars)"; fi

echo ""
echo "=== Auth ==="
unauth=$(curl -sS -o /tmp/crm-body.json -w "%{http_code}" "${BASE}/dealership")
if [[ "$unauth" == "401" ]]; then ok "Unauthenticated returns 401"; else bad "Unauthenticated expected 401 got $unauth"; fi

echo ""
echo "=== GET endpoints (app uses these) ==="
check_get() {
  local path="$1" label="$2"
  local code body
  code=$(curl -sS -o /tmp/crm-body.json -w "%{http_code}" "${AUTH[@]}" "${BASE}${path}")
  body=$(cat /tmp/crm-body.json)
  if [[ "$code" != "200" ]]; then bad "$label HTTP $code"; echo "       $(echo "$body" | head -c 120)"; return; fi
  if ! echo "$body" | grep -q '"success":true'; then bad "$label success!=true"; return; fi
  ok "$label"
}

check_get "/dealership" "dealership"
check_get "/home" "home"
check_get "/offers?per_page=5&filter=featured" "offers (featured)"
check_get "/cars?per_page=5" "cars"

PHONE="9876543210"
check_get "/customers?phone=${PHONE}" "customers (seed phone)"
check_get "/referrals?phone=${PHONE}" "referrals"
check_get "/test-drives?phone=${PHONE}" "test-drives"
check_get "/points?phone=${PHONE}" "points"
check_get "/rewards?phone=${PHONE}" "rewards"

OFFER_ID=$(grep -o '"id":[0-9]*' /tmp/crm-body.json 2>/dev/null | head -1 | cut -d: -f2)
# Re-fetch offers for id
curl -sS "${AUTH[@]}" "${BASE}/offers?per_page=1&filter=featured" -o /tmp/crm-offers.json
OFFER_ID=$(python3 -c "import json; d=json.load(open('/tmp/crm-offers.json')); print(d['data']['offers'][0]['id'])" 2>/dev/null || true)
if [[ -n "$OFFER_ID" ]]; then
  check_get "/offers/${OFFER_ID}" "offer detail #${OFFER_ID}"
else
  bad "offer detail (no offer id from list)"
fi

echo ""
echo "=== URL alignment (home images vs EXPO_PUBLIC_API_URL) ==="
curl -sS "${AUTH[@]}" "${BASE}/home" -o /tmp/crm-home.json
HOST_EXPECTED=$(python3 -c "from urllib.parse import urlparse; print(urlparse('$ORIGIN').netloc)")
python3 <<PY
import json, sys
from urllib.parse import urlparse
expected = "$HOST_EXPECTED"
data = json.load(open("/tmp/crm-home.json"))["data"]
urls = []
rb = data.get("refer_banner") or {}
if rb.get("image_url"):
    urls.append(rb["image_url"])
for o in data.get("offers_for_you") or []:
    if o.get("image_url"):
        urls.append(o["image_url"])
if not urls:
    print("  WARN no image URLs in /home")
    sys.exit(0)
bad = [u for u in urls if urlparse(u).netloc != expected]
if bad:
    print("  FAIL image host mismatch (expected", expected + ")")
    for u in bad[:3]:
        print("       ", u)
    sys.exit(1)
print("  OK  all", len(urls), "home image URL(s) use", expected)
PY
[[ $? -eq 0 ]] || fail=1

echo ""
echo "=== Sample image HTTP ==="
IMG=$(python3 -c "import json; d=json.load(open('/tmp/crm-home.json')); print((d['data'].get('refer_banner') or {}).get('image_url') or '')")
if [[ -n "$IMG" ]]; then
  img_code=$(curl -sS -o /dev/null -w "%{http_code}" -L "$IMG")
  if [[ "$img_code" == "200" ]]; then ok "refer banner image HTTP $img_code"; else bad "refer banner image HTTP $img_code"; fi
else
  echo "  SKIP no refer banner image"
fi

echo ""
if [[ "$fail" -eq 0 ]]; then
  echo "All checks passed."
  exit 0
else
  echo "Some checks failed."
  exit 1
fi
