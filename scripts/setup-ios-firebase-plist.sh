#!/usr/bin/env bash
# Register the iOS app in Firebase and replace GoogleService-Info.plist for App Store builds.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$ROOT/GoogleService-Info.plist"
BUNDLE_ID="com.zulolabs.victorytata"

cat <<EOF
=== Firebase iOS setup (required once) ===

1. Open https://console.firebase.google.com/project/victory-tata/settings/general
2. Under "Your apps", click "Add app" → iOS.
3. Bundle ID: ${BUNDLE_ID}  (must match app.json)
4. Download GoogleService-Info.plist
5. Replace the file at:
   ${PLIST}

6. In Firebase → Authentication → Sign-in method:
   - Enable Google and Phone (if you use them in the app).

7. For Google Sign-In on iOS:
   - Firebase adds an iOS OAuth client when you enable Google sign-in.
   - Re-download GoogleService-Info.plist if you change sign-in providers.

8. For Phone auth on iOS (production):
   - Apple Developer → Keys → create an APNs key.
   - Firebase → Project settings → Cloud Messaging → Apple app configuration → upload the .p8 key.
   - Enable Push Notifications capability for App ID ${BUNDLE_ID}.

9. Validate:
   ./scripts/check-ios-publish-ready.sh

10. Build & submit:
   eas build --platform ios --profile production
   eas submit --platform ios --profile production --latest

EOF

if [[ -f "$PLIST" ]] && ! grep -q 'REPLACE_ME_DOWNLOAD_FROM_FIREBASE' "$PLIST"; then
  echo "GoogleService-Info.plist is already configured."
fi
