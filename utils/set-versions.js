const fs = require('fs');

const version = process.argv[2];
if (!version) {
  console.error('Usage: node set-versions.js <version>');
  process.exit(1);
}

for (const dir of fs.readdirSync('packages')) {
  const p = 'packages/' + dir + '/package.json';
  const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
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
