var Selector = require('../../../extension/scripts/Selector')
const utils = require('./../../utils')
const assert = require('chai').assert
const globals = require('../../globals')

describe('Scroll Element Selector', function () {
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

  it('should return one element', function (done) {
    $el.innerHTML = '<div>a</div><div>b</div>'
    var selector = new Selector({
      id: 'a',
      type: 'SelectorElementScroll',
      multiple: false,
      selector: 'div'
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      assert.equal(data[0], $el.querySelectorAll('div')[0])
      done()
    })
  })

  it('should return multiple elements', function (done) {
    $el.innerHTML = '<div>a</div><div>b</div>'
    var selector = new Selector({
      id: 'a',
      type: 'SelectorElementScroll',
      multiple: true,
      selector: 'div'
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 2)
      assert.deepEqual(data, Array.from($el.querySelectorAll('div')))
      done()
    })
  })

  it('should get elements when scrolling is not needed', function (done) {
    $el.innerHTML = '<a>a</a>'
    var selector = new Selector({
      id: 'a',
      type: 'SelectorElementScroll',
      multiple: true,
      selector: 'a',
      delay: 100
    }, {$, document, window})
    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      assert.equal(data[0], $el.querySelectorAll('a')[0])
      done()
    })
  })

  it('should get elements which are added a delay', function (done) {
    $el.innerHTML = '<a>a</a>'
    // add extra element after a little delay
    setTimeout(function () {
      utils.appendHTML($el, '<a>a</a>', document)
    }, 100)

    var selector = new Selector({
      id: 'a',
      type: 'SelectorElementScroll',
      multiple: true,
      selector: 'a',
      delay: 200
    }, {$, document, window})
    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 2)
      assert.deepEqual(data, Array.from($el.querySelectorAll('a')))
      done()
    })
  })
  it('should return no data columns', function () {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorElementScroll',
      multiple: true,
      selector: 'div'
    }, {$, document, window})

    var columns = selector.getDataColumns()
    assert.deepEqual(columns, [])
  })
})
