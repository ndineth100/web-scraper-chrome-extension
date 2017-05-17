const Selector = require('../../../extension/scripts/Selector')
const utils = require('./../../utils')
const assert = require('chai').assert
const globals = require('../../globals')

describe('Click Element Selector', function () {
  var $el
  var $
  beforeEach(function () {
    $ = globals.$
document = globals.document

    document.body.innerHTML = utils.getTestHTML()
    $el = utils.createElementFromHTML("<div id='tests' style='display:none'></div>", document)
    document.body.appendChild($el)
  })

  it('should return one element', function (done) {
    $el.innerHTML = '<div>a</div><div>b</div>'
    var selector = new Selector({
      id: 'a',
      type: 'SelectorElementClick',
      multiple: false,
      selector: 'div',
      clickType: 'clickOnce'
    }, {$})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data[0].innerText, 'a')
      done()
    })
  })

  it('should return multiple elements', function (done) {
    $el.innerHTML = '<div>a</div><div>b</div>'
    var selector = new Selector({
      id: 'a',
      type: 'SelectorElementClick',
      multiple: true,
      selector: 'div',
      clickType: 'clickOnce'
    }, {$})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data[0].innerText, 'a')
      assert.equal(data[1].innerText, 'b')
      done()
    })
  })

  it('should get elements that are available immediately after clicking', function (done) {
    $el.innerHTML = '<a>a</a>'
    $el.querySelectorAll('a').forEach(el => el.addEventListener('click', function () {
      utils.appendHTML($el, '<div>test</div>', document)
    }))

    var selector = new Selector({
      id: 'div',
      type: 'SelectorElementClick',
      multiple: true,
      clickElementSelector: 'a',
      selector: 'div',
      clickType: 'clickOnce'
    }, {$})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      assert.equal(data[0].innerText, 'test')
      done()
    })
  })

  it('should skip clicking if click element is removed from dom', function (done) {
    $el.innerHTML = "<a>a</a><a class='remove'>b</a>"
    $el.querySelector('a').addEventListener('click', function () {
      console.log($el.innerHTML)
      utils.appendHTML($el, '<div>test</div>', document)
      console.log($el.innerHTML)
      var elementToRemove = $el.querySelector('.remove')
      if (elementToRemove) elementToRemove.remove()
    })

    var selector = new Selector({
      id: 'div',
      type: 'SelectorElementClick',
      multiple: true,
      clickElementSelector: 'a',
      selector: 'div',
      delay: 100,
      clickType: 'clickOnce'
    }, {$})
    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      assert.equal(data[0].innerText, 'test')
      console.log('done')
      done()
    })
  })

  it('should get elements that are not available immediately after clicking but after some time', function (done) {
    $el.innerHTML = '<a>a</a>'
    $el.querySelector('a').addEventListener('click', function () {
      setTimeout(function () {
        utils.appendHTML($el, '<div>test</div>', document)
      }, 50)
    })

    var selector = new Selector({
      id: 'div',
      type: 'SelectorElementClick',
      multiple: true,
      clickElementSelector: 'a',
      selector: 'div',
      delay: 100,
      clickType: 'clickOnce'
    }, {$})
    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      assert.equal(data[0].innerText, 'test')
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

  it('should return multiple elements if only contents is changed', function (done) {
    $el.innerHTML = '<a>a</a><div>a</div>'
    $el.querySelector('a').addEventListener('click', function () {
      setTimeout(function () {
        $el.querySelector('div').innerText = 'b'
      }, 50)
    })

    var selector = new Selector({
      id: 'div',
      type: 'SelectorElementClick',
      multiple: true,
      clickElementSelector: 'a',
      selector: 'div',
      delay: 100,
      clickType: 'clickOnce'
    }, {$})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 2)
      assert.equal(data[0].innerText, 'a')
      assert.equal(data[1].innerText, 'b')
      done()
    })
  })

  it('should click buttons that are not yet added', function (done) {
    $el.innerHTML = '<a>1</a><div>a</div>'
    $el.querySelectorAll('a').forEach(el => el.addEventListener('click', function () {
      setTimeout(function () {
        $el.querySelectorAll('div').forEach(function (el) { el.innerText = 'b' })
        $el.querySelectorAll('a').forEach(el => el.remove())
        utils.appendHTML($el, '<a>2</a>', document)
        $el.querySelectorAll('a').forEach(el => el.addEventListener('click', function () {
          setTimeout(function () {
            $el.querySelectorAll('div').forEach(function (el) { el.innerText = 'c' })
          }, 50)
        }))
      }, 50)
    }))

    var selector = new Selector({
      id: 'div',
      type: 'SelectorElementClick',
      multiple: true,
      clickElementSelector: 'a',
      selector: 'div',
      delay: 100,
      clickType: 'clickOnce'
    }, {$})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 3)
      assert.equal(data[0].innerText, 'a')
      assert.equal(data[1].innerText, 'b')
      assert.equal(data[2].innerText, 'c')
      done()
    })
  })

  it('should discard initial elements for ClickOnce selector type', function (done) {
    $el.innerHTML = '<a>1</a><div>a</div>'
    $el.querySelectorAll('a').forEach(el => el.addEventListener('click', function () {
      setTimeout(function () {
        $el.querySelectorAll('div').forEach(el => el.innerText = 'b')
        $el.querySelectorAll('a').forEach(el => el.remove())
        utils.appendHTML($el, '<a>2</a>', document)
        $el.querySelectorAll('a').forEach(el => el.addEventListener('click', function () {
          setTimeout(function () {
            $el.querySelectorAll('div').forEach(el => el.innerText = 'c')
          }, 50)
        }))
      }, 50)
    }))

    var selector = new Selector({
      id: 'div',
      type: 'SelectorElementClick',
      multiple: true,
      clickElementSelector: 'a',
      selector: 'div',
      delay: 100,
      clickType: 'clickOnce',
      discardInitialElements: true
    }, {$})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 2)
      assert.equal(data[0].innerText, 'b')
      assert.equal(data[1].innerText, 'c')
      done()
    })
  })

  it('should extract elements with clickMore type', function (done) {
    $el.innerHTML = '<a>1</a><div>a</div>'
    var moreElements = ['b', 'c']
    $el.querySelectorAll('a').forEach(el => el.addEventListener('click', function () {
      var next = moreElements.shift()
      if (next) {
        setTimeout(function () {
          utils.appendHTML($el, '<div>' + next + '</div>', document)
        }, 50)
      }
			// remove if there won't be new elements
      if (moreElements.length === 0) {
        $el.querySelectorAll('a').forEach(el => el.remove())
      }
    }))

    var selector = new Selector({
      id: 'div',
      type: 'SelectorElementClick',
      multiple: true,
      clickElementSelector: 'a',
      selector: 'div',
      delay: 200,
      clickType: 'clickMore'
    }, {$})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 3)
      assert.equal(data[0].innerText, 'a')
      assert.equal(data[1].innerText, 'b')
      assert.equal(data[2].innerText, 'c')
      done()
    })
  })

  it('should click buttons that are added', function (done) {
    $el.innerHTML = '<a>1</a><div>a</div>'
    var moreElements = ['b', 'c']
    var clickHandler = function () {
      setTimeout(function () {
        var next = moreElements.shift()
        if (next) {
          utils.appendHTML($el, '<div>' + next + '</div>', document)
          $el.querySelectorAll('a').forEach(el => el.remove())
          utils.appendHTML($el, '<a>1</a>', document)
          $el.querySelectorAll('a').forEach(el => el.addEventListener('click', clickHandler))
        }
      }, 50)
    }

    $el.querySelectorAll('a').forEach(el => el.addEventListener('click', clickHandler))

    var selector = new Selector({
      id: 'div',
      type: 'SelectorElementClick',
      multiple: true,
      clickElementSelector: 'a',
      selector: 'div',
      delay: 100,
      clickType: 'clickMore'
    }, {$})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 3)
      assert.equal(data[0].innerText, 'a')
      assert.equal(data[1].innerText, 'b')
      assert.equal(data[2].innerText, 'c')
      done()
    })
  })

  // :contains is not a valid native selector
  it.skip('should discard initial elements for ClickMore selector type', function (done) {
    $el.innerHTML = '<a>1</a><div>a</div>'
    var moreElements = ['b', 'c']
    $el.querySelectorAll('a').forEach(el => el.addEventListener('click', function () {
      setTimeout(function () {
        $el.querySelectorAll("div:contains('a')").forEach(el => el.remove())
        var next = moreElements.shift()
        if (next) {
          utils.appendHTML($el, '<div>' + next + '</div>', document)
        }
      }, 50)
    }))

    var selector = new Selector({
      id: 'div',
      type: 'SelectorElementClick',
      multiple: true,
      clickElementSelector: 'a',
      selector: 'div',
      delay: 100,
      clickType: 'clickMore',
      discardInitialElements: true
    }, {$})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 2)
      assert.equal(data[0].innerText, 'a')
      assert.equal(data[1].innerText, 'b')
      done()
    })
  })

  it('should scrape elements with clickMore type when previous elements are removed after click', function (done) {
    $el.innerHTML = '<a>1</a><div>a</div>'
    var moreElements = ['b', 'c']
    $el.querySelectorAll('a').forEach(e => e.addEventListener('click', function () {
      setTimeout(function () {
        var next = moreElements.shift()

        if (next) {
          $el.querySelectorAll('div').forEach(el => el.innerText = next)
        }
      }, 50)
    }))

    var selector = new Selector({
      id: 'div',
      type: 'SelectorElementClick',
      multiple: true,
      clickElementSelector: 'a',
      selector: 'div',
      delay: 100,
      clickType: 'clickMore'
    }, {$})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 3)
      assert.equal(data[0].innerText, 'a')
      assert.equal(data[1].innerText, 'b')
      assert.equal(data[2].innerText, 'c')
      done()
    })
  })
})
