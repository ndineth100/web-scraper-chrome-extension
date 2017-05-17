var Selector = require('../../../extension/scripts/Selector')
const utils = require('./../../utils')
const assert = require('chai').assert
const globals = require('../../globals')

describe('Element Selector', function () {
  let $
let document
  beforeEach(function () {
    $ = globals.$
document = globals.document

    document.body.innerHTML = utils.getTestHTML()
  })

  it('should return one element', function (done) {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorElement',
      multiple: false,
      selector: 'div'
    }, {$})

    var dataDeferred = selector.getData(document.querySelectorAll('#selector-element-nodata')[0])
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      assert.equal(data[0], document.querySelectorAll('#selector-element-nodata div')[0])
      done()
    })
  })

  it('should return multiple elements', function (done) {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorElement',
      multiple: true,
      selector: 'div'
    }, {$})
    var dataDeferred = selector.getData(document.querySelectorAll('#selector-element-nodata')[0])
    dataDeferred.then(function (data) {
      assert.equal(data.length, 2)
      assert.deepEqual(data, Array.from(document.querySelectorAll('#selector-element-nodata div')))
      done()
    })
  })

  it('should return no data columns', function () {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorElement',
      multiple: true,
      selector: 'div'
    }, {$})

    var columns = selector.getDataColumns()
    assert.deepEqual(columns, [])
  })
})
