const $ = require('jquery')
module.exports = {
  $,
  document: typeof window !== 'undefined' ? window.document : null,
  window: typeof window !== 'undefined' ? window : null
}
