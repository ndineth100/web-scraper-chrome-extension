var files = require('./config')
const fs = require('fs')
files.forEach(function (path) {
  const file = fs.readFileSync('extension/' + path).toString()
  console.log(file)
  console.log('\n')

})