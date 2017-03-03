var files = require('./config')
const fs = require('fs')

console.log('bundledLibrary = `')
files.forEach(function (path) {
  const file = fs.readFileSync('extension/' + path).toString().replace(/\`/g, '\\`')
  console.log(file)
})

console.log('\n')
console.log('`')
