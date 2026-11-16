const fs = require('node:fs');
const dir = process.argv[2];
const entries = fs.readdirSync(dir, { withFileTypes: true }).slice(0, 200);
for (const e of entries) console.log(e.isDirectory() ? e.name + '/' : e.name);
