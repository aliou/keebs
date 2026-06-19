#!/usr/bin/env bash
# Regenerate patches/0002-add-edthu-wireless-support.patch from the vendored
# source in vendor/edthu-wireless/. The patch is purely additive (all new
# files), so it applies cleanly on top of the pinned upstream qmk_firmware.
#
# Usage:
#   scripts/regen-wireless-patch.sh
#
# Override the pristine upstream checkout used as the diff baseline with:
#   QMK_PRISTINE=/path/to/qmk_firmware scripts/regen-wireless-patch.sh
#
# Otherwise the pinned pristine source from flake.nix is resolved via
# `nix build .#qmkFirmwareSrc`.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR="$REPO_ROOT/vendor/edthu-wireless"
PATCH="$REPO_ROOT/patches/0002-add-edthu-wireless-support.patch"

if [ ! -d "$VENDOR/keyboards/neo/neo65_trimode" ]; then
  echo "error: vendored source not found at $VENDOR" >&2
  echo "       see $REPO_ROOT/vendor/edthu-wireless/README.md" >&2
  exit 1
fi

if ! command -v git >/dev/null; then
  echo "error: git is required to generate the patch" >&2
  exit 1
fi

# Resolve a pristine upstream checkout at the pinned rev. Prefer an explicit
# override; otherwise pull the fetchFromGitHub output out of the nix store via
# the flake's exposed package (no git clone needed).
if [ -n "${QMK_PRISTINE:-}" ]; then
  PRISTINE="$QMK_PRISTINE"
else
  echo "resolving pristine firmware via nix build .#qmkFirmwareSrc ..."
  PRISTINE="$(nix build "$REPO_ROOT#qmkFirmwareSrc" --no-link --print-out-paths)"
fi
echo "pristine: $PRISTINE"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# 1. Copy pristine -> workdir and make it writable.
cp -r "$PRISTINE" "$WORK/src"
chmod -R u+w "$WORK/src"

# 2. Commit the pristine baseline so the diff captures ONLY what the overlay
#    adds (and we get diff --git a/... b/... new-file format that patch -p1
#    understands).
( cd "$WORK/src" && git init -q \
  && git -c user.email=keebs@local -c user.name=keebs add -A \
  && git -c user.email=keebs@local -c user.name=keebs commit -qm pristine )

# 3. Overlay the vendored firmware tree onto the firmware checkout. Copy
#    ONLY vendor/.../keyboards/ (not the vendor README.md) -- otherwise on a
#    case-insensitive filesystem README.md would shadow upstream's lowercase
#    readme.md and produce a spurious patch hunk that fails to apply. Target
#    src/keyboards/ so the patch paths come out as keyboards/neo/... (patch -p1
#    then strips the keyboards/ prefix correctly).
mkdir -p "$WORK/src/keyboards"
cp -r "$VENDOR/keyboards/." "$WORK/src/keyboards/"

# 4. Stage and emit the patch (additions only vs the pristine baseline).
#    Explicit a// b/ prefixes so `patch -p1` (used by nix applyPatches) strips
#    exactly one component and the files land at keyboards/neo/... in the
#    firmware tree. Without --src-prefix/--dst-prefix, git emits
#    `keyboards/neo/...` and -p1 would wrongly strip `keyboards/`.
( cd "$WORK/src" \
  && git -c user.email=keebs@local -c user.name=keebs add -A \
  && git -c diff.mnemonicprefix=false diff --cached --binary \
       --src-prefix=a/ --dst-prefix=b/ > "$PATCH" )

echo "wrote $PATCH"

# 5. Verify the patch applies cleanly on a fresh pristine checkout AND that the
#    ne/wireless files land at keyboards/neo/wireless (not neo/wireless). A
#    plain --dry-run passes for new files even at the wrong path, so we do a
#    real apply and then assert the expected files exist. Errors stay visible
#    per repo convention -- no 2>/dev/null silencing.
VERIFY="$(mktemp -d)"
trap 'rm -rf "$WORK" "$VERIFY"' EXIT
cp -r "$PRISTINE" "$VERIFY/src"
chmod -R u+w "$VERIFY/src"
( cd "$VERIFY/src" && patch -p1 < "$PATCH" >/dev/null ) \
  || { echo "verify: patch FAILED to apply" >&2; exit 1; }
for f in keyboards/neo/neo65_trimode/neo65_trimode.c \
         keyboards/neo/wireless/wireless.c \
         keyboards/neo/wireless/wireless.mk; do
  [ -f "$VERIFY/src/$f" ] || { echo "verify: MISSING $f (patch paths wrong)" >&2; exit 1; }
done
echo "verify: patch applies cleanly, files land at keyboards/neo/"

echo
echo "done. run: direnv reload && qmk compile -kb neo/neo65_trimode -km default"
