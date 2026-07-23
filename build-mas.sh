#!/bin/bash
#
# Builds and signs the universal Mac App Store .pkg for "Apps for Instagram".
#
# Safe keychain handling (differs from the original script which broke the
# system default keychain and failed to build the cert trust chain):
#   * NEVER changes the login/default keychain.
#   * Adds the temp keychain to the SEARCH LIST so codesign can build the
#     Apple Distribution -> WWDR -> Apple Root trust chain.
#   * Restores the original search list and removes the temp keychain on exit.
#
# Certificate password can be overridden via CSC_KEY_PASSWORD; defaults to the
# value the .p12 files in this repo were exported with.

set -uo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

KEYCHAIN_PATH="$REPO_DIR/build.keychain"
KEYCHAIN_PASSWORD="build"
P12_PASSWORD="${CSC_KEY_PASSWORD:-Mondialu13}"

# Capture the current user search list so we can restore it exactly on exit.
ORIGINAL_KEYCHAINS=$(security list-keychains -d user | sed -e 's/^[[:space:]]*//' -e 's/"//g')

cleanup() {
  echo "Cleaning up temp keychain (default/login keychain left untouched)..."
  # shellcheck disable=SC2086
  security list-keychains -d user -s $ORIGINAL_KEYCHAINS >/dev/null 2>&1
  security delete-keychain "$KEYCHAIN_PATH" >/dev/null 2>&1
}
trap cleanup EXIT

echo "Removing any stale temp keychain..."
security delete-keychain "$KEYCHAIN_PATH" 2>/dev/null

echo "Creating temporary keychain..."
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -t 3600 -u "$KEYCHAIN_PATH"

# Prepend the temp keychain to the search list, keeping the existing ones.
# This is the fix for "unable to build chain to self-signed root": the original
# script set the temp keychain as *default* but never added it to the search
# list, so codesign could not find the imported Apple intermediate certs.
echo "Adding temp keychain to the search list..."
# shellcheck disable=SC2086
security list-keychains -d user -s "$KEYCHAIN_PATH" $ORIGINAL_KEYCHAINS

echo "Downloading and importing Apple Root + WWDR intermediate certificates..."
curl -sL https://www.apple.com/appleca/AppleIncRootCertificate.cer -o /tmp/_AppleRoot.cer
curl -sL https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer -o /tmp/_AppleWWDRCAG3.cer
curl -sL https://www.apple.com/certificateauthority/AppleWWDRCAG6.cer -o /tmp/_AppleWWDRCAG6.cer
for cert in /tmp/_AppleRoot.cer /tmp/_AppleWWDRCAG3.cer /tmp/_AppleWWDRCAG6.cer; do
  [ -s "$cert" ] && security import "$cert" -k "$KEYCHAIN_PATH" -T /usr/bin/codesign 2>/dev/null
done
rm -f /tmp/_AppleRoot.cer /tmp/_AppleWWDRCAG3.cer /tmp/_AppleWWDRCAG6.cer

echo "Importing developer signing certificates..."
security import "developers-appliction.p12" -k "$KEYCHAIN_PATH" -P "$P12_PASSWORD" \
  -T /usr/bin/codesign -T /usr/bin/productbuild
security import "developers-installer.p12" -k "$KEYCHAIN_PATH" -P "$P12_PASSWORD" \
  -T /usr/bin/codesign -T /usr/bin/productbuild

echo "Authorizing non-interactive signing (key partition list)..."
security set-key-partition-list -S apple-tool:,apple:,codesign:,productbuild: \
  -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH" >/dev/null 2>&1

echo "Signing identities visible in the temp keychain:"
security find-identity -v "$KEYCHAIN_PATH"

# Tell electron-builder to sign using this keychain explicitly.
export CSC_KEYCHAIN="$KEYCHAIN_PATH"

echo "Starting build..."
npm run build:pkg
BUILD_STATUS=$?

if [ $BUILD_STATUS -eq 0 ]; then
  echo "Verifying Login Helper entitlements in the newly built package..."
  LOGIN_HELPER_PATH="release/mas-universal/Apps for Instagram.app/Contents/Library/LoginItems/Apps for Instagram Login Helper.app/Contents/MacOS/Apps for Instagram Login Helper"
  if [ -f "$LOGIN_HELPER_PATH" ]; then
    codesign -d --entitlements - "$LOGIN_HELPER_PATH" 2>/dev/null
  else
    echo "⚠️  Login Helper binary not found for verification at $LOGIN_HELPER_PATH"
  fi
fi

if [ $BUILD_STATUS -eq 0 ]; then
  echo "✅ Build completed successfully! Output: release/Apps for Instagram.pkg"
else
  echo "❌ Build failed with status $BUILD_STATUS"
fi

exit $BUILD_STATUS
