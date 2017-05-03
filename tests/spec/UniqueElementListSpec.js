const UniqueElementList = require('../../extension/scripts/UniqueElementList')
const utils = require('./../utils')
const assert = require('chai').assert
const globals = require('../globals')
describe('UniqueElementList', function () {
  var $el
  let $

  beforeEach(function () {
    $ = globals.$
    document.body.innerHTML = utils.getTestHTML()
    $el = utils.createElementFromHTML("<div id='tests' style='display:none'></div>")
    document.body.appendChild($el)
  })

  it('it should add only unique elements', function () {
    $el.innerHTML = '<a>1</a><a>2</a>'

    var list = new UniqueElementList('uniqueText', {$})
    assert.equal(list.length, 0)

    var $a = $el.querySelectorAll('a')
    list.push($a[0])
    assert.equal(list.length, 1)
    list.push($a[0])
    assert.equal(list.length, 1)
    list.push($a[1])
    assert.equal(list.length, 2)
    list.push($a[1])
    assert.equal(list.length, 2)
  })

  it('it should add only unique elements when using uniqueHTMLText type', function () {
    $el.innerHTML = "<a id='1'>a</a><a id='2'>a</a>"

    var list = new UniqueElementList('uniqueHTMLText', {$})
    assert.equal(list.length, 0)

    var $a = $el.querySelectorAll('a')
    list.push($a[0])
    assert.equal(list.length, 1)
    list.push($a[0])
    assert.equal(list.length, 1)
    list.push($a[1])
    assert.equal(list.length, 2)
    list.push($a[1])
    assert.equal(list.length, 2)
  })

  it('it should add only unique elements when using uniqueHTML type', function () {
    $el.innerHTML = "<a class='1'>a<span>a</span></a><a class='2'>a<span>b</span></a><a class='1'>c<span>c</span></a>"

    var list = new UniqueElementList('uniqueHTML', {$})
    assert.equal(list.length, 0)

    var $a = $el.querySelectorAll('a')
    list.push($a[0])
    assert.equal(list.length, 1)
    list.push($a[0])
    assert.equal(list.length, 1)
    list.push($a[1])
    assert.equal(list.length, 2)
    list.push($a[1])
    assert.equal(list.length, 2)
    list.push($a[2])
    assert.equal(list.length, 2)
  })

  it('it should add only unique elements when using uniqueCSSSelector type', function () {
    $el.innerHTML = '<a></a><a></a>'

    var list = new UniqueElementList('uniqueCSSSelector', {$})
    assert.equal(list.length, 0)

    var $a = $el.querySelectorAll('a')
    list.push($a[0])
    assert.equal(list.length, 1)
    list.push($a[0])
    assert.equal(list.length, 1)
    list.push($a[1])
    assert.equal(list.length, 2)
    list.push($a[1])
    assert.equal(list.length, 2)
  })
})
