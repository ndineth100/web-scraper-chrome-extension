const listener = require('./content_scraper')
const $ = require('jquery')
module.exports = function (request, sender, sendResponse) {
  listener(request, sender, sendResponse, {$, window, document})
  // important so that chrome knows the listener is async
  return true
}
