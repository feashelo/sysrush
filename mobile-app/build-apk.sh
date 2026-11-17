#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$APP_DIR/.." && pwd)"
BUILD_DIR="$APP_DIR/build"

SDK_DIR="/home/katletka/Android/Sdk"
BUILD_TOOLS="$SDK_DIR/build-tools/36.0.0"
ANDROID_JAR="$SDK_DIR/platforms/android-37.0/android.jar"
JAVA_HOME="/usr/lib/jvm/java-21-openjdk"
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/obj" "$BUILD_DIR/dex" "$BUILD_DIR/res_compiled" "$BUILD_DIR/assets_staged"
cp -r "$APP_DIR/assets/"* "$BUILD_DIR/assets_staged/"

# Inject local private config into APK staging copy only (never modifying clean Git sync-config.js)
if [ -f "$HOME/.local/share/sysrush/config.json" ]; then
  python3 - "$HOME/.local/share/sysrush/config.json" "$BUILD_DIR/assets_staged/www/sync-config.js" <<'PY'
import json, sys
cfg = json.load(open(sys.argv[1], encoding="utf-8"))
out = {
  "syncChannel": cfg.get("syncChannel", ""),
  "cloudRelayBase": cfg.get("cloudRelayBase", "https://ntfy.sh"),
  "githubPagesUrl": "https://feashelo.github.io/sysrush/",
  "defaultLanUrl": "",
  "localUrl": "http://127.0.0.1:8765",
  "geminiApiKey": cfg.get("geminiApiKey", ""),
  "geminiModel": cfg.get("geminiModel", "gemini-2.5-flash"),
  "geminiFallbackModel": cfg.get("geminiFallbackModel", "gemini-2.0-flash")
}
open(sys.argv[2], "w", encoding="utf-8").write("window.SYSRUSH_CONFIG = " + json.dumps(out, indent=2) + ";\n")
PY
fi

echo "1/5 Compiling Android resources with aapt2..."
"$BUILD_TOOLS/aapt2" compile --dir "$APP_DIR/res" -o "$BUILD_DIR/res_compiled/res.zip"

"$BUILD_TOOLS/aapt2" link \
  -I "$ANDROID_JAR" \
  --manifest "$APP_DIR/AndroidManifest.xml" \
  -A "$BUILD_DIR/assets_staged" \
  -o "$BUILD_DIR/unaligned.apk" \
  --java "$BUILD_DIR/gen" \
  "$BUILD_DIR/res_compiled/res.zip"

echo "2/5 Compiling Java sources with javac (Java 21 -> target 11)..."
"$JAVA_HOME/bin/javac" \
  --release 11 \
  -classpath "$ANDROID_JAR" \
  -d "$BUILD_DIR/obj" \
  "$BUILD_DIR/gen/com/sysrush/lpic/R.java" \
  "$APP_DIR/src/com/sysrush/lpic/MainActivity.java"

echo "3/5 Converting bytecode to DEX with d8..."
CLASS_FILES=$(find "$BUILD_DIR/obj" -name "*.class")
"$BUILD_TOOLS/d8" \
  --lib "$ANDROID_JAR" \
  --min-api 24 \
  --output "$BUILD_DIR/dex" \
  $CLASS_FILES

echo "4/5 Packaging classes.dex and aligning APK..."
(cd "$BUILD_DIR/dex" && zip -q "$BUILD_DIR/unaligned.apk" classes.dex)
"$BUILD_TOOLS/zipalign" -f -p 4 "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/aligned.apk"

KEYSTORE="$APP_DIR/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
  echo "Generating signing keystore..."
  "$JAVA_HOME/bin/keytool" -genkeypair \
    -v -keystore "$KEYSTORE" \
    -storepass android -keypass android \
    -alias androiddebugkey \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=SysRush LPIC,O=SysRush,C=UZ" >/dev/null 2>&1
fi

OUT_APK="$ROOT_DIR/SysRush-LPIC.apk"
echo "5/5 Signing APK with apksigner..."
"$BUILD_TOOLS/apksigner" sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:android \
  --key-pass pass:android \
  --ks-key-alias androiddebugkey \
  --out "$OUT_APK" \
  "$BUILD_DIR/aligned.apk"

"$BUILD_TOOLS/apksigner" verify "$OUT_APK"
rm -f "$OUT_APK.idsig"
ls -lh "$OUT_APK"
echo "✅ SysRush LPIC APK built and verified: $OUT_APK"
