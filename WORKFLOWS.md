# Workflows included

1. build-android-debug.yml
   - Builds frontend web
   - Runs `npx cap sync android`
   - Runs `./gradlew assembleDebug`
   - Uploads app-debug.apk as artifact

2. build-android-release.yml
   - Builds web
   - Runs `./gradlew assembleRelease`
   - Requires GitHub Secrets:
     - ANDROID_KEYSTORE_BASE64 (base64-encoded keystore)
     - KEY_ALIAS
     - KEY_PASSWORD
     - KEYSTORE_PASSWORD
   - Signs unsigned APK and uploads signed APK as artifact
