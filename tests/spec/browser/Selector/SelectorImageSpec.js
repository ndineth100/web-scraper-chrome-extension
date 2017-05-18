const Selector = require('../../../../extension/scripts/Selector')
const utils = require('./../../../utils')
const assert = require('chai').assert
const globals = require('../../../globals')

describe('Image Selector', function () {
  let $
  let document
  let window
  var $el
  beforeEach(function () {
    $ = globals.$
    document = globals.document
    window = globals.window

    document.body.innerHTML = utils.getTestHTML()
    $el = utils.createElementFromHTML("<div id='tests' style='display:none'></div>", document)
    document.body.appendChild($el)
  })

  it('should be able to download image as base64', function (done) {
    var selector = new Selector({
      id: 'img',
      type: 'SelectorImage'
    }, {$, document, window})
    var deferredImage = selector.downloadImageBase64('base/docs/images/chrome-store-logo.png')

    deferredImage.then(function (imageResponse) {
      assert.isTrue(imageResponse.imageBase64.length > 100)
      done()
    })
  })

  it('should be able to get data with image data attached', function (done) {
    $el.innerHTML = '<img src="base/docs/images/chrome-store-logo.png">'

    var selector = new Selector({
      id: 'img',
      type: 'SelectorImage',
      multiple: true,
      selector: 'img',
      downloadImage: true
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      assert.isTrue(!!data[0]['_imageBase64-img'])
      assert.isTrue(!!data[0]['_imageMimeType-img'])
      done()
    })
  })
})
