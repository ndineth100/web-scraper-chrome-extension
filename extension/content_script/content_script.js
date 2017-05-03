chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  contentScraper(request, sender, sendResponse, {$})
})
