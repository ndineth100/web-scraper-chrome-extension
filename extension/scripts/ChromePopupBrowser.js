var jquery = require('jquery-deferred')
var whenCallSequentially = require('../assets/jquery.whencallsequentially')

var ChromePopupBrowser = function (options, moreOptions) {
  this.pageLoadDelay = options.pageLoadDelay

  // Not setting window here as it conflicts with this.window. In any case window must be defined in this case
	// @TODO somehow handle the closed window
}

ChromePopupBrowser.prototype = {

  _initPopupWindow: function (callback, scope) {
    var browser = this
    if (this.window !== undefined) {
			// check if tab exists
      chrome.tabs.get(this.tab.id, function (tab) {
        if (!tab) {
          throw 'Scraping window closed'
        }
      })

      callback.call(scope)
      return
    }

    chrome.windows.create({'type': 'popup', width: 1042, height: 768, focused: true, url: 'chrome://newtab'}, function (window) {
      browser.window = window
      browser.tab = window.tabs[0]

      callback.call(scope)
    })
  },

  loadUrl: function (url, callback) {
    var tab = this.tab

    var tabLoadListener = function (tabId, changeInfo, tab) {
      if (tabId === this.tab.id) {
        if (changeInfo.status === 'complete') {
					// @TODO check url ? maybe it would be bad because some sites might use redirects

					// remove event listener
          chrome.tabs.onUpdated.removeListener(tabLoadListener)

					// callback tab is loaded after page load delay
          setTimeout(callback, this.pageLoadDelay)
        }
      }
    }.bind(this)
    chrome.tabs.onUpdated.addListener(tabLoadListener)

    chrome.tabs.update(tab.id, {url: url})
  },

  close: function () {
    chrome.windows.remove(this.window.id)
  },
  /**
   * Save images for user if the records contains them
   * @param namingFunction {function} gets string outputs name
   * @param record
   */
  saveImages: function (record, namingFunction) {
    var deferredResponse = jquery.Deferred()
    var deferredImageStoreCalls = []
    var prefixLength = '_imageBase64-'.length
    const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
      const byteCharacters = window.atob(b64Data)
      const byteArrays = []

      for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize)

        const byteNumbers = new Array(slice.length)
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i)
        }

        const byteArray = new Uint8Array(byteNumbers)

        byteArrays.push(byteArray)
      }

      const blob = new window.Blob(byteArrays, {type: contentType})
      return blob
    }

    for (var attr in record) {
      if (attr.substr(0, prefixLength) === '_imageBase64-') {
        var selectorId = attr.substring(prefixLength, attr.length)
        deferredImageStoreCalls.push(function (selectorId) {
          var imageBase64 = record['_imageBase64-' + selectorId]
          var deferredDownloadDone = jquery.Deferred()

          // TODO check that atob actually works
          var blob = b64toBlob(imageBase64, record['_imageMimeType-' + selectorId])

          delete record['_imageMimeType-' + selectorId]
          delete record['_imageBase64-' + selectorId]

          var downloadUrl = window.URL.createObjectURL(blob)
          var fileSavePath = namingFunction(selectorId)

          // download image using chrome api
          var downloadRequest = {
            url: downloadUrl,
            filename: fileSavePath
          }

          // wait for the download to finish
          chrome.downloads.download(downloadRequest, function (downloadId) {
            var cbDownloaded = function (downloadItem) {
              if (downloadItem.id === downloadId && downloadItem.state) {
                if (downloadItem.state.current === 'complete') {
                  deferredDownloadDone.resolve()
                  chrome.downloads.onChanged.removeListener(cbDownloaded)
                } else if (downloadItem.state.current === 'interrupted') {
                  deferredDownloadDone.reject('download failed')
                  chrome.downloads.onChanged.removeListener(cbDownloaded)
                }
              }
            }

            chrome.downloads.onChanged.addListener(cbDownloaded)
          })

          return deferredDownloadDone.promise()
        }.bind(this, selectorId))
      }
    }

    whenCallSequentially(deferredImageStoreCalls).done(function () {
      deferredResponse.resolve()
    })

    return deferredResponse.promise()
  },
  fetchData: function (url, sitemap, parentSelectorId, callback, scope) {
    var browser = this

    this._initPopupWindow(function () {
      var tab = browser.tab
      console.log('Init browser app')
      browser.loadUrl(url, function () {
        var message = {
          extractData: true,
          sitemap: JSON.parse(JSON.stringify(sitemap)),
          parentSelectorId: parentSelectorId
        }

        chrome.tabs.sendMessage(tab.id, message, function (data) {
          console.log('extracted data from web page', data)
          callback.call(scope, data)
        })
      })
    }, this)
  }
}

module.exports = ChromePopupBrowser
