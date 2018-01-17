const Selector = require('../../../extension/scripts/Selector')
const utils = require('./../../utils')
const assert = require('chai').assert
const globals = require('../../globals')
describe('Goog Map ID Selector', function () {
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

  it.only('FTID selector', function (done) {
    $el.innerHTML = `
        <iframe src='//20768463p.rfihub.com/ca.html?rb=303415&ca=202438463&_o=30656&_t=207878463&ra=REPLACE_ME_WITH_YOUR_CACHE_BUSTING' style='display:none;padding:0;margin:0' width='0' height='0'>
        </iframe>

      <section class="map-stars">
        <div class="overlay" onClick="style.pointerEvents='none'"></div>
        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2993.949554494766!2d2.161869551228708!3d41.37518070461241!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12a4a2674531e3bd%3A0xf12f53af6888194e!2sAv.+del+Mada%C5%80lel%2C+110%2C+28025+Madrid!5e0!3m2!1ses!2ses!4v1483432429343" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>
    </section>

      <div></div>      
    `
    var selector = new Selector({
      id: 'a',
      type: 'SelectorGoogMapID',
      googType: 'FTID',
      selector: 'section',
      mapsSelectorFromDiv: 'iframe[src*="google.com/maps/embed"]'
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data[0].FTID, '0x12a4a2674531e3bd:0xf12f53af6888194e')
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
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data[0].textContent, 'a')
      assert.equal(data[1].textContent, 'b')
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
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      assert.equal(data[0].textContent, 'test')
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
    }, {$, document, window})
    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      assert.equal(data[0].textContent, 'test')
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
    }, {$, document, window})
    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 1)
      assert.equal(data[0].textContent, 'test')
      done()
    })
  })

  it('should return no data columns', function () {
    var selector = new Selector({
      id: 'a',
      type: 'SelectorElement',
      multiple: true,
      selector: 'div'
    }, {$, document, window})

    var columns = selector.getDataColumns()
    assert.deepEqual(columns, [])
  })

  it('should return multiple elements if only contents is changed', function (done) {
    $el.innerHTML = '<a>a</a><div>a</div>'
    $el.querySelector('a').addEventListener('click', function () {
      setTimeout(function () {
        $el.querySelector('div').textContent = 'b'
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
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 2)
      assert.equal(data[0].textContent, 'a')
      assert.equal(data[1].textContent, 'b')
      done()
    })
  })

  it('should click buttons that are not yet added', function (done) {
    $el.innerHTML = '<a>1</a><div>a</div>'
    $el.querySelectorAll('a').forEach(el => el.addEventListener('click', function () {
      setTimeout(function () {
        $el.querySelectorAll('div').forEach(function (el) { el.textContent = 'b' })
        $el.querySelectorAll('a').forEach(el => el.remove())
        utils.appendHTML($el, '<a>2</a>', document)
        $el.querySelectorAll('a').forEach(el => el.addEventListener('click', function () {
          setTimeout(function () {
            $el.querySelectorAll('div').forEach(function (el) { el.textContent = 'c' })
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
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 3)
      assert.equal(data[0].textContent, 'a')
      assert.equal(data[1].textContent, 'b')
      assert.equal(data[2].textContent, 'c')
      done()
    })
  })

  it('should discard initial elements for ClickOnce selector type', function (done) {
    $el.innerHTML = '<a>1</a><div>a</div>'
    $el.querySelectorAll('a').forEach(el => el.addEventListener('click', function () {
      setTimeout(function () {
        $el.querySelectorAll('div').forEach(el => el.textContent = 'b')
        $el.querySelectorAll('a').forEach(el => el.remove())
        utils.appendHTML($el, '<a>2</a>', document)
        $el.querySelectorAll('a').forEach(el => el.addEventListener('click', function () {
          setTimeout(function () {
            $el.querySelectorAll('div').forEach(el => el.textContent = 'c')
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
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 2)
      assert.equal(data[0].textContent, 'b')
      assert.equal(data[1].textContent, 'c')
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
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 3)
      assert.equal(data[0].textContent, 'a')
      assert.equal(data[1].textContent, 'b')
      assert.equal(data[2].textContent, 'c')
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
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 3)
      assert.equal(data[0].textContent, 'a')
      assert.equal(data[1].textContent, 'b')
      assert.equal(data[2].textContent, 'c')
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
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 2)
      assert.equal(data[0].textContent, 'a')
      assert.equal(data[1].textContent, 'b')
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
          $el.querySelectorAll('div').forEach(el => el.textContent = next)
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
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data.length, 3)
      assert.equal(data[0].textContent, 'a')
      assert.equal(data[1].textContent, 'b')
      assert.equal(data[2].textContent, 'c')
      done()
    })
  })
})
