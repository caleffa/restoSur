const fs = require('fs');
const path = require('path');

const versionFilePath = path.join(__dirname, '..', 'frontend', 'src', 'config', 'appVersion.json');

const raw = fs.readFileSync(versionFilePath, 'utf8');
const version = JSON.parse(raw);

version.build = Number(version.build || 0) + 1;

fs.writeFileSync(versionFilePath, `${JSON.stringify(version, null, 2)}\n`, 'utf8');

const versionLabel = `v${version.major}.${version.minor}.${version.patch}.${version.build}`;
console.log(`[version] Build incrementado automáticamente a ${versionLabel}`);
