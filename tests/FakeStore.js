
var FakeStore = function () {
  this.data = []
}

FakeStore.prototype = {

  writeDocs: function (data, callback) {
    data.forEach(function (data) {
      this.data.push(data)
    }.bind(this))
    callback()
  },

  initSitemapDataDb: function (sitemapId, callback) {
    callback(this)
  }
}

if (typeof require !== 'undefined') {
  global.FakeStore = FakeStore
}
