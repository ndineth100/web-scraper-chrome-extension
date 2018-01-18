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

  it('FTID selector', function (done) {
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
      selector: 'section',
      mapsSelectorFromDiv: 'iframe[src*="google.com/maps/embed"]'
    }, {$, document, window})

    var dataDeferred = selector.getData($el)
    dataDeferred.then(function (data) {
      assert.equal(data[0].a_FTID, '0x12a4a2674531e3bd:0xf12f53af6888194e')
      done()
    })
  })
})
