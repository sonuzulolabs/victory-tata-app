#!/usr/bin/env bash
# Show which Android SHA-1 fingerprints Firebase knows about (from google-services.json)
# and how to fix Google Sign-In DEVELOPER_ERROR on EAS / local builds.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GS="$ROOT/google-services.json"

if [[ ! -f "$GS" ]]; then
  echo "Missing google-services.json at $GS"
  exit 1
fi

node - "$GS" <<'NODE'
const fs = require('fs');
const path = process.argv[2];
const json = JSON.parse(fs.readFileSync(path, 'utf8'));
const clients = json.client ?? [];

console.log('=== Firebase Android app (google-services.json) ===\n');
for (const c of clients) {
  const pkg = c.client_info?.android_client_info?.package_name ?? '(unknown)';
  console.log('Package name:', pkg);
  const oauth = c.oauth_client ?? [];
  const androidClients = oauth.filter((o) => o.client_type === 1);
  const web = oauth.find((o) => o.client_type === 3);
  if (web) {
    console.log('Web client ID (use as webClientId):', web.client_id);
  }
  if (androidClients.length === 0) {
    console.log('SHA-1 fingerprints: (none — add SHA-1 in Firebase Console and re-download this file)\n');
    continue;
  }
  console.log('SHA-1 fingerprints registered in this file:');
  for (const a of androidClients) {
    const raw = a.android_info?.certificate_hash ?? '';
    const formatted = raw.replace(/(.{2})(?=.)/g, '$1:').toUpperCase();
    console.log('  -', formatted || raw);
  }
  console.log('');
}
NODE

cat <<'EOF'
=== Fix DEVELOPER_ERROR ===

Google Sign-In checks SHA-1. Phone OTP Play Integrity checks SHA-256 of the
*installed* APK, package com.zulolabs.victorytata.

Sideloaded EAS preview APKs still fail Play Integrity even with matching SHA.
Those builds force reCAPTCHA (EXPO_PUBLIC_FIREBASE_FORCE_RECAPTCHA=1). Production
Play Store installs use Play Integrity, so also add Play Console → App integrity
→ App signing key SHA-1 and SHA-256.

1. Get the SHA-1 of the build you installed:
   • EAS preview/production APK:
       npx eas-cli credentials -p android
     (open Keystore → copy SHA-1)
   • Local debug build (after prebuild):
       keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android -keypass android

2. Firebase Console → Project "victory-tata" → Project settings → Your apps
   → Android app (com.zulolabs.victorytata) → Add fingerprint → paste SHA-1

3. Authentication → Sign-in method → enable Google

4. Download fresh google-services.json → replace ./google-services.json

5. Rebuild the native app (required — not just expo start):
       npx eas-cli build --platform android --profile preview

EOF
