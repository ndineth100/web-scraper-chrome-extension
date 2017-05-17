const Selector = require('../../../extension/scripts/Selector')
const SelectorImage = require('../../../extension/scripts/Selector/SelectorImage')
const utils = require('./../../utils')
const assert = require('chai').assert
const globals = require('../../globals')

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

  it('should extract single image', function (done) {
    var selector = new Selector({
      id: 'img',
      type: 'SelectorImage',
      multiple: false,
      selector: 'img'
    }, {$, document, window})

    var dataDeferred = selector.getData(document.querySelectorAll('#selector-image-one-image')[0])
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      var expected = [
        {
          'img-src': 'http://aa/'
        }
      ]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should extract multiple images', function (done) {
    var selector = new Selector({
      id: 'img',
      type: 'SelectorImage',
      multiple: true,
      selector: 'img'
    }, {$, document, window})
    var dataDeferred = selector.getData(document.querySelectorAll('#selector-image-multiple-images')[0])
    dataDeferred.then(function (data) {
      assert.equal(data.length, 2)
      var expected = [
        {
          'img-src': 'http://aa/'
        },
        {
          'img-src': 'http://bb/'
        }
      ]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should return only src column', function () {
    var selector = new Selector({
      id: 'id',
      type: 'SelectorImage',
      multiple: true,
      selector: 'img'
    }, {$, document, window})

    var columns = selector.getDataColumns()
    assert.deepEqual(columns, ['id-src'])
  })

  it('should return empty array when no images are found', function (done) {
    var selector = new Selector({
      id: 'img',
      type: 'SelectorImage',
      multiple: true,
      selector: 'img.not-exist'
    }, {$, document, window})
    var dataDeferred = selector.getData(document.querySelectorAll('#not-exist')[0])
    dataDeferred.then(function (data) {
      assert.equal(data.length, 0)
      var expected = []
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should be able to download image as base64', function (done) {
    var deferredImage = SelectorImage.downloadImageBase64('base/docs/images/chrome-store-logo.png')

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

    console.log($el.innerHTML)
    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      assert.isTrue(!!data[0]['_imageBase64-img'])
      assert.isTrue(!!data[0]['_imageMimeType-img'])
      done()
    })
  })
})
