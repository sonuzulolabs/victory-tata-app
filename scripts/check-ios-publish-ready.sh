#!/usr/bin/env bash
# Validates iOS App Store / EAS build prerequisites before eas build --platform ios.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$ROOT/GoogleService-Info.plist"
APP_JSON="$ROOT/app.json"

fail() {
  echo "check-ios-publish-ready: $*" >&2
  exit 1
}

[[ -f "$APP_JSON" ]] || fail "Missing app.json"

node - "$APP_JSON" <<'NODE'
const fs = require('fs');
const path = process.argv[2];
const { expo } = JSON.parse(fs.readFileSync(path, 'utf8'));
const ios = expo.ios ?? {};
if (!ios.bundleIdentifier) {
  console.error('app.json: expo.ios.bundleIdentifier is required');
  process.exit(1);
}
if (!ios.googleServicesFile) {
  console.error('app.json: expo.ios.googleServicesFile is required');
  process.exit(1);
}
console.log('Bundle ID:', ios.bundleIdentifier);
NODE

[[ -f "$PLIST" ]] || fail "Missing GoogleService-Info.plist (see scripts/setup-ios-firebase-plist.sh)"

if grep -q 'REPLACE_ME_DOWNLOAD_FROM_FIREBASE' "$PLIST"; then
  fail "GoogleService-Info.plist still has placeholders — run scripts/setup-ios-firebase-plist.sh"
fi

echo "OK — iOS publish config looks ready for eas build --platform ios --profile production"
