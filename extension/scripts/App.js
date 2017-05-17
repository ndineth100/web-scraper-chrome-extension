var StoreDevtools = require('./StoreDevtools')
var SitemapController = require('./Controller')

$(function () {
	// init bootstrap alerts
  $('.alert').alert()

  var store = new StoreDevtools({$, document, window})
  new SitemapController({
    store: store,
    templateDir: 'views/'
  }, {$, document, window})
})
