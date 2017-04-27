const getBackgroundScript = require('../../extension/scripts/getBackgroundScript')
const getContentScript = require('../../extension/scripts/getContentScript')
const selectorMatchers = require('./../Matchers')
const utils = require('./../utils')

describe('BackgroundScript', function () {
  var backgroundScript = getBackgroundScript('BackgroundScript')
  var $el

  beforeEach(function () {
    document.body.innerHTML = utils.getTestHTML()
    $el = utils.createElementFromHTML("<div id='tests' style='display:none'></div>")
    document.body.appendChild($el)
  })

  it('should be able to call BackgroundScript functions from background script', async function () {
    var deferredResponse = backgroundScript.dummy()
    await selectorMatchers.deferredToEqual(deferredResponse, 'dummy')
    await selectorMatchers.deferredToEqual(deferredResponse, 'dummy')
  })

  it('should be able to call BackgroundScript from Devtools', async function () {
    var backgroundScript = getBackgroundScript('DevTools')
    var deferredResponse = backgroundScript.dummy()
    await selectorMatchers.deferredToEqual(deferredResponse, 'dummy')
  })
})
