

var ChromeHeadlessBrowser = function (options) {

	this.pageLoadDelay = options.pageLoadDelay;
  this.pendingRequests = {}
	// @TODO somehow handle the closed window
};

ChromeHeadlessBrowser.prototype = {

	_initPopupWindow: function (callback, scope) {
    console.log('init popup ')
    var browser = this
    if (browser.client) {
      callback.call(scope)
      return
    }
    /*getTab('chrome://newtab')
      .then(function (tab) {
        console.log('tab id', this.tab.id)
        browser.tab = tab
        return CDP({tab})
      })*/
    (async function () {
      try {
        const tab = await CDP.New()
        browser.tab = tab
        const client = await CDP({tab})
        const {Runtime, Console, Page} = client
        await Runtime.enable()
        await Console.enable()
        await Page.enable()
        browser.client = client
        Runtime.consoleAPICalled(function ({args}) {
          if(args.length > 2 && args[0].description === 'scraped-event') {
            var id = args[1].description
            var callback = browser.pendingRequests[id]
            if (callback) {
              callback(args[2].description)
              delete browser.pendingRequests[id]
            }
          }

        })
        callback.call(scope)
      } catch (e) {
        console.error('Error in init popup window', err)
      }
    })()
	},

	loadUrl: function (url, callback) {
    var browser = this
    var client = this.client
    var {Page} = this.client

    Page.navigate({url})
		Page.loadEventFired(() => {
      console.log('page loaded')
      load(client)
        .then(() => setTimeout(callback, browser.pageLoadDelay))
        .catch(e => console.error('error loading', e))
    })

    async function load (client) {
      const {Page, Runtime} = client
      await Runtime.enable()
      await loadScripts(client)

    }
	},

	close: function () {
    var browser = this
    (async function () {
      try {
        await CDP.close({id: browser.tab.id})
      } catch (e) {
        console.error('Error on close', e)
      } finally {
        browser.client.close()
      }
    })()
	},

	fetchData: function (url, sitemap, parentSelectorId, callback, scope) {

		var browser = this;

		this._initPopupWindow(function () {
			const {Runtime} = browser.client

			browser.loadUrl(url, function () {

				var message = {
					extractData: true,
					sitemap: JSON.parse(JSON.stringify(sitemap)),
					parentSelectorId: parentSelectorId
				};
        var id = Math.random().toString(36).substring(15)
        browser.pendingRequests[id] = function (dataString) {
          callback.call(scope, JSON.parse(dataString))
        }
        browser.client.Runtime.evaluate({
          expression: `
            chrome.runtime.sendMessage(JSON.parse(${JSON.stringify(messsage)}), function (data) {
              console.log('extracted data from webpage', data)
              console.log('scraped-event', ${id}, JSON.stringify(data))
            })
          `
        })
			})
		}, this);
	}
};

async function getTab (url) {
  const targetId = await newTarget(url)
  const tab = await connectToTarget(targetId)
  return tab
}

async function newTarget (url) {
  const client = await CDP({tab: 'ws://localhost:9222/devtools/browser'})
  //console.log('client', client)
  const info = await client.Target.createTarget({url})
  console.log('info', info)
  client.close()
  return info.targetId
}

async function connectToTarget (targetId) {
  const tabs = await CDP.List()
  // console.log(tabs)
  var index = tabs.findIndex(tab => tab.id == targetId)
  return index
}

async function loadScript (client, path) {
  const {Runtime} = client
  const library = await readFile('./spec/' + path)
  console.log(library)
  const {scriptId} = await Runtime.compileScript({
    expression: library,
    sourceURL: Math.random().toString(36).substring(7),
    persistScript: true
  })
  await Runtime.runScript({scriptId})
}

async function loadScripts (client) {
  const {Runtime} = client
  const {scriptId} = await Runtime.compileScript({
    expression: bundledLibrary,
    sourceURL: Math.random().toString(36).substring(7),
    persistScript: true
  })
  /*for (let path of paths) {
    await loadScript(client, path)
  }*/
}

function readFile(path) {
  return new Promise(function (resolve, reject) {
    fs.readFile(path, 'utf-8', function (f) {
      resolve(f)
    })
  })
}

if (typeof require !== 'undefined') {
  global.ChromeHeadlessBrowser = ChromeHeadlessBrowser
}
