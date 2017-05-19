// Basically runs JSDOM in a webworker
const work = require('webworkify')
const jsdomBrowserLoader = require('./JSDOMBrowserLoader')
var jqueryDeferred = require('jquery-deferred')
var whenCallSequentially = require('../assets/jquery.whencallsequentially')

const WebJSDOMBrowser = function (options) {
  this.pageLoadDelay = options.pageLoadDelay
  const promises = {}
  this.promises = promises

  this.worker = work(jsdomBrowserLoader)

  this.worker.addEventListener('message', function (ev) {
    const data = ev.data
    if (!data.UUID) {
      return console.error(data.err)
    }
    if (data.UUID && !promises[data.UUID]) {
      return console.error('Missing UUID', data.UUID)
    }
    if (data.err) {
      console.error(data.err)
      promises[data.UUID].reject(new Error(data.err))
      delete promises[data.UUID]
      return
    }
    promises[data.UUID].resolve(data.info)
    delete promises[data.UUID]
  })
  this.worker.postMessage({
    topic: 'init',
    UUID: 'init',
    options
  })
  promises.init = {
    resolve: function () {
      console.log('successfully created')
    },
    reject: function (err) {
      console.error(err)
    }
  }
}

WebJSDOMBrowser.prototype = {
  loadUrl: function (url, callback) {
    const UUID = parseInt(Math.random() * 1000000).toString()
    let res, rej
    const promise = new Promise(function (resolve, reject) {
      res = resolve
      rej = reject
    })
    this.promises[UUID] = {resolve: res, reject: rej}
    this.worker.postMessage({
      topic: 'loadUrl',
      url,
      UUID
    })
    promise.then(function (info) {
      callback()
    }, function (err) {callback(err)})
  },
  saveImages: function (record, namingFunction) {
    var deferredResponse = jqueryDeferred.Deferred()
    var deferredImageStoreCalls = []
    var prefixLength = '_imageBase64-'.length
    for (var attr in record) {
      if (attr.substr(0, prefixLength) === '_imageBase64-') {
        throw new Error('Downloading images is not yet supported')
      }
    }
    whenCallSequentially(deferredImageStoreCalls).done(function () {
      deferredResponse.resolve()
    })

    return deferredResponse.promise()
  },
  fetchData: function (url, sitemap, parentSelectorId, callback, scope) {
    const UUID = parseInt(Math.random() * 1000000).toString()
    let res, rej
    const promise = new Promise(function (resolve, reject) {
      res = resolve
      rej = reject
    })
    this.promises[UUID] = {resolve: res, reject: rej}
    this.worker.postMessage({
      topic: 'fetchData',
      url,
      UUID,
      sitemap: JSON.parse(JSON.stringify(sitemap)),
      parentSelectorId
    })
    promise.then(function (info) {
      callback.call(scope, null, info.results)
    }, function (err) {
      callback(err)
    })
  },
  close: function () {
    console.log('closing webjsdom browser')
    if (this.worker) this.worker.terminate()
    this.worker = null
  }
}

module.exports = WebJSDOMBrowser
