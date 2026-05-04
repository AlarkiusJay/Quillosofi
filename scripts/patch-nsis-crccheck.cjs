#!/usr/bin/env node
// Patches node_modules/app-builder-lib/templates/nsis/common.nsh to append
// `CRCCheck off` if it isn't already present.
//
// Workaround for the long-standing electron-builder NSIS bug where the
// uninstaller integrity check fires "Failed to uninstall old application
// files. Please try running the installer again.: 2" on auto-update —
// even when the install was clean. See:
//   https://github.com/electron-userland/electron-builder/issues/8664
//   https://github.com/electron-userland/electron-builder/issues/4875
//
// Idempotent. Safe to re-run on every postinstall.

const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'app-builder-lib',
  'templates',
  'nsis',
  'common.nsh'
);

if (!fs.existsSync(target)) {
  // app-builder-lib not installed yet (e.g. devDeps skipped). No-op, not an error.
  console.log('[patch-nsis] common.nsh not found, skipping (probably no electron-builder).');
  process.exit(0);
}

const content = fs.readFileSync(target, 'utf8');
if (/^CRCCheck\s+off\s*$/m.test(content)) {
  console.log('[patch-nsis] CRCCheck off already present, no change.');
  process.exit(0);
}

const patched = content.trimEnd() + '\n\n; Quillosofi: disable CRC check on uninstall to dodge\n; "Failed to uninstall old application files: 2" during auto-update.\nCRCCheck off\n';
fs.writeFileSync(target, patched, 'utf8');
console.log('[patch-nsis] Appended CRCCheck off to', target);
