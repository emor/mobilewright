const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error('Usage: node set-versions.js <version>');
  process.exit(1);
}

// Update root package.json version
const rootPath = 'package.json';
const rootPkg = JSON.parse(fs.readFileSync(rootPath, 'utf8'));
rootPkg.version = version;
fs.writeFileSync(rootPath, JSON.stringify(rootPkg, null, 2) + '\n');

// Update each sub-package version and inter-package dependencies
for (const dir of fs.readdirSync('packages')) {
  const p = path.join('packages', dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
  pkg.version = version;
  for (const deps of ['dependencies', 'devDependencies']) {
    if (!pkg[deps]) continue;
    for (const name of Object.keys(pkg[deps])) {
      if (name === 'mobilewright' || name.startsWith('@mobilewright/')) {
        pkg[deps][name] = '^' + version;
      }
    }
  }
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
}
