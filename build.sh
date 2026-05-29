#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "📦 git pull..."
git pull

echo "📦 npm install..."
npm install

echo "🔨 prebuild..."
npx expo prebuild --platform ios --clean

echo "🏗️  archive..."
cd ios
xcodebuild \
  -workspace NIGHTVISION.xcworkspace \
  -scheme NIGHTVISION \
  -configuration Release \
  -destination generic/platform=iOS \
  -archivePath ../build/NIGHTVISION.xcarchive \
  archive \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=HCF97943N8 \
  -allowProvisioningUpdates \
  | xcpretty || true

echo "✅ 完了！Xcode Organizerから Distribute App してください"
open -a Xcode ../build/NIGHTVISION.xcarchive
