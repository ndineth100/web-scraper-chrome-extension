var Selector = require('../../../extension/scripts/Selector')
const utils = require('./../../utils')
const assert = require('chai').assert
const globals = require('../../globals')

describe('Popup link Selector', function () {
  var $el
  let $
let document
let window

  beforeEach(function () {
    $ = globals.$
document = globals.document
window = globals.window

    document.body.innerHTML = utils.getTestHTML()
    $el = utils.createElementFromHTML("<div id='tests' style='display:none'></div>", document)
    document.body.appendChild($el)
  })

  it('should extract single link', function (done) {
    $el.innerHTML = "<a onclick=\"window.open('http://example.com/a')\">a</a>"

    var selector = new Selector({
      id: 'a',
      type: 'SelectorPopupLink',
      multiple: false,
      selector: 'a'
    }, {$, document, window})
    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      var expected = [{
        a: 'a',
        'a-href': 'http://example.com/a',
        _follow: 'http://example.com/a',
        _followSelectorId: 'a'
      }]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should extract multiple links', function (done) {
    $el.innerHTML = "<a onclick=\"window.open('http://example.com/a')\">a</a><a onclick=\"window.open('http://example.com/b')\">b</a>"

    var selector = new Selector({
      id: 'a',
      type: 'SelectorPopupLink',
      multiple: true,
      selector: 'a'
    }, {$, document, window})
    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      var expected = [
        {
          a: 'a',
          'a-href': 'http://example.com/a',
          _follow: 'http://example.com/a',
          _followSelectorId: 'a'
        },
        {
          a: 'b',
          'a-href': 'http://example.com/b',
          _follow: 'http://example.com/b',
          _followSelectorId: 'a'
        }
      ]
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should return data and url columns', function () {
    var selector = new Selector({
      id: 'id',
      type: 'SelectorPopupLink',
      multiple: true,
      selector: 'div'
    }, {$, document, window})

    var columns = selector.getDataColumns()
    assert.deepEqual(columns, ['id', 'id-href'])
  })

  it('should return empty array when no elements are found', function (done) {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorPopupLink',
      multiple: true,
      selector: 'a'
    }, {$, document, window})
    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      var expected = []
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should extract url from an async window.open call', function (done) {
    $el.innerHTML = "<a onclick=\"setTimeout(function(){window.open('http://example.com/');},100)\"></a>"
    var selector = new Selector({
      type: 'SelectorPopupLink'
    }, {$, document, window})
    var dataDeferred = selector.getPopupURL($el.querySelectorAll('a')[0])
    dataDeferred.then(function (data) {
      var expected = 'http://example.com/'
      assert.equal(data, expected)
      done()
    })
  })

  it('should extract url from an async, binded with jQuery window.open call', function (done) {
    $el.innerHTML = '<a></a>'
    $el.querySelectorAll('a').forEach(el => el.addEventListener('click', function () {
      setTimeout(function () {
        window.open('http://example.com/')
      }, 10)
    }))
    var selector = new Selector({
      type: 'SelectorPopupLink'
    }, {$, document, window})
    var dataDeferred = selector.getPopupURL($el.querySelectorAll('a')[0])
    dataDeferred.then(function (data) {
      var expected = 'http://example.com/'
      assert.deepEqual(data, expected)
      done()
    })
  })

  it('should getData url from an async window.open call', function (done) {
    $el.innerHTML = "<a onclick=\"setTimeout(function(){window.open('http://example.com/');},100)\">a</a>"
    var selector = new Selector({
      id: 'a',
      type: 'SelectorPopupLink',
      multiple: true,
      selector: 'a',
      clickPopup: true
    }, {$, document, window})
    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      var expected = [{
        a: 'a',
        _followSelectorId: 'a',
        'a-href': 'http://example.com/',
        _follow: 'http://example.com/'
      }]
      assert.deepEqual(data, expected)
      done()
    })
  })
})
