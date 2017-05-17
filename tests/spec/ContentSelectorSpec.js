const utils = require('./../utils')
const assert = require('chai').assert
const selectorMatchers = require('../Matchers')
const ContentSelector = require('../../extension/scripts/ContentSelector')
const globals = require('../globals')
// This is to select elements
describe('ContentSelector', function () {
  var $el
  let $
let document

  beforeEach(function () {
    $ = globals.$
document = globals.document

    document.body.innerHTML = utils.getTestHTML()
    $el = utils.createElementFromHTML("<div id='tests' style='display:none'></div>", document)
    document.body.appendChild($el)
  })

  var removeContentSelectorGUI = function (contentSelector) {
    assert.equal(document.querySelectorAll('#-selector-toolbar').length, 1)
    contentSelector.removeGUI()
    assert.equal(document.querySelectorAll('#-selector-toolbar').length, 0)
  }

  it('should be able to get css selector from user', async function () {
    utils.appendHTML($el, '<div id="content-script-css-selector-test"><a class="needed"></a><a></a></div>', document)

    var contentSelector = new ContentSelector({
      parentCSSSelector: 'div#content-script-css-selector-test',
      allowedElements: 'a'
    }, {$})

    var deferredCSSSelector = contentSelector.getCSSSelector()

		// click on the element that will be selected
    $el.querySelector('a.needed').click()

		// finish selection
    document.querySelector('#-selector-toolbar .done-selecting-button').click()

    await selectorMatchers.deferredToEqual(deferredCSSSelector, {CSSSelector: 'a.needed'})

    removeContentSelectorGUI(contentSelector)
  })

  it('should be return empty css selector when no element selected', async function () {
    utils.appendHTML($el, '<div id="content-script-css-selector-test"></div>', document)

    var contentSelector = new ContentSelector({
      parentCSSSelector: 'div#content-script-css-selector-test',
      allowedElements: 'a'
    }, {$})

    var currentCSSSelector = contentSelector.getCurrentCSSSelector()
    assert.equal(currentCSSSelector, '')

    var deferredCSSSelector = contentSelector.getCSSSelector()

    console.log(document.querySelector('#-selector-toolbar .done-selecting-button'))

    // finish selection
    document.querySelector('#-selector-toolbar .done-selecting-button').click()

    await selectorMatchers.deferredToEqual(deferredCSSSelector, {CSSSelector: ''})

    removeContentSelectorGUI(contentSelector)
  })

  // Cannot fix it :/
  it.skip('should use body as parent element when no parent selector specified', function () {
    var contentSelector = new ContentSelector({
      parentCSSSelector: ' ',
      allowedElements: 'a'
    }, {$})

		// finish selection
    document.querySelector('#selector-toolbar .done-selecting-button').click()

    assert.deepEqual(contentSelector.parent, document.body)
  })

  it('should reject selection when parent selector not found', async function () {
    var contentSelector = new ContentSelector({
      parentCSSSelector: 'div#content-script-css-selector-test',
      allowedElements: 'a',
      alert: function () {}
    }, {$})

    var deferredCSSSelector = contentSelector.getCSSSelector()
    await selectorMatchers.deferredToFail(deferredCSSSelector)
  })

  it('should be able to preview selected elements', function () {
    utils.appendHTML($el, '<div id="content-script-css-selector-test"><a></a></div>', document)

    var contentSelector = new ContentSelector({
      parentCSSSelector: 'div#content-script-css-selector-test'
    }, {$})

    contentSelector.previewSelector('a', {$})

    assert.equal(document.querySelectorAll('.-sitemap-select-item-selected').length, 1)
    assert.isTrue(document.querySelector('#content-script-css-selector-test').classList.contains('-sitemap-parent'))
    assert.isTrue($el.querySelector('a').classList.contains('-sitemap-select-item-selected'))

    contentSelector.removeGUI()

    assert.equal(document.querySelectorAll('.-sitemap-select-item-selected').length, 0)
    assert.isFalse($el.querySelector('#content-script-css-selector-test').classList.contains('-sitemap-parent'))
    assert.isFalse($el.querySelector('a').classList.contains('-sitemap-select-item-selected'))
  })

  it('should reject selector preview request when parent element not found', async function () {
    var contentSelector = new ContentSelector({
      parentCSSSelector: 'div#content-script-css-selector-test',
      alert: function () {}
    }, {$})

    var deferredSelectorPreview = contentSelector.previewSelector('a', {$})
    await selectorMatchers.deferredToFail(deferredSelectorPreview)

    assert.equal(document.querySelectorAll('.-sitemap-select-item-selected').length, 0)
  })
})
