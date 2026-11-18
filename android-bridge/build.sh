#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
SDK="${HOME}/Library/Android/sdk"
BT="${SDK}/build-tools/36.0.0"
PLATFORM="${SDK}/platforms/android-37.0/android.jar"
JBR_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export JAVA_HOME="${JBR_HOME}"
export PATH="${JBR_HOME}/bin:${PATH}"
JBR="${JBR_HOME}/bin"

BUILD="${DIR}/build"
rm -rf "${BUILD}"
mkdir -p "${BUILD}/gen" "${BUILD}/obj" "${BUILD}/dex"

"${BT}/aapt2" compile --dir "${DIR}/res" -o "${BUILD}/res.zip"
"${BT}/aapt2" link \
  -I "${PLATFORM}" \
  --manifest "${DIR}/AndroidManifest.xml" \
  --java "${BUILD}/gen" \
  -o "${BUILD}/unsigned.apk" \
  "${BUILD}/res.zip"

"${JBR}/javac" \
  --release 11 \
  -classpath "${PLATFORM}" \
  -d "${BUILD}/obj" \
  $(find "${DIR}/src" "${BUILD}/gen" -name '*.java')

"${BT}/d8" \
  --lib "${PLATFORM}" \
  --min-api 24 \
  --output "${BUILD}/dex" \
  $(find "${BUILD}/obj" -name '*.class')

cp "${BUILD}/unsigned.apk" "${BUILD}/withdex.apk"
(cd "${BUILD}/dex" && zip -q -u "${BUILD}/withdex.apk" classes.dex)

"${BT}/zipalign" -f 4 "${BUILD}/withdex.apk" "${BUILD}/aligned.apk"

KEYSTORE="${BUILD}/debug.keystore"
"${JBR}/keytool" -genkeypair -v -keystore "${KEYSTORE}" -storepass android \
  -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Raumamix,O=Raumamix,C=VN" >/dev/null 2>&1

OUT_APK="${DIR}/raumamix-printer.apk"
"${BT}/apksigner" sign \
  --ks "${KEYSTORE}" \
  --ks-pass pass:android \
  --out "${OUT_APK}" \
  "${BUILD}/aligned.apk"

echo "Built APK: ${OUT_APK}"
ls -lh "${OUT_APK}"
