const listener = require('./content_scraper')
const $ = require('jquery')
module.exports = function (request, sender, sendResponse) {
  listener(request, sender, sendResponse, {$})
}
