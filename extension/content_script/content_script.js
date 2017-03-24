var extensionListener = require('./content_scraper')
chrome.runtime.onMessage.addListener(extensionListener)
