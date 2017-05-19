const JSDOMBrowser = require('./JSDOMBrowser')
module.exports = function (self) {
  var browser =

  self.onerror = function (err) {
    self.postMessage({
      err: new Error(err)
    })
    self.close()
  }
  self.addEventListener('message', function (ev) {
    const data = ev.data
    const UUID = data.UUID
    if (data.topic === 'init') {
      browser = new JSDOMBrowser(data.options)
      return self.postMessage({
        UUID
      })
    } else if (data.topic === 'loadUrl') {
      browser.loadUrl(data.url, function (err, {$, document, window}) {
        if (err) {
          return self.postMessage({
            UUID,
            err
          })
        }
        self.postMessage({
          UUID
        })
      })
    } else if (data.topic === 'fetchData') {
      browser.fetchData(data.url, data.sitemap, data.parentSelectorId, function (err, results) {
        if (err) {
          return self.postMessage({
            UUID,
            err
          })
        }
        self.postMessage({
          UUID,
          info: {
            results
          }
        })
      }, null)
    } else {
      self.postMessage({
        err: new Error('Unknown  topic ' + data.topic)
      })
    }
  })
}