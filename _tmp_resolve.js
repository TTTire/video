const path = require('node:path');
console.log(path.dirname(require.resolve(process.argv[2] + '/package.json', { paths: [process.env.DSH_INSTALL_DIR] })));
