const cp = require('child_process')
cp.spawnSync('node', ['./child_code.js'], {
  stdio: 'inherit'
})
