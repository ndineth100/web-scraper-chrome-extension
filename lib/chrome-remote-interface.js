var CDP =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	var EventEmitter = __webpack_require__(2);

	var devtools = __webpack_require__(3);
	var Chrome = __webpack_require__(50);

	module.exports = function (options, callback) {
	    if (typeof options === 'function') {
	        callback = options;
	        options = undefined;
	    }
	    var notifier = new EventEmitter();
	    if (typeof callback === 'function') {
	        // allow to register the error callback later
	        process.nextTick(function () {
	            new Chrome(options, notifier);
	        });
	        return notifier.on('connect', callback);
	    } else {
	        return new Promise(function (fulfill, reject) {
	            notifier.on('connect', fulfill);
	            notifier.on('error', reject);
	            notifier.on('disconnect', function () {
	                reject(new Error('Disconnected'));
	            });
	            new Chrome(options, notifier);
	        });
	    }
	};

	// for backward compatibility
	module.exports.listTabs = devtools.List;
	module.exports.spawnTab = devtools.New;
	module.exports.closeTab = devtools.Close;

	module.exports.Protocol = devtools.Protocol;
	module.exports.List = devtools.List;
	module.exports.New = devtools.New;
	module.exports.Activate = devtools.Activate;
	module.exports.Close = devtools.Close;
	module.exports.Version = devtools.Version;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 1 */
/***/ function(module, exports) {

	// shim for using process in browser
	var process = module.exports = {};

	// cached from whatever global is present so that test runners that stub it
	// don't break things.  But we need to wrap it in a try catch in case it is
	// wrapped in strict mode code which doesn't define any globals.  It's inside a
	// function because try/catches deoptimize in certain engines.

	var cachedSetTimeout;
	var cachedClearTimeout;

	function defaultSetTimout() {
	    throw new Error('setTimeout has not been defined');
	}
	function defaultClearTimeout () {
	    throw new Error('clearTimeout has not been defined');
	}
	(function () {
	    try {
	        if (typeof setTimeout === 'function') {
	            cachedSetTimeout = setTimeout;
	        } else {
	            cachedSetTimeout = defaultSetTimout;
	        }
	    } catch (e) {
	        cachedSetTimeout = defaultSetTimout;
	    }
	    try {
	        if (typeof clearTimeout === 'function') {
	            cachedClearTimeout = clearTimeout;
	        } else {
	            cachedClearTimeout = defaultClearTimeout;
	        }
	    } catch (e) {
	        cachedClearTimeout = defaultClearTimeout;
	    }
	} ())
	function runTimeout(fun) {
	    if (cachedSetTimeout === setTimeout) {
	        //normal enviroments in sane situations
	        return setTimeout(fun, 0);
	    }
	    // if setTimeout wasn't available but was latter defined
	    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
	        cachedSetTimeout = setTimeout;
	        return setTimeout(fun, 0);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedSetTimeout(fun, 0);
	    } catch(e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
	            return cachedSetTimeout.call(null, fun, 0);
	        } catch(e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
	            return cachedSetTimeout.call(this, fun, 0);
	        }
	    }


	}
	function runClearTimeout(marker) {
	    if (cachedClearTimeout === clearTimeout) {
	        //normal enviroments in sane situations
	        return clearTimeout(marker);
	    }
	    // if clearTimeout wasn't available but was latter defined
	    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
	        cachedClearTimeout = clearTimeout;
	        return clearTimeout(marker);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedClearTimeout(marker);
	    } catch (e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
	            return cachedClearTimeout.call(null, marker);
	        } catch (e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
	            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
	            return cachedClearTimeout.call(this, marker);
	        }
	    }



	}
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    if (!draining || !currentQueue) {
	        return;
	    }
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = runTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    runClearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        runTimeout(drainQueue);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 2 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      } else {
	        // At least give some kind of context to the user
	        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
	        err.context = er;
	        throw err;
	      }
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        args = Array.prototype.slice.call(arguments, 1);
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    args = Array.prototype.slice.call(arguments, 1);
	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else if (listeners) {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.prototype.listenerCount = function(type) {
	  if (this._events) {
	    var evlistener = this._events[type];

	    if (isFunction(evlistener))
	      return 1;
	    else if (evlistener)
	      return evlistener.length;
	  }
	  return 0;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  return emitter.listenerCount(type);
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {'use strict';

	var http = __webpack_require__(8);
	var https = __webpack_require__(46);

	var defaults = __webpack_require__(47);
	var externalRequest = __webpack_require__(48);

	// callback(err, protocol)
	module.exports.Protocol = promisesWrapper(function (options, callback) {
	    // if the local protocol is requested
	    if (!options.remote) {
	        var localDescriptor = __webpack_require__(49);
	        callback(null, {
	            'remote': false,
	            'descriptor': localDescriptor
	        });
	        return;
	    }
	    // try to fecth the browser version information and the protocol (remotely)
	    module.exports.Version(options, function (err, info) {
	        if (err) {
	            callback(err);
	            return;
	        }
	        // fetch the reported browser info (Node.js returns an array)
	        var browser = (info[0] || info).Browser;
	        // use the proper protocol fetcher
	        var fetcher = void 0;
	        if (browser.match(/^Chrome\//)) {
	            fetcher = fetchFromChromeRepo;
	        } else if (browser.match(/^Microsoft Edge /)) {
	            fetcher = fetchFromHttpEndpoint;
	        } else if (browser.match(/^node.js\//)) {
	            fetcher = fetchFromHttpEndpoint;
	        } else {
	            callback(new Error('Unknown implementation'));
	            return;
	        }
	        fetcher(options, info, function (err, descriptor) {
	            if (err) {
	                callback(err);
	                return;
	            }
	            // use the remotely fetched descriptor
	            callback(null, {
	                'remote': true,
	                'descriptor': descriptor
	            });
	        });
	    });
	});

	module.exports.List = promisesWrapper(function (options, callback) {
	    options.path = '/json/list';
	    devToolsInterface(options, function (err, tabs) {
	        if (err) {
	            callback(err);
	        } else {
	            callback(null, JSON.parse(tabs));
	        }
	    });
	});

	module.exports.New = promisesWrapper(function (options, callback) {
	    options.path = '/json/new';
	    if (Object.prototype.hasOwnProperty.call(options, 'url')) {
	        options.path += '?' + options.url;
	    }
	    devToolsInterface(options, function (err, tab) {
	        if (err) {
	            callback(err);
	        } else {
	            callback(null, JSON.parse(tab));
	        }
	    });
	});

	module.exports.Activate = promisesWrapper(function (options, callback) {
	    options.path = '/json/activate/' + options.id;
	    devToolsInterface(options, function (err) {
	        if (err) {
	            callback(err);
	        } else {
	            callback(null);
	        }
	    });
	});

	module.exports.Close = promisesWrapper(function (options, callback) {
	    options.path = '/json/close/' + options.id;
	    devToolsInterface(options, function (err) {
	        if (err) {
	            callback(err);
	        } else {
	            callback(null);
	        }
	    });
	});

	module.exports.Version = promisesWrapper(function (options, callback) {
	    options.path = '/json/version';
	    devToolsInterface(options, function (err, versionInfo) {
	        if (err) {
	            callback(err);
	        } else {
	            callback(null, JSON.parse(versionInfo));
	        }
	    });
	});

	// options.path must be specified; callback(err, data)
	function devToolsInterface(options, callback) {
	    options.host = options.host || defaults.HOST;
	    options.port = options.port || defaults.PORT;
	    externalRequest(http, options, callback);
	}

	// wrapper that allows to return a promise if the callback is omitted, it works
	// for DevTools methods
	function promisesWrapper(func) {
	    return function (options, callback) {
	        // options is an optional argument
	        if (typeof options === 'function') {
	            callback = options;
	            options = undefined;
	        }
	        options = options || {};
	        // just call the function otherwise wrap a promise around its execution
	        if (typeof callback === 'function') {
	            func(options, callback);
	        } else {
	            return new Promise(function (fulfill, reject) {
	                func(options, function (err, result) {
	                    if (err) {
	                        reject(err);
	                    } else {
	                        fulfill(result);
	                    }
	                });
	            });
	        }
	    };
	}

	// callback(err, descriptor)
	// XXX this function needs a proper refactor but the inconsistency of the
	// fetching process makes it useless for now
	function fetchFromChromeRepo(options, info, callback) {
	    function explodeVersion(v) {
	        return v.split('.').map(function (x) {
	            return parseInt(x);
	        });
	    }
	    // attempt to fetch the protocol directly from the Chromium repository
	    // according to the current version
	    //
	    // Thanks to Paul Irish.
	    // (see https://github.com/cyrus-and/chrome-remote-interface/issues/10#issuecomment-146032907)
	    var webKitVersion = info['WebKit-Version'];
	    var v8Version = info['V8-Version'];
	    var match = webKitVersion.match(/\s\(@(\b[0-9a-f]{5,40}\b)/);
	    var hash = match[1];
	    var fromChromiumDotOrg = hash <= 202666;
	    var urls = void 0;
	    if (fromChromiumDotOrg) {
	        urls = ['https://src.chromium.org/blink/trunk/Source/devtools/protocol.json?p=' + hash];
	    } else {
	        var lastBeforeSplitChromeVersion = '53.0.2758.1'; // before the split (https://crbug.com/580337)
	        var lastBeforeV8ChromeVersion = '55.0.2854.3'; // before using the JSON from the V8 repo
	        var chromeVersion = explodeVersion(info.Browser.split('/')[1]);
	        // according to https://www.chromium.org/developers/version-numbers
	        var beforeSplit = chromeVersion[2] <= explodeVersion(lastBeforeSplitChromeVersion)[2]; // patch not meaningful
	        var beforeFromV8 = chromeVersion[2] <= explodeVersion(lastBeforeV8ChromeVersion)[2]; // patch not meaningful
	        if (beforeSplit) {
	            urls = ['https://chromium.googlesource.com/chromium/src/+/' + hash + '/third_party/WebKit/Source/devtools/protocol.json?format=TEXT'];
	        } else if (beforeFromV8) {
	            urls = ['https://chromium.googlesource.com/chromium/src/+/' + hash + '/third_party/WebKit/Source/core/inspector/browser_protocol.json?format=TEXT', 'https://chromium.googlesource.com/chromium/src/+/' + hash + '/third_party/WebKit/Source/platform/v8_inspector/js_protocol.json?format=TEXT'];
	        } else if (v8Version) {
	            urls = ['https://chromium.googlesource.com/chromium/src/+/' + hash + '/third_party/WebKit/Source/core/inspector/browser_protocol.json?format=TEXT', 'https://chromium.googlesource.com/v8/v8/+/' + v8Version + '/src/inspector/js_protocol.json?format=TEXT'];
	        } else {
	            console.error('Warning: the protocol might be outdated, see: https://groups.google.com/d/topic/chrome-debugging-protocol/HjyOKainKus/discussion');
	            // releases which do not provide a V8 version get an old version of the V8 protocol
	            urls = ['https://chromium.googlesource.com/chromium/src/+/' + hash + '/third_party/WebKit/Source/core/inspector/browser_protocol.json?format=TEXT', 'https://chromium.googlesource.com/chromium/src/+/' + lastBeforeV8ChromeVersion + '/third_party/WebKit/Source/platform/v8_inspector/js_protocol.json?format=TEXT'];
	        }
	    }
	    var descriptors = [];
	    urls.forEach(function (url) {
	        externalRequest(https, url, function (err, data) {
	            var descriptor = void 0;
	            if (!err) {
	                try {
	                    // the file is served base64 encoded from googlesource.com
	                    if (!fromChromiumDotOrg) {
	                        data = new Buffer(data, 'base64').toString();
	                    }
	                    descriptor = JSON.parse(data);
	                } catch (_) {
	                    // abort later
	                }
	            }
	            descriptors.push(descriptor);
	            if (descriptors.length === urls.length) {
	                // all must be defined
	                if (descriptors.indexOf(undefined) !== -1) {
	                    callback(new Error('Cannot fetch from Chromium repo'));
	                    return;
	                }
	                // merge the domains
	                descriptors.forEach(function (descriptor, i) {
	                    if (i === 0) {
	                        return;
	                    }
	                    Array.prototype.push.apply(descriptors[0].domains, descriptor.domains);
	                });
	                callback(null, descriptors[0]);
	            }
	        });
	    });
	}

	// callback(err, descriptor)
	function fetchFromHttpEndpoint(options, info, callback) {
	    options.path = '/json/protocol';
	    devToolsInterface(options, function (err, descriptor) {
	        if (err) {
	            callback(err);
	        } else {
	            callback(null, JSON.parse(descriptor));
	        }
	    });
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4).Buffer))

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */
	/* eslint-disable no-proto */

	'use strict'

	var base64 = __webpack_require__(5)
	var ieee754 = __webpack_require__(6)
	var isArray = __webpack_require__(7)

	exports.Buffer = Buffer
	exports.SlowBuffer = SlowBuffer
	exports.INSPECT_MAX_BYTES = 50

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Due to various browser bugs, sometimes the Object implementation will be used even
	 * when the browser supports typed arrays.
	 *
	 * Note:
	 *
	 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
	 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *     incorrect length in some situations.

	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
	 * get the Object implementation, which is slower but behaves correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
	  ? global.TYPED_ARRAY_SUPPORT
	  : typedArraySupport()

	/*
	 * Export kMaxLength after typed array support is determined.
	 */
	exports.kMaxLength = kMaxLength()

	function typedArraySupport () {
	  try {
	    var arr = new Uint8Array(1)
	    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
	    return arr.foo() === 42 && // typed array instances can be augmented
	        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
	        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
	  } catch (e) {
	    return false
	  }
	}

	function kMaxLength () {
	  return Buffer.TYPED_ARRAY_SUPPORT
	    ? 0x7fffffff
	    : 0x3fffffff
	}

	function createBuffer (that, length) {
	  if (kMaxLength() < length) {
	    throw new RangeError('Invalid typed array length')
	  }
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = new Uint8Array(length)
	    that.__proto__ = Buffer.prototype
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    if (that === null) {
	      that = new Buffer(length)
	    }
	    that.length = length
	  }

	  return that
	}

	/**
	 * The Buffer constructor returns instances of `Uint8Array` that have their
	 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
	 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
	 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
	 * returns a single octet.
	 *
	 * The `Uint8Array` prototype remains unmodified.
	 */

	function Buffer (arg, encodingOrOffset, length) {
	  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
	    return new Buffer(arg, encodingOrOffset, length)
	  }

	  // Common case.
	  if (typeof arg === 'number') {
	    if (typeof encodingOrOffset === 'string') {
	      throw new Error(
	        'If encoding is specified then the first argument must be a string'
	      )
	    }
	    return allocUnsafe(this, arg)
	  }
	  return from(this, arg, encodingOrOffset, length)
	}

	Buffer.poolSize = 8192 // not used by this implementation

	// TODO: Legacy, not needed anymore. Remove in next major version.
	Buffer._augment = function (arr) {
	  arr.__proto__ = Buffer.prototype
	  return arr
	}

	function from (that, value, encodingOrOffset, length) {
	  if (typeof value === 'number') {
	    throw new TypeError('"value" argument must not be a number')
	  }

	  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
	    return fromArrayBuffer(that, value, encodingOrOffset, length)
	  }

	  if (typeof value === 'string') {
	    return fromString(that, value, encodingOrOffset)
	  }

	  return fromObject(that, value)
	}

	/**
	 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
	 * if value is a number.
	 * Buffer.from(str[, encoding])
	 * Buffer.from(array)
	 * Buffer.from(buffer)
	 * Buffer.from(arrayBuffer[, byteOffset[, length]])
	 **/
	Buffer.from = function (value, encodingOrOffset, length) {
	  return from(null, value, encodingOrOffset, length)
	}

	if (Buffer.TYPED_ARRAY_SUPPORT) {
	  Buffer.prototype.__proto__ = Uint8Array.prototype
	  Buffer.__proto__ = Uint8Array
	  if (typeof Symbol !== 'undefined' && Symbol.species &&
	      Buffer[Symbol.species] === Buffer) {
	    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
	    Object.defineProperty(Buffer, Symbol.species, {
	      value: null,
	      configurable: true
	    })
	  }
	}

	function assertSize (size) {
	  if (typeof size !== 'number') {
	    throw new TypeError('"size" argument must be a number')
	  } else if (size < 0) {
	    throw new RangeError('"size" argument must not be negative')
	  }
	}

	function alloc (that, size, fill, encoding) {
	  assertSize(size)
	  if (size <= 0) {
	    return createBuffer(that, size)
	  }
	  if (fill !== undefined) {
	    // Only pay attention to encoding if it's a string. This
	    // prevents accidentally sending in a number that would
	    // be interpretted as a start offset.
	    return typeof encoding === 'string'
	      ? createBuffer(that, size).fill(fill, encoding)
	      : createBuffer(that, size).fill(fill)
	  }
	  return createBuffer(that, size)
	}

	/**
	 * Creates a new filled Buffer instance.
	 * alloc(size[, fill[, encoding]])
	 **/
	Buffer.alloc = function (size, fill, encoding) {
	  return alloc(null, size, fill, encoding)
	}

	function allocUnsafe (that, size) {
	  assertSize(size)
	  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < size; ++i) {
	      that[i] = 0
	    }
	  }
	  return that
	}

	/**
	 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
	 * */
	Buffer.allocUnsafe = function (size) {
	  return allocUnsafe(null, size)
	}
	/**
	 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
	 */
	Buffer.allocUnsafeSlow = function (size) {
	  return allocUnsafe(null, size)
	}

	function fromString (that, string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') {
	    encoding = 'utf8'
	  }

	  if (!Buffer.isEncoding(encoding)) {
	    throw new TypeError('"encoding" must be a valid string encoding')
	  }

	  var length = byteLength(string, encoding) | 0
	  that = createBuffer(that, length)

	  var actual = that.write(string, encoding)

	  if (actual !== length) {
	    // Writing a hex string, for example, that contains invalid characters will
	    // cause everything after the first invalid character to be ignored. (e.g.
	    // 'abxxcd' will be treated as 'ab')
	    that = that.slice(0, actual)
	  }

	  return that
	}

	function fromArrayLike (that, array) {
	  var length = array.length < 0 ? 0 : checked(array.length) | 0
	  that = createBuffer(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	function fromArrayBuffer (that, array, byteOffset, length) {
	  array.byteLength // this throws if `array` is not a valid ArrayBuffer

	  if (byteOffset < 0 || array.byteLength < byteOffset) {
	    throw new RangeError('\'offset\' is out of bounds')
	  }

	  if (array.byteLength < byteOffset + (length || 0)) {
	    throw new RangeError('\'length\' is out of bounds')
	  }

	  if (byteOffset === undefined && length === undefined) {
	    array = new Uint8Array(array)
	  } else if (length === undefined) {
	    array = new Uint8Array(array, byteOffset)
	  } else {
	    array = new Uint8Array(array, byteOffset, length)
	  }

	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = array
	    that.__proto__ = Buffer.prototype
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that = fromArrayLike(that, array)
	  }
	  return that
	}

	function fromObject (that, obj) {
	  if (Buffer.isBuffer(obj)) {
	    var len = checked(obj.length) | 0
	    that = createBuffer(that, len)

	    if (that.length === 0) {
	      return that
	    }

	    obj.copy(that, 0, 0, len)
	    return that
	  }

	  if (obj) {
	    if ((typeof ArrayBuffer !== 'undefined' &&
	        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
	      if (typeof obj.length !== 'number' || isnan(obj.length)) {
	        return createBuffer(that, 0)
	      }
	      return fromArrayLike(that, obj)
	    }

	    if (obj.type === 'Buffer' && isArray(obj.data)) {
	      return fromArrayLike(that, obj.data)
	    }
	  }

	  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
	}

	function checked (length) {
	  // Note: cannot use `length < kMaxLength()` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= kMaxLength()) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (length) {
	  if (+length != length) { // eslint-disable-line eqeqeq
	    length = 0
	  }
	  return Buffer.alloc(+length)
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function compare (a, b) {
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError('Arguments must be Buffers')
	  }

	  if (a === b) return 0

	  var x = a.length
	  var y = b.length

	  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
	    if (a[i] !== b[i]) {
	      x = a[i]
	      y = b[i]
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'latin1':
	    case 'binary':
	    case 'base64':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.concat = function concat (list, length) {
	  if (!isArray(list)) {
	    throw new TypeError('"list" argument must be an Array of Buffers')
	  }

	  if (list.length === 0) {
	    return Buffer.alloc(0)
	  }

	  var i
	  if (length === undefined) {
	    length = 0
	    for (i = 0; i < list.length; ++i) {
	      length += list[i].length
	    }
	  }

	  var buffer = Buffer.allocUnsafe(length)
	  var pos = 0
	  for (i = 0; i < list.length; ++i) {
	    var buf = list[i]
	    if (!Buffer.isBuffer(buf)) {
	      throw new TypeError('"list" argument must be an Array of Buffers')
	    }
	    buf.copy(buffer, pos)
	    pos += buf.length
	  }
	  return buffer
	}

	function byteLength (string, encoding) {
	  if (Buffer.isBuffer(string)) {
	    return string.length
	  }
	  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
	      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
	    return string.byteLength
	  }
	  if (typeof string !== 'string') {
	    string = '' + string
	  }

	  var len = string.length
	  if (len === 0) return 0

	  // Use a for loop to avoid recursion
	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'latin1':
	      case 'binary':
	        return len
	      case 'utf8':
	      case 'utf-8':
	      case undefined:
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) return utf8ToBytes(string).length // assume utf8
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}
	Buffer.byteLength = byteLength

	function slowToString (encoding, start, end) {
	  var loweredCase = false

	  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
	  // property of a typed array.

	  // This behaves neither like String nor Uint8Array in that we set start/end
	  // to their upper/lower bounds if the value passed is out of range.
	  // undefined is handled specially as per ECMA-262 6th Edition,
	  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
	  if (start === undefined || start < 0) {
	    start = 0
	  }
	  // Return early if start > this.length. Done here to prevent potential uint32
	  // coercion fail below.
	  if (start > this.length) {
	    return ''
	  }

	  if (end === undefined || end > this.length) {
	    end = this.length
	  }

	  if (end <= 0) {
	    return ''
	  }

	  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
	  end >>>= 0
	  start >>>= 0

	  if (end <= start) {
	    return ''
	  }

	  if (!encoding) encoding = 'utf8'

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'latin1':
	      case 'binary':
	        return latin1Slice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
	// Buffer instances.
	Buffer.prototype._isBuffer = true

	function swap (b, n, m) {
	  var i = b[n]
	  b[n] = b[m]
	  b[m] = i
	}

	Buffer.prototype.swap16 = function swap16 () {
	  var len = this.length
	  if (len % 2 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 16-bits')
	  }
	  for (var i = 0; i < len; i += 2) {
	    swap(this, i, i + 1)
	  }
	  return this
	}

	Buffer.prototype.swap32 = function swap32 () {
	  var len = this.length
	  if (len % 4 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 32-bits')
	  }
	  for (var i = 0; i < len; i += 4) {
	    swap(this, i, i + 3)
	    swap(this, i + 1, i + 2)
	  }
	  return this
	}

	Buffer.prototype.swap64 = function swap64 () {
	  var len = this.length
	  if (len % 8 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 64-bits')
	  }
	  for (var i = 0; i < len; i += 8) {
	    swap(this, i, i + 7)
	    swap(this, i + 1, i + 6)
	    swap(this, i + 2, i + 5)
	    swap(this, i + 3, i + 4)
	  }
	  return this
	}

	Buffer.prototype.toString = function toString () {
	  var length = this.length | 0
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	}

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	}

	Buffer.prototype.inspect = function inspect () {
	  var str = ''
	  var max = exports.INSPECT_MAX_BYTES
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
	    if (this.length > max) str += ' ... '
	  }
	  return '<Buffer ' + str + '>'
	}

	Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
	  if (!Buffer.isBuffer(target)) {
	    throw new TypeError('Argument must be a Buffer')
	  }

	  if (start === undefined) {
	    start = 0
	  }
	  if (end === undefined) {
	    end = target ? target.length : 0
	  }
	  if (thisStart === undefined) {
	    thisStart = 0
	  }
	  if (thisEnd === undefined) {
	    thisEnd = this.length
	  }

	  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
	    throw new RangeError('out of range index')
	  }

	  if (thisStart >= thisEnd && start >= end) {
	    return 0
	  }
	  if (thisStart >= thisEnd) {
	    return -1
	  }
	  if (start >= end) {
	    return 1
	  }

	  start >>>= 0
	  end >>>= 0
	  thisStart >>>= 0
	  thisEnd >>>= 0

	  if (this === target) return 0

	  var x = thisEnd - thisStart
	  var y = end - start
	  var len = Math.min(x, y)

	  var thisCopy = this.slice(thisStart, thisEnd)
	  var targetCopy = target.slice(start, end)

	  for (var i = 0; i < len; ++i) {
	    if (thisCopy[i] !== targetCopy[i]) {
	      x = thisCopy[i]
	      y = targetCopy[i]
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
	// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
	//
	// Arguments:
	// - buffer - a Buffer to search
	// - val - a string, Buffer, or number
	// - byteOffset - an index into `buffer`; will be clamped to an int32
	// - encoding - an optional encoding, relevant is val is a string
	// - dir - true for indexOf, false for lastIndexOf
	function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
	  // Empty buffer means no match
	  if (buffer.length === 0) return -1

	  // Normalize byteOffset
	  if (typeof byteOffset === 'string') {
	    encoding = byteOffset
	    byteOffset = 0
	  } else if (byteOffset > 0x7fffffff) {
	    byteOffset = 0x7fffffff
	  } else if (byteOffset < -0x80000000) {
	    byteOffset = -0x80000000
	  }
	  byteOffset = +byteOffset  // Coerce to Number.
	  if (isNaN(byteOffset)) {
	    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
	    byteOffset = dir ? 0 : (buffer.length - 1)
	  }

	  // Normalize byteOffset: negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
	  if (byteOffset >= buffer.length) {
	    if (dir) return -1
	    else byteOffset = buffer.length - 1
	  } else if (byteOffset < 0) {
	    if (dir) byteOffset = 0
	    else return -1
	  }

	  // Normalize val
	  if (typeof val === 'string') {
	    val = Buffer.from(val, encoding)
	  }

	  // Finally, search either indexOf (if dir is true) or lastIndexOf
	  if (Buffer.isBuffer(val)) {
	    // Special case: looking for empty string/buffer always fails
	    if (val.length === 0) {
	      return -1
	    }
	    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
	  } else if (typeof val === 'number') {
	    val = val & 0xFF // Search for a byte value [0-255]
	    if (Buffer.TYPED_ARRAY_SUPPORT &&
	        typeof Uint8Array.prototype.indexOf === 'function') {
	      if (dir) {
	        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
	      } else {
	        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
	      }
	    }
	    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
	  var indexSize = 1
	  var arrLength = arr.length
	  var valLength = val.length

	  if (encoding !== undefined) {
	    encoding = String(encoding).toLowerCase()
	    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
	        encoding === 'utf16le' || encoding === 'utf-16le') {
	      if (arr.length < 2 || val.length < 2) {
	        return -1
	      }
	      indexSize = 2
	      arrLength /= 2
	      valLength /= 2
	      byteOffset /= 2
	    }
	  }

	  function read (buf, i) {
	    if (indexSize === 1) {
	      return buf[i]
	    } else {
	      return buf.readUInt16BE(i * indexSize)
	    }
	  }

	  var i
	  if (dir) {
	    var foundIndex = -1
	    for (i = byteOffset; i < arrLength; i++) {
	      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
	        if (foundIndex === -1) foundIndex = i
	        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
	      } else {
	        if (foundIndex !== -1) i -= i - foundIndex
	        foundIndex = -1
	      }
	    }
	  } else {
	    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
	    for (i = byteOffset; i >= 0; i--) {
	      var found = true
	      for (var j = 0; j < valLength; j++) {
	        if (read(arr, i + j) !== read(val, j)) {
	          found = false
	          break
	        }
	      }
	      if (found) return i
	    }
	  }

	  return -1
	}

	Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
	  return this.indexOf(val, byteOffset, encoding) !== -1
	}

	Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
	}

	Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
	}

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; ++i) {
	    var parsed = parseInt(string.substr(i * 2, 2), 16)
	    if (isNaN(parsed)) return i
	    buf[offset + i] = parsed
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function latin1Write (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8'
	    length = this.length
	    offset = 0
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset
	    length = this.length
	    offset = 0
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset | 0
	    if (isFinite(length)) {
	      length = length | 0
	      if (encoding === undefined) encoding = 'utf8'
	    } else {
	      encoding = length
	      length = undefined
	    }
	  // legacy write(string, encoding, offset, length) - remove in v0.13
	  } else {
	    throw new Error(
	      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
	    )
	  }

	  var remaining = this.length - offset
	  if (length === undefined || length > remaining) length = remaining

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('Attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8'

	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	        return asciiWrite(this, string, offset, length)

	      case 'latin1':
	      case 'binary':
	        return latin1Write(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end)
	  var res = []

	  var i = start
	  while (i < end) {
	    var firstByte = buf[i]
	    var codePoint = null
	    var bytesPerSequence = (firstByte > 0xEF) ? 4
	      : (firstByte > 0xDF) ? 3
	      : (firstByte > 0xBF) ? 2
	      : 1

	    if (i + bytesPerSequence <= end) {
	      var secondByte, thirdByte, fourthByte, tempCodePoint

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1]
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          fourthByte = buf[i + 3]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD
	      bytesPerSequence = 1
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
	      codePoint = 0xDC00 | codePoint & 0x3FF
	    }

	    res.push(codePoint)
	    i += bytesPerSequence
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	var MAX_ARGUMENTS_LENGTH = 0x1000

	function decodeCodePointsArray (codePoints) {
	  var len = codePoints.length
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  var res = ''
	  var i = 0
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    )
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i] & 0x7F)
	  }
	  return ret
	}

	function latin1Slice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i])
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; ++i) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  var len = this.length
	  start = ~~start
	  end = end === undefined ? len : ~~end

	  if (start < 0) {
	    start += len
	    if (start < 0) start = 0
	  } else if (start > len) {
	    start = len
	  }

	  if (end < 0) {
	    end += len
	    if (end < 0) end = 0
	  } else if (end > len) {
	    end = len
	  }

	  if (end < start) end = start

	  var newBuf
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    newBuf = this.subarray(start, end)
	    newBuf.__proto__ = Buffer.prototype
	  } else {
	    var sliceLen = end - start
	    newBuf = new Buffer(sliceLen, undefined)
	    for (var i = 0; i < sliceLen; ++i) {
	      newBuf[i] = this[i + start]
	    }
	  }

	  return newBuf
	}

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }

	  return val
	}

	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length)
	  }

	  var val = this[offset + --byteLength]
	  var mul = 1
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul
	  }

	  return val
	}

	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  return this[offset]
	}

	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return this[offset] | (this[offset + 1] << 8)
	}

	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return (this[offset] << 8) | this[offset + 1]
	}

	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	}

	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	}

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var i = byteLength
	  var mul = 1
	  var val = this[offset + --i]
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	}

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset] | (this[offset + 1] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset + 1] | (this[offset] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	}

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	}

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, true, 23, 4)
	}

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, false, 23, 4)
	}

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, true, 52, 8)
	}

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, false, 52, 8)
	}

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	}

	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    var maxBytes = Math.pow(2, 8 * byteLength) - 1
	    checkInt(this, value, offset, byteLength, maxBytes, 0)
	  }

	  var mul = 1
	  var i = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    var maxBytes = Math.pow(2, 8 * byteLength) - 1
	    checkInt(this, value, offset, byteLength, maxBytes, 0)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 1] = (value >>> 8)
	    this[offset] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = 0
	  var mul = 1
	  var sub = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
	      sub = 1
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  var sub = 0
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
	      sub = 1
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  if (value < 0) value = 0xff + value + 1
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 3] = (value >>> 24)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (value < 0) value = 0xffffffff + value + 1
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	  if (offset < 0) throw new RangeError('Index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	}

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (targetStart >= target.length) targetStart = target.length
	  if (!targetStart) targetStart = 0
	  if (end > 0 && end < start) end = start

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start
	  }

	  var len = end - start
	  var i

	  if (this === target && start < targetStart && targetStart < end) {
	    // descending copy from end
	    for (i = len - 1; i >= 0; --i) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    // ascending copy from start
	    for (i = 0; i < len; ++i) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else {
	    Uint8Array.prototype.set.call(
	      target,
	      this.subarray(start, start + len),
	      targetStart
	    )
	  }

	  return len
	}

	// Usage:
	//    buffer.fill(number[, offset[, end]])
	//    buffer.fill(buffer[, offset[, end]])
	//    buffer.fill(string[, offset[, end]][, encoding])
	Buffer.prototype.fill = function fill (val, start, end, encoding) {
	  // Handle string cases:
	  if (typeof val === 'string') {
	    if (typeof start === 'string') {
	      encoding = start
	      start = 0
	      end = this.length
	    } else if (typeof end === 'string') {
	      encoding = end
	      end = this.length
	    }
	    if (val.length === 1) {
	      var code = val.charCodeAt(0)
	      if (code < 256) {
	        val = code
	      }
	    }
	    if (encoding !== undefined && typeof encoding !== 'string') {
	      throw new TypeError('encoding must be a string')
	    }
	    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
	      throw new TypeError('Unknown encoding: ' + encoding)
	    }
	  } else if (typeof val === 'number') {
	    val = val & 255
	  }

	  // Invalid ranges are not set to a default, so can range check early.
	  if (start < 0 || this.length < start || this.length < end) {
	    throw new RangeError('Out of range index')
	  }

	  if (end <= start) {
	    return this
	  }

	  start = start >>> 0
	  end = end === undefined ? this.length : end >>> 0

	  if (!val) val = 0

	  var i
	  if (typeof val === 'number') {
	    for (i = start; i < end; ++i) {
	      this[i] = val
	    }
	  } else {
	    var bytes = Buffer.isBuffer(val)
	      ? val
	      : utf8ToBytes(new Buffer(val, encoding).toString())
	    var len = bytes.length
	    for (i = 0; i < end - start; ++i) {
	      this[i + start] = bytes[i % len]
	    }
	  }

	  return this
	}

	// HELPER FUNCTIONS
	// ================

	var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '='
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity
	  var codePoint
	  var length = string.length
	  var leadSurrogate = null
	  var bytes = []

	  for (var i = 0; i < length; ++i) {
	    codePoint = string.charCodeAt(i)

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	        leadSurrogate = codePoint
	        continue
	      }

	      // valid surrogate pair
	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	    }

	    leadSurrogate = null

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint)
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; ++i) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; ++i) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  for (var i = 0; i < length; ++i) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	function isnan (val) {
	  return val !== val // eslint-disable-line no-self-compare
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 5 */
/***/ function(module, exports) {

	'use strict'

	exports.byteLength = byteLength
	exports.toByteArray = toByteArray
	exports.fromByteArray = fromByteArray

	var lookup = []
	var revLookup = []
	var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

	var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	for (var i = 0, len = code.length; i < len; ++i) {
	  lookup[i] = code[i]
	  revLookup[code.charCodeAt(i)] = i
	}

	revLookup['-'.charCodeAt(0)] = 62
	revLookup['_'.charCodeAt(0)] = 63

	function placeHoldersCount (b64) {
	  var len = b64.length
	  if (len % 4 > 0) {
	    throw new Error('Invalid string. Length must be a multiple of 4')
	  }

	  // the number of equal signs (place holders)
	  // if there are two placeholders, than the two characters before it
	  // represent one byte
	  // if there is only one, then the three characters before it represent 2 bytes
	  // this is just a cheap hack to not do indexOf twice
	  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
	}

	function byteLength (b64) {
	  // base64 is 4/3 + up to two characters of the original data
	  return b64.length * 3 / 4 - placeHoldersCount(b64)
	}

	function toByteArray (b64) {
	  var i, j, l, tmp, placeHolders, arr
	  var len = b64.length
	  placeHolders = placeHoldersCount(b64)

	  arr = new Arr(len * 3 / 4 - placeHolders)

	  // if there are placeholders, only get up to the last complete 4 chars
	  l = placeHolders > 0 ? len - 4 : len

	  var L = 0

	  for (i = 0, j = 0; i < l; i += 4, j += 3) {
	    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
	    arr[L++] = (tmp >> 16) & 0xFF
	    arr[L++] = (tmp >> 8) & 0xFF
	    arr[L++] = tmp & 0xFF
	  }

	  if (placeHolders === 2) {
	    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
	    arr[L++] = tmp & 0xFF
	  } else if (placeHolders === 1) {
	    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
	    arr[L++] = (tmp >> 8) & 0xFF
	    arr[L++] = tmp & 0xFF
	  }

	  return arr
	}

	function tripletToBase64 (num) {
	  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
	}

	function encodeChunk (uint8, start, end) {
	  var tmp
	  var output = []
	  for (var i = start; i < end; i += 3) {
	    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
	    output.push(tripletToBase64(tmp))
	  }
	  return output.join('')
	}

	function fromByteArray (uint8) {
	  var tmp
	  var len = uint8.length
	  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
	  var output = ''
	  var parts = []
	  var maxChunkLength = 16383 // must be multiple of 3

	  // go through the array every three bytes, we'll deal with trailing stuff later
	  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
	    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
	  }

	  // pad the end with zeros, but make sure to not forget the extra bytes
	  if (extraBytes === 1) {
	    tmp = uint8[len - 1]
	    output += lookup[tmp >> 2]
	    output += lookup[(tmp << 4) & 0x3F]
	    output += '=='
	  } else if (extraBytes === 2) {
	    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
	    output += lookup[tmp >> 10]
	    output += lookup[(tmp >> 4) & 0x3F]
	    output += lookup[(tmp << 2) & 0x3F]
	    output += '='
	  }

	  parts.push(output)

	  return parts.join('')
	}


/***/ },
/* 6 */
/***/ function(module, exports) {

	exports.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var nBits = -7
	  var i = isLE ? (nBytes - 1) : 0
	  var d = isLE ? -1 : 1
	  var s = buffer[offset + i]

	  i += d

	  e = s & ((1 << (-nBits)) - 1)
	  s >>= (-nBits)
	  nBits += eLen
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1)
	  e >>= (-nBits)
	  nBits += mLen
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen)
	    e = e - eBias
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	}

	exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
	  var i = isLE ? 0 : (nBytes - 1)
	  var d = isLE ? 1 : -1
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

	  value = Math.abs(value)

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0
	    e = eMax
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2)
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--
	      c *= 2
	    }
	    if (e + eBias >= 1) {
	      value += rt / c
	    } else {
	      value += rt * Math.pow(2, 1 - eBias)
	    }
	    if (value * c >= 2) {
	      e++
	      c /= 2
	    }

	    if (e + eBias >= eMax) {
	      m = 0
	      e = eMax
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen)
	      e = e + eBias
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
	      e = 0
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m
	  eLen += mLen
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128
	}


/***/ },
/* 7 */
/***/ function(module, exports) {

	var toString = {}.toString;

	module.exports = Array.isArray || function (arr) {
	  return toString.call(arr) == '[object Array]';
	};


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {var ClientRequest = __webpack_require__(9)
	var extend = __webpack_require__(37)
	var statusCodes = __webpack_require__(38)
	var url = __webpack_require__(39)

	var http = exports

	http.request = function (opts, cb) {
		if (typeof opts === 'string')
			opts = url.parse(opts)
		else
			opts = extend(opts)

		// Normally, the page is loaded from http or https, so not specifying a protocol
		// will result in a (valid) protocol-relative url. However, this won't work if
		// the protocol is something else, like 'file:'
		var defaultProtocol = global.location.protocol.search(/^https?:$/) === -1 ? 'http:' : ''

		var protocol = opts.protocol || defaultProtocol
		var host = opts.hostname || opts.host
		var port = opts.port
		var path = opts.path || '/'

		// Necessary for IPv6 addresses
		if (host && host.indexOf(':') !== -1)
			host = '[' + host + ']'

		// This may be a relative url. The browser should always be able to interpret it correctly.
		opts.url = (host ? (protocol + '//' + host) : '') + (port ? ':' + port : '') + path
		opts.method = (opts.method || 'GET').toUpperCase()
		opts.headers = opts.headers || {}

		// Also valid opts.auth, opts.mode

		var req = new ClientRequest(opts)
		if (cb)
			req.on('response', cb)
		return req
	}

	http.get = function get (opts, cb) {
		var req = http.request(opts, cb)
		req.end()
		return req
	}

	http.Agent = function () {}
	http.Agent.defaultMaxSockets = 4

	http.STATUS_CODES = statusCodes

	http.METHODS = [
		'CHECKOUT',
		'CONNECT',
		'COPY',
		'DELETE',
		'GET',
		'HEAD',
		'LOCK',
		'M-SEARCH',
		'MERGE',
		'MKACTIVITY',
		'MKCOL',
		'MOVE',
		'NOTIFY',
		'OPTIONS',
		'PATCH',
		'POST',
		'PROPFIND',
		'PROPPATCH',
		'PURGE',
		'PUT',
		'REPORT',
		'SEARCH',
		'SUBSCRIBE',
		'TRACE',
		'UNLOCK',
		'UNSUBSCRIBE'
	]
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer, global, process) {var capability = __webpack_require__(10)
	var inherits = __webpack_require__(11)
	var response = __webpack_require__(12)
	var stream = __webpack_require__(13)
	var toArrayBuffer = __webpack_require__(36)

	var IncomingMessage = response.IncomingMessage
	var rStates = response.readyStates

	function decideMode (preferBinary, useFetch) {
		if (capability.fetch && useFetch) {
			return 'fetch'
		} else if (capability.mozchunkedarraybuffer) {
			return 'moz-chunked-arraybuffer'
		} else if (capability.msstream) {
			return 'ms-stream'
		} else if (capability.arraybuffer && preferBinary) {
			return 'arraybuffer'
		} else if (capability.vbArray && preferBinary) {
			return 'text:vbarray'
		} else {
			return 'text'
		}
	}

	var ClientRequest = module.exports = function (opts) {
		var self = this
		stream.Writable.call(self)

		self._opts = opts
		self._body = []
		self._headers = {}
		if (opts.auth)
			self.setHeader('Authorization', 'Basic ' + new Buffer(opts.auth).toString('base64'))
		Object.keys(opts.headers).forEach(function (name) {
			self.setHeader(name, opts.headers[name])
		})

		var preferBinary
		var useFetch = true
		if (opts.mode === 'disable-fetch' || 'timeout' in opts) {
			// If the use of XHR should be preferred and includes preserving the 'content-type' header.
			// Force XHR to be used since the Fetch API does not yet support timeouts.
			useFetch = false
			preferBinary = true
		} else if (opts.mode === 'prefer-streaming') {
			// If streaming is a high priority but binary compatibility and
			// the accuracy of the 'content-type' header aren't
			preferBinary = false
		} else if (opts.mode === 'allow-wrong-content-type') {
			// If streaming is more important than preserving the 'content-type' header
			preferBinary = !capability.overrideMimeType
		} else if (!opts.mode || opts.mode === 'default' || opts.mode === 'prefer-fast') {
			// Use binary if text streaming may corrupt data or the content-type header, or for speed
			preferBinary = true
		} else {
			throw new Error('Invalid value for opts.mode')
		}
		self._mode = decideMode(preferBinary, useFetch)

		self.on('finish', function () {
			self._onFinish()
		})
	}

	inherits(ClientRequest, stream.Writable)

	ClientRequest.prototype.setHeader = function (name, value) {
		var self = this
		var lowerName = name.toLowerCase()
		// This check is not necessary, but it prevents warnings from browsers about setting unsafe
		// headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
		// http-browserify did it, so I will too.
		if (unsafeHeaders.indexOf(lowerName) !== -1)
			return

		self._headers[lowerName] = {
			name: name,
			value: value
		}
	}

	ClientRequest.prototype.getHeader = function (name) {
		var self = this
		return self._headers[name.toLowerCase()].value
	}

	ClientRequest.prototype.removeHeader = function (name) {
		var self = this
		delete self._headers[name.toLowerCase()]
	}

	ClientRequest.prototype._onFinish = function () {
		var self = this

		if (self._destroyed)
			return
		var opts = self._opts

		var headersObj = self._headers
		var body = null
		if (opts.method === 'POST' || opts.method === 'PUT' || opts.method === 'PATCH' || opts.method === 'MERGE') {
			if (capability.blobConstructor) {
				body = new global.Blob(self._body.map(function (buffer) {
					return toArrayBuffer(buffer)
				}), {
					type: (headersObj['content-type'] || {}).value || ''
				})
			} else {
				// get utf8 string
				body = Buffer.concat(self._body).toString()
			}
		}

		if (self._mode === 'fetch') {
			var headers = Object.keys(headersObj).map(function (name) {
				return [headersObj[name].name, headersObj[name].value]
			})

			global.fetch(self._opts.url, {
				method: self._opts.method,
				headers: headers,
				body: body || undefined,
				mode: 'cors',
				credentials: opts.withCredentials ? 'include' : 'same-origin'
			}).then(function (response) {
				self._fetchResponse = response
				self._connect()
			}, function (reason) {
				self.emit('error', reason)
			})
		} else {
			var xhr = self._xhr = new global.XMLHttpRequest()
			try {
				xhr.open(self._opts.method, self._opts.url, true)
			} catch (err) {
				process.nextTick(function () {
					self.emit('error', err)
				})
				return
			}

			// Can't set responseType on really old browsers
			if ('responseType' in xhr)
				xhr.responseType = self._mode.split(':')[0]

			if ('withCredentials' in xhr)
				xhr.withCredentials = !!opts.withCredentials

			if (self._mode === 'text' && 'overrideMimeType' in xhr)
				xhr.overrideMimeType('text/plain; charset=x-user-defined')

			if ('timeout' in opts) {
				xhr.timeout = opts.timeout
				xhr.ontimeout = function () {
					self.emit('timeout')
				}
			}

			Object.keys(headersObj).forEach(function (name) {
				xhr.setRequestHeader(headersObj[name].name, headersObj[name].value)
			})

			self._response = null
			xhr.onreadystatechange = function () {
				switch (xhr.readyState) {
					case rStates.LOADING:
					case rStates.DONE:
						self._onXHRProgress()
						break
				}
			}
			// Necessary for streaming in Firefox, since xhr.response is ONLY defined
			// in onprogress, not in onreadystatechange with xhr.readyState = 3
			if (self._mode === 'moz-chunked-arraybuffer') {
				xhr.onprogress = function () {
					self._onXHRProgress()
				}
			}

			xhr.onerror = function () {
				if (self._destroyed)
					return
				self.emit('error', new Error('XHR error'))
			}

			try {
				xhr.send(body)
			} catch (err) {
				process.nextTick(function () {
					self.emit('error', err)
				})
				return
			}
		}
	}

	/**
	 * Checks if xhr.status is readable and non-zero, indicating no error.
	 * Even though the spec says it should be available in readyState 3,
	 * accessing it throws an exception in IE8
	 */
	function statusValid (xhr) {
		try {
			var status = xhr.status
			return (status !== null && status !== 0)
		} catch (e) {
			return false
		}
	}

	ClientRequest.prototype._onXHRProgress = function () {
		var self = this

		if (!statusValid(self._xhr) || self._destroyed)
			return

		if (!self._response)
			self._connect()

		self._response._onXHRProgress()
	}

	ClientRequest.prototype._connect = function () {
		var self = this

		if (self._destroyed)
			return

		self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode)
		self._response.on('error', function(err) {
			self.emit('error', err)
		})

		self.emit('response', self._response)
	}

	ClientRequest.prototype._write = function (chunk, encoding, cb) {
		var self = this

		self._body.push(chunk)
		cb()
	}

	ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function () {
		var self = this
		self._destroyed = true
		if (self._response)
			self._response._destroyed = true
		if (self._xhr)
			self._xhr.abort()
		// Currently, there isn't a way to truly abort a fetch.
		// If you like bikeshedding, see https://github.com/whatwg/fetch/issues/27
	}

	ClientRequest.prototype.end = function (data, encoding, cb) {
		var self = this
		if (typeof data === 'function') {
			cb = data
			data = undefined
		}

		stream.Writable.prototype.end.call(self, data, encoding, cb)
	}

	ClientRequest.prototype.flushHeaders = function () {}
	ClientRequest.prototype.setTimeout = function () {}
	ClientRequest.prototype.setNoDelay = function () {}
	ClientRequest.prototype.setSocketKeepAlive = function () {}

	// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
	var unsafeHeaders = [
		'accept-charset',
		'accept-encoding',
		'access-control-request-headers',
		'access-control-request-method',
		'connection',
		'content-length',
		'cookie',
		'cookie2',
		'date',
		'dnt',
		'expect',
		'host',
		'keep-alive',
		'origin',
		'referer',
		'te',
		'trailer',
		'transfer-encoding',
		'upgrade',
		'user-agent',
		'via'
	]

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4).Buffer, (function() { return this; }()), __webpack_require__(1)))

/***/ },
/* 10 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {exports.fetch = isFunction(global.fetch) && isFunction(global.ReadableStream)

	exports.blobConstructor = false
	try {
		new Blob([new ArrayBuffer(1)])
		exports.blobConstructor = true
	} catch (e) {}

	// The xhr request to example.com may violate some restrictive CSP configurations,
	// so if we're running in a browser that supports `fetch`, avoid calling getXHR()
	// and assume support for certain features below.
	var xhr
	function getXHR () {
		// Cache the xhr value
		if (xhr !== undefined) return xhr

		if (global.XMLHttpRequest) {
			xhr = new global.XMLHttpRequest()
			// If XDomainRequest is available (ie only, where xhr might not work
			// cross domain), use the page location. Otherwise use example.com
			// Note: this doesn't actually make an http request.
			try {
				xhr.open('GET', global.XDomainRequest ? '/' : 'https://example.com')
			} catch(e) {
				xhr = null
			}
		} else {
			// Service workers don't have XHR
			xhr = null
		}
		return xhr
	}

	function checkTypeSupport (type) {
		var xhr = getXHR()
		if (!xhr) return false
		try {
			xhr.responseType = type
			return xhr.responseType === type
		} catch (e) {}
		return false
	}

	// For some strange reason, Safari 7.0 reports typeof global.ArrayBuffer === 'object'.
	// Safari 7.1 appears to have fixed this bug.
	var haveArrayBuffer = typeof global.ArrayBuffer !== 'undefined'
	var haveSlice = haveArrayBuffer && isFunction(global.ArrayBuffer.prototype.slice)

	// If fetch is supported, then arraybuffer will be supported too. Skip calling
	// checkTypeSupport(), since that calls getXHR().
	exports.arraybuffer = exports.fetch || (haveArrayBuffer && checkTypeSupport('arraybuffer'))

	// These next two tests unavoidably show warnings in Chrome. Since fetch will always
	// be used if it's available, just return false for these to avoid the warnings.
	exports.msstream = !exports.fetch && haveSlice && checkTypeSupport('ms-stream')
	exports.mozchunkedarraybuffer = !exports.fetch && haveArrayBuffer &&
		checkTypeSupport('moz-chunked-arraybuffer')

	// If fetch is supported, then overrideMimeType will be supported too. Skip calling
	// getXHR().
	exports.overrideMimeType = exports.fetch || (getXHR() ? isFunction(getXHR().overrideMimeType) : false)

	exports.vbArray = isFunction(global.VBArray)

	function isFunction (value) {
		return typeof value === 'function'
	}

	xhr = null // Help gc

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 11 */
/***/ function(module, exports) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process, Buffer, global) {var capability = __webpack_require__(10)
	var inherits = __webpack_require__(11)
	var stream = __webpack_require__(13)

	var rStates = exports.readyStates = {
		UNSENT: 0,
		OPENED: 1,
		HEADERS_RECEIVED: 2,
		LOADING: 3,
		DONE: 4
	}

	var IncomingMessage = exports.IncomingMessage = function (xhr, response, mode) {
		var self = this
		stream.Readable.call(self)

		self._mode = mode
		self.headers = {}
		self.rawHeaders = []
		self.trailers = {}
		self.rawTrailers = []

		// Fake the 'close' event, but only once 'end' fires
		self.on('end', function () {
			// The nextTick is necessary to prevent the 'request' module from causing an infinite loop
			process.nextTick(function () {
				self.emit('close')
			})
		})

		if (mode === 'fetch') {
			self._fetchResponse = response

			self.url = response.url
			self.statusCode = response.status
			self.statusMessage = response.statusText
			
			response.headers.forEach(function(header, key){
				self.headers[key.toLowerCase()] = header
				self.rawHeaders.push(key, header)
			})


			// TODO: this doesn't respect backpressure. Once WritableStream is available, this can be fixed
			var reader = response.body.getReader()
			function read () {
				reader.read().then(function (result) {
					if (self._destroyed)
						return
					if (result.done) {
						self.push(null)
						return
					}
					self.push(new Buffer(result.value))
					read()
				}).catch(function(err) {
					self.emit('error', err)
				})
			}
			read()

		} else {
			self._xhr = xhr
			self._pos = 0

			self.url = xhr.responseURL
			self.statusCode = xhr.status
			self.statusMessage = xhr.statusText
			var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
			headers.forEach(function (header) {
				var matches = header.match(/^([^:]+):\s*(.*)/)
				if (matches) {
					var key = matches[1].toLowerCase()
					if (key === 'set-cookie') {
						if (self.headers[key] === undefined) {
							self.headers[key] = []
						}
						self.headers[key].push(matches[2])
					} else if (self.headers[key] !== undefined) {
						self.headers[key] += ', ' + matches[2]
					} else {
						self.headers[key] = matches[2]
					}
					self.rawHeaders.push(matches[1], matches[2])
				}
			})

			self._charset = 'x-user-defined'
			if (!capability.overrideMimeType) {
				var mimeType = self.rawHeaders['mime-type']
				if (mimeType) {
					var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
					if (charsetMatch) {
						self._charset = charsetMatch[1].toLowerCase()
					}
				}
				if (!self._charset)
					self._charset = 'utf-8' // best guess
			}
		}
	}

	inherits(IncomingMessage, stream.Readable)

	IncomingMessage.prototype._read = function () {}

	IncomingMessage.prototype._onXHRProgress = function () {
		var self = this

		var xhr = self._xhr

		var response = null
		switch (self._mode) {
			case 'text:vbarray': // For IE9
				if (xhr.readyState !== rStates.DONE)
					break
				try {
					// This fails in IE8
					response = new global.VBArray(xhr.responseBody).toArray()
				} catch (e) {}
				if (response !== null) {
					self.push(new Buffer(response))
					break
				}
				// Falls through in IE8	
			case 'text':
				try { // This will fail when readyState = 3 in IE9. Switch mode and wait for readyState = 4
					response = xhr.responseText
				} catch (e) {
					self._mode = 'text:vbarray'
					break
				}
				if (response.length > self._pos) {
					var newData = response.substr(self._pos)
					if (self._charset === 'x-user-defined') {
						var buffer = new Buffer(newData.length)
						for (var i = 0; i < newData.length; i++)
							buffer[i] = newData.charCodeAt(i) & 0xff

						self.push(buffer)
					} else {
						self.push(newData, self._charset)
					}
					self._pos = response.length
				}
				break
			case 'arraybuffer':
				if (xhr.readyState !== rStates.DONE || !xhr.response)
					break
				response = xhr.response
				self.push(new Buffer(new Uint8Array(response)))
				break
			case 'moz-chunked-arraybuffer': // take whole
				response = xhr.response
				if (xhr.readyState !== rStates.LOADING || !response)
					break
				self.push(new Buffer(new Uint8Array(response)))
				break
			case 'ms-stream':
				response = xhr.response
				if (xhr.readyState !== rStates.LOADING)
					break
				var reader = new global.MSStreamReader()
				reader.onprogress = function () {
					if (reader.result.byteLength > self._pos) {
						self.push(new Buffer(new Uint8Array(reader.result.slice(self._pos))))
						self._pos = reader.result.byteLength
					}
				}
				reader.onload = function () {
					self.push(null)
				}
				// reader.onerror = ??? // TODO: this
				reader.readAsArrayBuffer(response)
				break
		}

		// The ms-stream case handles end separately in reader.onload()
		if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
			self.push(null)
		}
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1), __webpack_require__(4).Buffer, (function() { return this; }())))

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {var Stream = (function (){
	  try {
	    return __webpack_require__(14); // hack to fix a circular dependency issue when used with browserify
	  } catch(_){}
	}());
	exports = module.exports = __webpack_require__(26);
	exports.Stream = Stream || exports;
	exports.Readable = exports;
	exports.Writable = __webpack_require__(17);
	exports.Duplex = __webpack_require__(25);
	exports.Transform = __webpack_require__(33);
	exports.PassThrough = __webpack_require__(35);

	if (!process.browser && process.env.READABLE_STREAM === 'disable' && Stream) {
	  module.exports = Stream;
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Stream;

	var EE = __webpack_require__(2).EventEmitter;
	var inherits = __webpack_require__(15);

	inherits(Stream, EE);
	Stream.Readable = __webpack_require__(13);
	Stream.Writable = __webpack_require__(16);
	Stream.Duplex = __webpack_require__(31);
	Stream.Transform = __webpack_require__(32);
	Stream.PassThrough = __webpack_require__(34);

	// Backwards-compat with node 0.4.x
	Stream.Stream = Stream;



	// old-style streams.  Note that the pipe method (the only relevant
	// part of this class) is overridden in the Readable class.

	function Stream() {
	  EE.call(this);
	}

	Stream.prototype.pipe = function(dest, options) {
	  var source = this;

	  function ondata(chunk) {
	    if (dest.writable) {
	      if (false === dest.write(chunk) && source.pause) {
	        source.pause();
	      }
	    }
	  }

	  source.on('data', ondata);

	  function ondrain() {
	    if (source.readable && source.resume) {
	      source.resume();
	    }
	  }

	  dest.on('drain', ondrain);

	  // If the 'end' option is not supplied, dest.end() will be called when
	  // source gets the 'end' or 'close' events.  Only dest.end() once.
	  if (!dest._isStdio && (!options || options.end !== false)) {
	    source.on('end', onend);
	    source.on('close', onclose);
	  }

	  var didOnEnd = false;
	  function onend() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    dest.end();
	  }


	  function onclose() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    if (typeof dest.destroy === 'function') dest.destroy();
	  }

	  // don't leave dangling pipes when there are errors.
	  function onerror(er) {
	    cleanup();
	    if (EE.listenerCount(this, 'error') === 0) {
	      throw er; // Unhandled stream error in pipe.
	    }
	  }

	  source.on('error', onerror);
	  dest.on('error', onerror);

	  // remove all the event listeners that were added.
	  function cleanup() {
	    source.removeListener('data', ondata);
	    dest.removeListener('drain', ondrain);

	    source.removeListener('end', onend);
	    source.removeListener('close', onclose);

	    source.removeListener('error', onerror);
	    dest.removeListener('error', onerror);

	    source.removeListener('end', cleanup);
	    source.removeListener('close', cleanup);

	    dest.removeListener('close', cleanup);
	  }

	  source.on('end', cleanup);
	  source.on('close', cleanup);

	  dest.on('close', cleanup);

	  dest.emit('pipe', source);

	  // Allow for unix-like usage: A.pipe(B).pipe(C)
	  return dest;
	};


/***/ },
/* 15 */
/***/ function(module, exports) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(17)


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process, setImmediate) {// A bit simpler than readable streams.
	// Implement an async ._write(chunk, encoding, cb), and it'll handle all
	// the drain event emission and buffering.

	'use strict';

	module.exports = Writable;

	/*<replacement>*/
	var processNextTick = __webpack_require__(20);
	/*</replacement>*/

	/*<replacement>*/
	var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
	/*</replacement>*/

	/*<replacement>*/
	var Duplex;
	/*</replacement>*/

	Writable.WritableState = WritableState;

	/*<replacement>*/
	var util = __webpack_require__(21);
	util.inherits = __webpack_require__(22);
	/*</replacement>*/

	/*<replacement>*/
	var internalUtil = {
	  deprecate: __webpack_require__(23)
	};
	/*</replacement>*/

	/*<replacement>*/
	var Stream;
	(function () {
	  try {
	    Stream = __webpack_require__(14);
	  } catch (_) {} finally {
	    if (!Stream) Stream = __webpack_require__(2).EventEmitter;
	  }
	})();
	/*</replacement>*/

	var Buffer = __webpack_require__(4).Buffer;
	/*<replacement>*/
	var bufferShim = __webpack_require__(24);
	/*</replacement>*/

	util.inherits(Writable, Stream);

	function nop() {}

	function WriteReq(chunk, encoding, cb) {
	  this.chunk = chunk;
	  this.encoding = encoding;
	  this.callback = cb;
	  this.next = null;
	}

	function WritableState(options, stream) {
	  Duplex = Duplex || __webpack_require__(25);

	  options = options || {};

	  // object stream flag to indicate whether or not this stream
	  // contains buffers or objects.
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

	  // the point at which write() starts returning false
	  // Note: 0 is a valid value, means that we always return false if
	  // the entire buffer is not flushed immediately on write()
	  var hwm = options.highWaterMark;
	  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

	  // cast to ints.
	  this.highWaterMark = ~ ~this.highWaterMark;

	  // drain event flag.
	  this.needDrain = false;
	  // at the start of calling end()
	  this.ending = false;
	  // when end() has been called, and returned
	  this.ended = false;
	  // when 'finish' is emitted
	  this.finished = false;

	  // should we decode strings into buffers before passing to _write?
	  // this is here so that some node-core streams can optimize string
	  // handling at a lower level.
	  var noDecode = options.decodeStrings === false;
	  this.decodeStrings = !noDecode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // not an actual buffer we keep track of, but a measurement
	  // of how much we're waiting to get pushed to some underlying
	  // socket or file.
	  this.length = 0;

	  // a flag to see when we're in the middle of a write.
	  this.writing = false;

	  // when true all writes will be buffered until .uncork() call
	  this.corked = 0;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // a flag to know if we're processing previously buffered items, which
	  // may call the _write() callback in the same tick, so that we don't
	  // end up in an overlapped onwrite situation.
	  this.bufferProcessing = false;

	  // the callback that's passed to _write(chunk,cb)
	  this.onwrite = function (er) {
	    onwrite(stream, er);
	  };

	  // the callback that the user supplies to write(chunk,encoding,cb)
	  this.writecb = null;

	  // the amount that is being written when _write is called.
	  this.writelen = 0;

	  this.bufferedRequest = null;
	  this.lastBufferedRequest = null;

	  // number of pending user-supplied write callbacks
	  // this must be 0 before 'finish' can be emitted
	  this.pendingcb = 0;

	  // emit prefinish if the only thing we're waiting for is _write cbs
	  // This is relevant for synchronous Transform streams
	  this.prefinished = false;

	  // True if the error was already emitted and should not be thrown again
	  this.errorEmitted = false;

	  // count buffered requests
	  this.bufferedRequestCount = 0;

	  // allocate the first CorkedRequest, there is always
	  // one allocated and free to use, and we maintain at most two
	  this.corkedRequestsFree = new CorkedRequest(this);
	}

	WritableState.prototype.getBuffer = function getBuffer() {
	  var current = this.bufferedRequest;
	  var out = [];
	  while (current) {
	    out.push(current);
	    current = current.next;
	  }
	  return out;
	};

	(function () {
	  try {
	    Object.defineProperty(WritableState.prototype, 'buffer', {
	      get: internalUtil.deprecate(function () {
	        return this.getBuffer();
	      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
	    });
	  } catch (_) {}
	})();

	// Test _writableState for inheritance to account for Duplex streams,
	// whose prototype chain only points to Readable.
	var realHasInstance;
	if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
	  realHasInstance = Function.prototype[Symbol.hasInstance];
	  Object.defineProperty(Writable, Symbol.hasInstance, {
	    value: function (object) {
	      if (realHasInstance.call(this, object)) return true;

	      return object && object._writableState instanceof WritableState;
	    }
	  });
	} else {
	  realHasInstance = function (object) {
	    return object instanceof this;
	  };
	}

	function Writable(options) {
	  Duplex = Duplex || __webpack_require__(25);

	  // Writable ctor is applied to Duplexes, too.
	  // `realHasInstance` is necessary because using plain `instanceof`
	  // would return false, as no `_writableState` property is attached.

	  // Trying to use the custom `instanceof` for Writable here will also break the
	  // Node.js LazyTransform implementation, which has a non-trivial getter for
	  // `_writableState` that would lead to infinite recursion.
	  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
	    return new Writable(options);
	  }

	  this._writableState = new WritableState(options, this);

	  // legacy.
	  this.writable = true;

	  if (options) {
	    if (typeof options.write === 'function') this._write = options.write;

	    if (typeof options.writev === 'function') this._writev = options.writev;
	  }

	  Stream.call(this);
	}

	// Otherwise people can pipe Writable streams, which is just wrong.
	Writable.prototype.pipe = function () {
	  this.emit('error', new Error('Cannot pipe, not readable'));
	};

	function writeAfterEnd(stream, cb) {
	  var er = new Error('write after end');
	  // TODO: defer error events consistently everywhere, not just the cb
	  stream.emit('error', er);
	  processNextTick(cb, er);
	}

	// If we get something that is not a buffer, string, null, or undefined,
	// and we're not in objectMode, then that's an error.
	// Otherwise stream chunks are all considered to be of length=1, and the
	// watermarks determine how many objects to keep in the buffer, rather than
	// how many bytes or characters.
	function validChunk(stream, state, chunk, cb) {
	  var valid = true;
	  var er = false;
	  // Always throw error if a null is written
	  // if we are not in object mode then throw
	  // if it is not a buffer, string, or undefined.
	  if (chunk === null) {
	    er = new TypeError('May not write null values to stream');
	  } else if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
	    er = new TypeError('Invalid non-string/buffer chunk');
	  }
	  if (er) {
	    stream.emit('error', er);
	    processNextTick(cb, er);
	    valid = false;
	  }
	  return valid;
	}

	Writable.prototype.write = function (chunk, encoding, cb) {
	  var state = this._writableState;
	  var ret = false;

	  if (typeof encoding === 'function') {
	    cb = encoding;
	    encoding = null;
	  }

	  if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

	  if (typeof cb !== 'function') cb = nop;

	  if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
	    state.pendingcb++;
	    ret = writeOrBuffer(this, state, chunk, encoding, cb);
	  }

	  return ret;
	};

	Writable.prototype.cork = function () {
	  var state = this._writableState;

	  state.corked++;
	};

	Writable.prototype.uncork = function () {
	  var state = this._writableState;

	  if (state.corked) {
	    state.corked--;

	    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
	  }
	};

	Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
	  // node::ParseEncoding() requires lower case.
	  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
	  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
	  this._writableState.defaultEncoding = encoding;
	  return this;
	};

	function decodeChunk(state, chunk, encoding) {
	  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
	    chunk = bufferShim.from(chunk, encoding);
	  }
	  return chunk;
	}

	// if we're already writing something, then just put this
	// in the queue, and wait our turn.  Otherwise, call _write
	// If we return false, then we need a drain event, so set that flag.
	function writeOrBuffer(stream, state, chunk, encoding, cb) {
	  chunk = decodeChunk(state, chunk, encoding);

	  if (Buffer.isBuffer(chunk)) encoding = 'buffer';
	  var len = state.objectMode ? 1 : chunk.length;

	  state.length += len;

	  var ret = state.length < state.highWaterMark;
	  // we must ensure that previous needDrain will not be reset to false.
	  if (!ret) state.needDrain = true;

	  if (state.writing || state.corked) {
	    var last = state.lastBufferedRequest;
	    state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
	    if (last) {
	      last.next = state.lastBufferedRequest;
	    } else {
	      state.bufferedRequest = state.lastBufferedRequest;
	    }
	    state.bufferedRequestCount += 1;
	  } else {
	    doWrite(stream, state, false, len, chunk, encoding, cb);
	  }

	  return ret;
	}

	function doWrite(stream, state, writev, len, chunk, encoding, cb) {
	  state.writelen = len;
	  state.writecb = cb;
	  state.writing = true;
	  state.sync = true;
	  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
	  state.sync = false;
	}

	function onwriteError(stream, state, sync, er, cb) {
	  --state.pendingcb;
	  if (sync) processNextTick(cb, er);else cb(er);

	  stream._writableState.errorEmitted = true;
	  stream.emit('error', er);
	}

	function onwriteStateUpdate(state) {
	  state.writing = false;
	  state.writecb = null;
	  state.length -= state.writelen;
	  state.writelen = 0;
	}

	function onwrite(stream, er) {
	  var state = stream._writableState;
	  var sync = state.sync;
	  var cb = state.writecb;

	  onwriteStateUpdate(state);

	  if (er) onwriteError(stream, state, sync, er, cb);else {
	    // Check if we're actually ready to finish, but don't emit yet
	    var finished = needFinish(state);

	    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
	      clearBuffer(stream, state);
	    }

	    if (sync) {
	      /*<replacement>*/
	      asyncWrite(afterWrite, stream, state, finished, cb);
	      /*</replacement>*/
	    } else {
	        afterWrite(stream, state, finished, cb);
	      }
	  }
	}

	function afterWrite(stream, state, finished, cb) {
	  if (!finished) onwriteDrain(stream, state);
	  state.pendingcb--;
	  cb();
	  finishMaybe(stream, state);
	}

	// Must force callback to be called on nextTick, so that we don't
	// emit 'drain' before the write() consumer gets the 'false' return
	// value, and has a chance to attach a 'drain' listener.
	function onwriteDrain(stream, state) {
	  if (state.length === 0 && state.needDrain) {
	    state.needDrain = false;
	    stream.emit('drain');
	  }
	}

	// if there's something in the buffer waiting, then process it
	function clearBuffer(stream, state) {
	  state.bufferProcessing = true;
	  var entry = state.bufferedRequest;

	  if (stream._writev && entry && entry.next) {
	    // Fast case, write everything using _writev()
	    var l = state.bufferedRequestCount;
	    var buffer = new Array(l);
	    var holder = state.corkedRequestsFree;
	    holder.entry = entry;

	    var count = 0;
	    while (entry) {
	      buffer[count] = entry;
	      entry = entry.next;
	      count += 1;
	    }

	    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

	    // doWrite is almost always async, defer these to save a bit of time
	    // as the hot path ends with doWrite
	    state.pendingcb++;
	    state.lastBufferedRequest = null;
	    if (holder.next) {
	      state.corkedRequestsFree = holder.next;
	      holder.next = null;
	    } else {
	      state.corkedRequestsFree = new CorkedRequest(state);
	    }
	  } else {
	    // Slow case, write chunks one-by-one
	    while (entry) {
	      var chunk = entry.chunk;
	      var encoding = entry.encoding;
	      var cb = entry.callback;
	      var len = state.objectMode ? 1 : chunk.length;

	      doWrite(stream, state, false, len, chunk, encoding, cb);
	      entry = entry.next;
	      // if we didn't call the onwrite immediately, then
	      // it means that we need to wait until it does.
	      // also, that means that the chunk and cb are currently
	      // being processed, so move the buffer counter past them.
	      if (state.writing) {
	        break;
	      }
	    }

	    if (entry === null) state.lastBufferedRequest = null;
	  }

	  state.bufferedRequestCount = 0;
	  state.bufferedRequest = entry;
	  state.bufferProcessing = false;
	}

	Writable.prototype._write = function (chunk, encoding, cb) {
	  cb(new Error('_write() is not implemented'));
	};

	Writable.prototype._writev = null;

	Writable.prototype.end = function (chunk, encoding, cb) {
	  var state = this._writableState;

	  if (typeof chunk === 'function') {
	    cb = chunk;
	    chunk = null;
	    encoding = null;
	  } else if (typeof encoding === 'function') {
	    cb = encoding;
	    encoding = null;
	  }

	  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

	  // .end() fully uncorks
	  if (state.corked) {
	    state.corked = 1;
	    this.uncork();
	  }

	  // ignore unnecessary end() calls.
	  if (!state.ending && !state.finished) endWritable(this, state, cb);
	};

	function needFinish(state) {
	  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
	}

	function prefinish(stream, state) {
	  if (!state.prefinished) {
	    state.prefinished = true;
	    stream.emit('prefinish');
	  }
	}

	function finishMaybe(stream, state) {
	  var need = needFinish(state);
	  if (need) {
	    if (state.pendingcb === 0) {
	      prefinish(stream, state);
	      state.finished = true;
	      stream.emit('finish');
	    } else {
	      prefinish(stream, state);
	    }
	  }
	  return need;
	}

	function endWritable(stream, state, cb) {
	  state.ending = true;
	  finishMaybe(stream, state);
	  if (cb) {
	    if (state.finished) processNextTick(cb);else stream.once('finish', cb);
	  }
	  state.ended = true;
	  stream.writable = false;
	}

	// It seems a linked list but it is not
	// there will be only 2 of these for each stream
	function CorkedRequest(state) {
	  var _this = this;

	  this.next = null;
	  this.entry = null;

	  this.finish = function (err) {
	    var entry = _this.entry;
	    _this.entry = null;
	    while (entry) {
	      var cb = entry.callback;
	      state.pendingcb--;
	      cb(err);
	      entry = entry.next;
	    }
	    if (state.corkedRequestsFree) {
	      state.corkedRequestsFree.next = _this;
	    } else {
	      state.corkedRequestsFree = _this;
	    }
	  };
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1), __webpack_require__(18).setImmediate))

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	var apply = Function.prototype.apply;

	// DOM APIs, for completeness

	exports.setTimeout = function() {
	  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
	};
	exports.setInterval = function() {
	  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
	};
	exports.clearTimeout =
	exports.clearInterval = function(timeout) {
	  if (timeout) {
	    timeout.close();
	  }
	};

	function Timeout(id, clearFn) {
	  this._id = id;
	  this._clearFn = clearFn;
	}
	Timeout.prototype.unref = Timeout.prototype.ref = function() {};
	Timeout.prototype.close = function() {
	  this._clearFn.call(window, this._id);
	};

	// Does not start the time, just sets up the members needed.
	exports.enroll = function(item, msecs) {
	  clearTimeout(item._idleTimeoutId);
	  item._idleTimeout = msecs;
	};

	exports.unenroll = function(item) {
	  clearTimeout(item._idleTimeoutId);
	  item._idleTimeout = -1;
	};

	exports._unrefActive = exports.active = function(item) {
	  clearTimeout(item._idleTimeoutId);

	  var msecs = item._idleTimeout;
	  if (msecs >= 0) {
	    item._idleTimeoutId = setTimeout(function onTimeout() {
	      if (item._onTimeout)
	        item._onTimeout();
	    }, msecs);
	  }
	};

	// setimmediate attaches itself to the global object
	__webpack_require__(19);
	exports.setImmediate = setImmediate;
	exports.clearImmediate = clearImmediate;


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {(function (global, undefined) {
	    "use strict";

	    if (global.setImmediate) {
	        return;
	    }

	    var nextHandle = 1; // Spec says greater than zero
	    var tasksByHandle = {};
	    var currentlyRunningATask = false;
	    var doc = global.document;
	    var registerImmediate;

	    function setImmediate(callback) {
	      // Callback can either be a function or a string
	      if (typeof callback !== "function") {
	        callback = new Function("" + callback);
	      }
	      // Copy function arguments
	      var args = new Array(arguments.length - 1);
	      for (var i = 0; i < args.length; i++) {
	          args[i] = arguments[i + 1];
	      }
	      // Store and register the task
	      var task = { callback: callback, args: args };
	      tasksByHandle[nextHandle] = task;
	      registerImmediate(nextHandle);
	      return nextHandle++;
	    }

	    function clearImmediate(handle) {
	        delete tasksByHandle[handle];
	    }

	    function run(task) {
	        var callback = task.callback;
	        var args = task.args;
	        switch (args.length) {
	        case 0:
	            callback();
	            break;
	        case 1:
	            callback(args[0]);
	            break;
	        case 2:
	            callback(args[0], args[1]);
	            break;
	        case 3:
	            callback(args[0], args[1], args[2]);
	            break;
	        default:
	            callback.apply(undefined, args);
	            break;
	        }
	    }

	    function runIfPresent(handle) {
	        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
	        // So if we're currently running a task, we'll need to delay this invocation.
	        if (currentlyRunningATask) {
	            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
	            // "too much recursion" error.
	            setTimeout(runIfPresent, 0, handle);
	        } else {
	            var task = tasksByHandle[handle];
	            if (task) {
	                currentlyRunningATask = true;
	                try {
	                    run(task);
	                } finally {
	                    clearImmediate(handle);
	                    currentlyRunningATask = false;
	                }
	            }
	        }
	    }

	    function installNextTickImplementation() {
	        registerImmediate = function(handle) {
	            process.nextTick(function () { runIfPresent(handle); });
	        };
	    }

	    function canUsePostMessage() {
	        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
	        // where `global.postMessage` means something completely different and can't be used for this purpose.
	        if (global.postMessage && !global.importScripts) {
	            var postMessageIsAsynchronous = true;
	            var oldOnMessage = global.onmessage;
	            global.onmessage = function() {
	                postMessageIsAsynchronous = false;
	            };
	            global.postMessage("", "*");
	            global.onmessage = oldOnMessage;
	            return postMessageIsAsynchronous;
	        }
	    }

	    function installPostMessageImplementation() {
	        // Installs an event handler on `global` for the `message` event: see
	        // * https://developer.mozilla.org/en/DOM/window.postMessage
	        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

	        var messagePrefix = "setImmediate$" + Math.random() + "$";
	        var onGlobalMessage = function(event) {
	            if (event.source === global &&
	                typeof event.data === "string" &&
	                event.data.indexOf(messagePrefix) === 0) {
	                runIfPresent(+event.data.slice(messagePrefix.length));
	            }
	        };

	        if (global.addEventListener) {
	            global.addEventListener("message", onGlobalMessage, false);
	        } else {
	            global.attachEvent("onmessage", onGlobalMessage);
	        }

	        registerImmediate = function(handle) {
	            global.postMessage(messagePrefix + handle, "*");
	        };
	    }

	    function installMessageChannelImplementation() {
	        var channel = new MessageChannel();
	        channel.port1.onmessage = function(event) {
	            var handle = event.data;
	            runIfPresent(handle);
	        };

	        registerImmediate = function(handle) {
	            channel.port2.postMessage(handle);
	        };
	    }

	    function installReadyStateChangeImplementation() {
	        var html = doc.documentElement;
	        registerImmediate = function(handle) {
	            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
	            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
	            var script = doc.createElement("script");
	            script.onreadystatechange = function () {
	                runIfPresent(handle);
	                script.onreadystatechange = null;
	                html.removeChild(script);
	                script = null;
	            };
	            html.appendChild(script);
	        };
	    }

	    function installSetTimeoutImplementation() {
	        registerImmediate = function(handle) {
	            setTimeout(runIfPresent, 0, handle);
	        };
	    }

	    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
	    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
	    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

	    // Don't get fooled by e.g. browserify environments.
	    if ({}.toString.call(global.process) === "[object process]") {
	        // For Node.js before 0.9
	        installNextTickImplementation();

	    } else if (canUsePostMessage()) {
	        // For non-IE10 modern browsers
	        installPostMessageImplementation();

	    } else if (global.MessageChannel) {
	        // For web workers, where supported
	        installMessageChannelImplementation();

	    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
	        // For IE 6–8
	        installReadyStateChangeImplementation();

	    } else {
	        // For older browsers
	        installSetTimeoutImplementation();
	    }

	    attachTo.setImmediate = setImmediate;
	    attachTo.clearImmediate = clearImmediate;
	}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(1)))

/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	if (!process.version ||
	    process.version.indexOf('v0.') === 0 ||
	    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
	  module.exports = nextTick;
	} else {
	  module.exports = process.nextTick;
	}

	function nextTick(fn, arg1, arg2, arg3) {
	  if (typeof fn !== 'function') {
	    throw new TypeError('"callback" argument must be a function');
	  }
	  var len = arguments.length;
	  var args, i;
	  switch (len) {
	  case 0:
	  case 1:
	    return process.nextTick(fn);
	  case 2:
	    return process.nextTick(function afterTickOne() {
	      fn.call(null, arg1);
	    });
	  case 3:
	    return process.nextTick(function afterTickTwo() {
	      fn.call(null, arg1, arg2);
	    });
	  case 4:
	    return process.nextTick(function afterTickThree() {
	      fn.call(null, arg1, arg2, arg3);
	    });
	  default:
	    args = new Array(len - 1);
	    i = 0;
	    while (i < args.length) {
	      args[i++] = arguments[i];
	    }
	    return process.nextTick(function afterTick() {
	      fn.apply(null, args);
	    });
	  }
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.

	function isArray(arg) {
	  if (Array.isArray) {
	    return Array.isArray(arg);
	  }
	  return objectToString(arg) === '[object Array]';
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	exports.isBuffer = Buffer.isBuffer;

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4).Buffer))

/***/ },
/* 22 */
/***/ function(module, exports) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 23 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {
	/**
	 * Module exports.
	 */

	module.exports = deprecate;

	/**
	 * Mark that a method should not be used.
	 * Returns a modified function which warns once by default.
	 *
	 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
	 *
	 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
	 * will throw an Error when invoked.
	 *
	 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
	 * will invoke `console.trace()` instead of `console.error()`.
	 *
	 * @param {Function} fn - the function to deprecate
	 * @param {String} msg - the string to print to the console when `fn` is invoked
	 * @returns {Function} a new "deprecated" version of `fn`
	 * @api public
	 */

	function deprecate (fn, msg) {
	  if (config('noDeprecation')) {
	    return fn;
	  }

	  var warned = false;
	  function deprecated() {
	    if (!warned) {
	      if (config('throwDeprecation')) {
	        throw new Error(msg);
	      } else if (config('traceDeprecation')) {
	        console.trace(msg);
	      } else {
	        console.warn(msg);
	      }
	      warned = true;
	    }
	    return fn.apply(this, arguments);
	  }

	  return deprecated;
	}

	/**
	 * Checks `localStorage` for boolean values for the given `name`.
	 *
	 * @param {String} name
	 * @returns {Boolean}
	 * @api private
	 */

	function config (name) {
	  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
	  try {
	    if (!global.localStorage) return false;
	  } catch (_) {
	    return false;
	  }
	  var val = global.localStorage[name];
	  if (null == val) return false;
	  return String(val).toLowerCase() === 'true';
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var buffer = __webpack_require__(4);
	var Buffer = buffer.Buffer;
	var SlowBuffer = buffer.SlowBuffer;
	var MAX_LEN = buffer.kMaxLength || 2147483647;
	exports.alloc = function alloc(size, fill, encoding) {
	  if (typeof Buffer.alloc === 'function') {
	    return Buffer.alloc(size, fill, encoding);
	  }
	  if (typeof encoding === 'number') {
	    throw new TypeError('encoding must not be number');
	  }
	  if (typeof size !== 'number') {
	    throw new TypeError('size must be a number');
	  }
	  if (size > MAX_LEN) {
	    throw new RangeError('size is too large');
	  }
	  var enc = encoding;
	  var _fill = fill;
	  if (_fill === undefined) {
	    enc = undefined;
	    _fill = 0;
	  }
	  var buf = new Buffer(size);
	  if (typeof _fill === 'string') {
	    var fillBuf = new Buffer(_fill, enc);
	    var flen = fillBuf.length;
	    var i = -1;
	    while (++i < size) {
	      buf[i] = fillBuf[i % flen];
	    }
	  } else {
	    buf.fill(_fill);
	  }
	  return buf;
	}
	exports.allocUnsafe = function allocUnsafe(size) {
	  if (typeof Buffer.allocUnsafe === 'function') {
	    return Buffer.allocUnsafe(size);
	  }
	  if (typeof size !== 'number') {
	    throw new TypeError('size must be a number');
	  }
	  if (size > MAX_LEN) {
	    throw new RangeError('size is too large');
	  }
	  return new Buffer(size);
	}
	exports.from = function from(value, encodingOrOffset, length) {
	  if (typeof Buffer.from === 'function' && (!global.Uint8Array || Uint8Array.from !== Buffer.from)) {
	    return Buffer.from(value, encodingOrOffset, length);
	  }
	  if (typeof value === 'number') {
	    throw new TypeError('"value" argument must not be a number');
	  }
	  if (typeof value === 'string') {
	    return new Buffer(value, encodingOrOffset);
	  }
	  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
	    var offset = encodingOrOffset;
	    if (arguments.length === 1) {
	      return new Buffer(value);
	    }
	    if (typeof offset === 'undefined') {
	      offset = 0;
	    }
	    var len = length;
	    if (typeof len === 'undefined') {
	      len = value.byteLength - offset;
	    }
	    if (offset >= value.byteLength) {
	      throw new RangeError('\'offset\' is out of bounds');
	    }
	    if (len > value.byteLength - offset) {
	      throw new RangeError('\'length\' is out of bounds');
	    }
	    return new Buffer(value.slice(offset, offset + len));
	  }
	  if (Buffer.isBuffer(value)) {
	    var out = new Buffer(value.length);
	    value.copy(out, 0, 0, value.length);
	    return out;
	  }
	  if (value) {
	    if (Array.isArray(value) || (typeof ArrayBuffer !== 'undefined' && value.buffer instanceof ArrayBuffer) || 'length' in value) {
	      return new Buffer(value);
	    }
	    if (value.type === 'Buffer' && Array.isArray(value.data)) {
	      return new Buffer(value.data);
	    }
	  }

	  throw new TypeError('First argument must be a string, Buffer, ' + 'ArrayBuffer, Array, or array-like object.');
	}
	exports.allocUnsafeSlow = function allocUnsafeSlow(size) {
	  if (typeof Buffer.allocUnsafeSlow === 'function') {
	    return Buffer.allocUnsafeSlow(size);
	  }
	  if (typeof size !== 'number') {
	    throw new TypeError('size must be a number');
	  }
	  if (size >= MAX_LEN) {
	    throw new RangeError('size is too large');
	  }
	  return new SlowBuffer(size);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	// a duplex stream is just a stream that is both readable and writable.
	// Since JS doesn't have multiple prototypal inheritance, this class
	// prototypally inherits from Readable, and then parasitically from
	// Writable.

	'use strict';

	/*<replacement>*/

	var objectKeys = Object.keys || function (obj) {
	  var keys = [];
	  for (var key in obj) {
	    keys.push(key);
	  }return keys;
	};
	/*</replacement>*/

	module.exports = Duplex;

	/*<replacement>*/
	var processNextTick = __webpack_require__(20);
	/*</replacement>*/

	/*<replacement>*/
	var util = __webpack_require__(21);
	util.inherits = __webpack_require__(22);
	/*</replacement>*/

	var Readable = __webpack_require__(26);
	var Writable = __webpack_require__(17);

	util.inherits(Duplex, Readable);

	var keys = objectKeys(Writable.prototype);
	for (var v = 0; v < keys.length; v++) {
	  var method = keys[v];
	  if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
	}

	function Duplex(options) {
	  if (!(this instanceof Duplex)) return new Duplex(options);

	  Readable.call(this, options);
	  Writable.call(this, options);

	  if (options && options.readable === false) this.readable = false;

	  if (options && options.writable === false) this.writable = false;

	  this.allowHalfOpen = true;
	  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

	  this.once('end', onend);
	}

	// the no-half-open enforcer
	function onend() {
	  // if we allow half-open state, or if the writable side ended,
	  // then we're ok.
	  if (this.allowHalfOpen || this._writableState.ended) return;

	  // no more data can be written.
	  // But allow more writes to happen in this tick.
	  processNextTick(onEndNT, this);
	}

	function onEndNT(self) {
	  self.end();
	}

	function forEach(xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	module.exports = Readable;

	/*<replacement>*/
	var processNextTick = __webpack_require__(20);
	/*</replacement>*/

	/*<replacement>*/
	var isArray = __webpack_require__(27);
	/*</replacement>*/

	/*<replacement>*/
	var Duplex;
	/*</replacement>*/

	Readable.ReadableState = ReadableState;

	/*<replacement>*/
	var EE = __webpack_require__(2).EventEmitter;

	var EElistenerCount = function (emitter, type) {
	  return emitter.listeners(type).length;
	};
	/*</replacement>*/

	/*<replacement>*/
	var Stream;
	(function () {
	  try {
	    Stream = __webpack_require__(14);
	  } catch (_) {} finally {
	    if (!Stream) Stream = __webpack_require__(2).EventEmitter;
	  }
	})();
	/*</replacement>*/

	var Buffer = __webpack_require__(4).Buffer;
	/*<replacement>*/
	var bufferShim = __webpack_require__(24);
	/*</replacement>*/

	/*<replacement>*/
	var util = __webpack_require__(21);
	util.inherits = __webpack_require__(22);
	/*</replacement>*/

	/*<replacement>*/
	var debugUtil = __webpack_require__(28);
	var debug = void 0;
	if (debugUtil && debugUtil.debuglog) {
	  debug = debugUtil.debuglog('stream');
	} else {
	  debug = function () {};
	}
	/*</replacement>*/

	var BufferList = __webpack_require__(29);
	var StringDecoder;

	util.inherits(Readable, Stream);

	function prependListener(emitter, event, fn) {
	  // Sadly this is not cacheable as some libraries bundle their own
	  // event emitter implementation with them.
	  if (typeof emitter.prependListener === 'function') {
	    return emitter.prependListener(event, fn);
	  } else {
	    // This is a hack to make sure that our error handler is attached before any
	    // userland ones.  NEVER DO THIS. This is here only because this code needs
	    // to continue to work with older versions of Node.js that do not include
	    // the prependListener() method. The goal is to eventually remove this hack.
	    if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
	  }
	}

	function ReadableState(options, stream) {
	  Duplex = Duplex || __webpack_require__(25);

	  options = options || {};

	  // object stream flag. Used to make read(n) ignore n and to
	  // make all the buffer merging and length checks go away
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

	  // the point at which it stops calling _read() to fill the buffer
	  // Note: 0 is a valid value, means "don't call _read preemptively ever"
	  var hwm = options.highWaterMark;
	  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

	  // cast to ints.
	  this.highWaterMark = ~ ~this.highWaterMark;

	  // A linked list is used to store data chunks instead of an array because the
	  // linked list can remove elements from the beginning faster than
	  // array.shift()
	  this.buffer = new BufferList();
	  this.length = 0;
	  this.pipes = null;
	  this.pipesCount = 0;
	  this.flowing = null;
	  this.ended = false;
	  this.endEmitted = false;
	  this.reading = false;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // whenever we return null, then we set a flag to say
	  // that we're awaiting a 'readable' event emission.
	  this.needReadable = false;
	  this.emittedReadable = false;
	  this.readableListening = false;
	  this.resumeScheduled = false;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // when piping, we only care about 'readable' events that happen
	  // after read()ing all the bytes and not getting any pushback.
	  this.ranOut = false;

	  // the number of writers that are awaiting a drain event in .pipe()s
	  this.awaitDrain = 0;

	  // if true, a maybeReadMore has been scheduled
	  this.readingMore = false;

	  this.decoder = null;
	  this.encoding = null;
	  if (options.encoding) {
	    if (!StringDecoder) StringDecoder = __webpack_require__(30).StringDecoder;
	    this.decoder = new StringDecoder(options.encoding);
	    this.encoding = options.encoding;
	  }
	}

	function Readable(options) {
	  Duplex = Duplex || __webpack_require__(25);

	  if (!(this instanceof Readable)) return new Readable(options);

	  this._readableState = new ReadableState(options, this);

	  // legacy
	  this.readable = true;

	  if (options && typeof options.read === 'function') this._read = options.read;

	  Stream.call(this);
	}

	// Manually shove something into the read() buffer.
	// This returns true if the highWaterMark has not been hit yet,
	// similar to how Writable.write() returns true if you should
	// write() some more.
	Readable.prototype.push = function (chunk, encoding) {
	  var state = this._readableState;

	  if (!state.objectMode && typeof chunk === 'string') {
	    encoding = encoding || state.defaultEncoding;
	    if (encoding !== state.encoding) {
	      chunk = bufferShim.from(chunk, encoding);
	      encoding = '';
	    }
	  }

	  return readableAddChunk(this, state, chunk, encoding, false);
	};

	// Unshift should *always* be something directly out of read()
	Readable.prototype.unshift = function (chunk) {
	  var state = this._readableState;
	  return readableAddChunk(this, state, chunk, '', true);
	};

	Readable.prototype.isPaused = function () {
	  return this._readableState.flowing === false;
	};

	function readableAddChunk(stream, state, chunk, encoding, addToFront) {
	  var er = chunkInvalid(state, chunk);
	  if (er) {
	    stream.emit('error', er);
	  } else if (chunk === null) {
	    state.reading = false;
	    onEofChunk(stream, state);
	  } else if (state.objectMode || chunk && chunk.length > 0) {
	    if (state.ended && !addToFront) {
	      var e = new Error('stream.push() after EOF');
	      stream.emit('error', e);
	    } else if (state.endEmitted && addToFront) {
	      var _e = new Error('stream.unshift() after end event');
	      stream.emit('error', _e);
	    } else {
	      var skipAdd;
	      if (state.decoder && !addToFront && !encoding) {
	        chunk = state.decoder.write(chunk);
	        skipAdd = !state.objectMode && chunk.length === 0;
	      }

	      if (!addToFront) state.reading = false;

	      // Don't add to the buffer if we've decoded to an empty string chunk and
	      // we're not in object mode
	      if (!skipAdd) {
	        // if we want the data now, just emit it.
	        if (state.flowing && state.length === 0 && !state.sync) {
	          stream.emit('data', chunk);
	          stream.read(0);
	        } else {
	          // update the buffer info.
	          state.length += state.objectMode ? 1 : chunk.length;
	          if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

	          if (state.needReadable) emitReadable(stream);
	        }
	      }

	      maybeReadMore(stream, state);
	    }
	  } else if (!addToFront) {
	    state.reading = false;
	  }

	  return needMoreData(state);
	}

	// if it's past the high water mark, we can push in some more.
	// Also, if we have no data yet, we can stand some
	// more bytes.  This is to work around cases where hwm=0,
	// such as the repl.  Also, if the push() triggered a
	// readable event, and the user called read(largeNumber) such that
	// needReadable was set, then we ought to push more, so that another
	// 'readable' event will be triggered.
	function needMoreData(state) {
	  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
	}

	// backwards compatibility.
	Readable.prototype.setEncoding = function (enc) {
	  if (!StringDecoder) StringDecoder = __webpack_require__(30).StringDecoder;
	  this._readableState.decoder = new StringDecoder(enc);
	  this._readableState.encoding = enc;
	  return this;
	};

	// Don't raise the hwm > 8MB
	var MAX_HWM = 0x800000;
	function computeNewHighWaterMark(n) {
	  if (n >= MAX_HWM) {
	    n = MAX_HWM;
	  } else {
	    // Get the next highest power of 2 to prevent increasing hwm excessively in
	    // tiny amounts
	    n--;
	    n |= n >>> 1;
	    n |= n >>> 2;
	    n |= n >>> 4;
	    n |= n >>> 8;
	    n |= n >>> 16;
	    n++;
	  }
	  return n;
	}

	// This function is designed to be inlinable, so please take care when making
	// changes to the function body.
	function howMuchToRead(n, state) {
	  if (n <= 0 || state.length === 0 && state.ended) return 0;
	  if (state.objectMode) return 1;
	  if (n !== n) {
	    // Only flow one buffer at a time
	    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
	  }
	  // If we're asking for more than the current hwm, then raise the hwm.
	  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
	  if (n <= state.length) return n;
	  // Don't have enough
	  if (!state.ended) {
	    state.needReadable = true;
	    return 0;
	  }
	  return state.length;
	}

	// you can override either this method, or the async _read(n) below.
	Readable.prototype.read = function (n) {
	  debug('read', n);
	  n = parseInt(n, 10);
	  var state = this._readableState;
	  var nOrig = n;

	  if (n !== 0) state.emittedReadable = false;

	  // if we're doing read(0) to trigger a readable event, but we
	  // already have a bunch of data in the buffer, then just trigger
	  // the 'readable' event and move on.
	  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
	    debug('read: emitReadable', state.length, state.ended);
	    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
	    return null;
	  }

	  n = howMuchToRead(n, state);

	  // if we've ended, and we're now clear, then finish it up.
	  if (n === 0 && state.ended) {
	    if (state.length === 0) endReadable(this);
	    return null;
	  }

	  // All the actual chunk generation logic needs to be
	  // *below* the call to _read.  The reason is that in certain
	  // synthetic stream cases, such as passthrough streams, _read
	  // may be a completely synchronous operation which may change
	  // the state of the read buffer, providing enough data when
	  // before there was *not* enough.
	  //
	  // So, the steps are:
	  // 1. Figure out what the state of things will be after we do
	  // a read from the buffer.
	  //
	  // 2. If that resulting state will trigger a _read, then call _read.
	  // Note that this may be asynchronous, or synchronous.  Yes, it is
	  // deeply ugly to write APIs this way, but that still doesn't mean
	  // that the Readable class should behave improperly, as streams are
	  // designed to be sync/async agnostic.
	  // Take note if the _read call is sync or async (ie, if the read call
	  // has returned yet), so that we know whether or not it's safe to emit
	  // 'readable' etc.
	  //
	  // 3. Actually pull the requested chunks out of the buffer and return.

	  // if we need a readable event, then we need to do some reading.
	  var doRead = state.needReadable;
	  debug('need readable', doRead);

	  // if we currently have less than the highWaterMark, then also read some
	  if (state.length === 0 || state.length - n < state.highWaterMark) {
	    doRead = true;
	    debug('length less than watermark', doRead);
	  }

	  // however, if we've ended, then there's no point, and if we're already
	  // reading, then it's unnecessary.
	  if (state.ended || state.reading) {
	    doRead = false;
	    debug('reading or ended', doRead);
	  } else if (doRead) {
	    debug('do read');
	    state.reading = true;
	    state.sync = true;
	    // if the length is currently zero, then we *need* a readable event.
	    if (state.length === 0) state.needReadable = true;
	    // call internal read method
	    this._read(state.highWaterMark);
	    state.sync = false;
	    // If _read pushed data synchronously, then `reading` will be false,
	    // and we need to re-evaluate how much data we can return to the user.
	    if (!state.reading) n = howMuchToRead(nOrig, state);
	  }

	  var ret;
	  if (n > 0) ret = fromList(n, state);else ret = null;

	  if (ret === null) {
	    state.needReadable = true;
	    n = 0;
	  } else {
	    state.length -= n;
	  }

	  if (state.length === 0) {
	    // If we have nothing in the buffer, then we want to know
	    // as soon as we *do* get something into the buffer.
	    if (!state.ended) state.needReadable = true;

	    // If we tried to read() past the EOF, then emit end on the next tick.
	    if (nOrig !== n && state.ended) endReadable(this);
	  }

	  if (ret !== null) this.emit('data', ret);

	  return ret;
	};

	function chunkInvalid(state, chunk) {
	  var er = null;
	  if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
	    er = new TypeError('Invalid non-string/buffer chunk');
	  }
	  return er;
	}

	function onEofChunk(stream, state) {
	  if (state.ended) return;
	  if (state.decoder) {
	    var chunk = state.decoder.end();
	    if (chunk && chunk.length) {
	      state.buffer.push(chunk);
	      state.length += state.objectMode ? 1 : chunk.length;
	    }
	  }
	  state.ended = true;

	  // emit 'readable' now to make sure it gets picked up.
	  emitReadable(stream);
	}

	// Don't emit readable right away in sync mode, because this can trigger
	// another read() call => stack overflow.  This way, it might trigger
	// a nextTick recursion warning, but that's not so bad.
	function emitReadable(stream) {
	  var state = stream._readableState;
	  state.needReadable = false;
	  if (!state.emittedReadable) {
	    debug('emitReadable', state.flowing);
	    state.emittedReadable = true;
	    if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
	  }
	}

	function emitReadable_(stream) {
	  debug('emit readable');
	  stream.emit('readable');
	  flow(stream);
	}

	// at this point, the user has presumably seen the 'readable' event,
	// and called read() to consume some data.  that may have triggered
	// in turn another _read(n) call, in which case reading = true if
	// it's in progress.
	// However, if we're not ended, or reading, and the length < hwm,
	// then go ahead and try to read some more preemptively.
	function maybeReadMore(stream, state) {
	  if (!state.readingMore) {
	    state.readingMore = true;
	    processNextTick(maybeReadMore_, stream, state);
	  }
	}

	function maybeReadMore_(stream, state) {
	  var len = state.length;
	  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
	    debug('maybeReadMore read 0');
	    stream.read(0);
	    if (len === state.length)
	      // didn't get any data, stop spinning.
	      break;else len = state.length;
	  }
	  state.readingMore = false;
	}

	// abstract method.  to be overridden in specific implementation classes.
	// call cb(er, data) where data is <= n in length.
	// for virtual (non-string, non-buffer) streams, "length" is somewhat
	// arbitrary, and perhaps not very meaningful.
	Readable.prototype._read = function (n) {
	  this.emit('error', new Error('_read() is not implemented'));
	};

	Readable.prototype.pipe = function (dest, pipeOpts) {
	  var src = this;
	  var state = this._readableState;

	  switch (state.pipesCount) {
	    case 0:
	      state.pipes = dest;
	      break;
	    case 1:
	      state.pipes = [state.pipes, dest];
	      break;
	    default:
	      state.pipes.push(dest);
	      break;
	  }
	  state.pipesCount += 1;
	  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

	  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

	  var endFn = doEnd ? onend : cleanup;
	  if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

	  dest.on('unpipe', onunpipe);
	  function onunpipe(readable) {
	    debug('onunpipe');
	    if (readable === src) {
	      cleanup();
	    }
	  }

	  function onend() {
	    debug('onend');
	    dest.end();
	  }

	  // when the dest drains, it reduces the awaitDrain counter
	  // on the source.  This would be more elegant with a .once()
	  // handler in flow(), but adding and removing repeatedly is
	  // too slow.
	  var ondrain = pipeOnDrain(src);
	  dest.on('drain', ondrain);

	  var cleanedUp = false;
	  function cleanup() {
	    debug('cleanup');
	    // cleanup event handlers once the pipe is broken
	    dest.removeListener('close', onclose);
	    dest.removeListener('finish', onfinish);
	    dest.removeListener('drain', ondrain);
	    dest.removeListener('error', onerror);
	    dest.removeListener('unpipe', onunpipe);
	    src.removeListener('end', onend);
	    src.removeListener('end', cleanup);
	    src.removeListener('data', ondata);

	    cleanedUp = true;

	    // if the reader is waiting for a drain event from this
	    // specific writer, then it would cause it to never start
	    // flowing again.
	    // So, if this is awaiting a drain, then we just call it now.
	    // If we don't know, then assume that we are waiting for one.
	    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
	  }

	  // If the user pushes more data while we're writing to dest then we'll end up
	  // in ondata again. However, we only want to increase awaitDrain once because
	  // dest will only emit one 'drain' event for the multiple writes.
	  // => Introduce a guard on increasing awaitDrain.
	  var increasedAwaitDrain = false;
	  src.on('data', ondata);
	  function ondata(chunk) {
	    debug('ondata');
	    increasedAwaitDrain = false;
	    var ret = dest.write(chunk);
	    if (false === ret && !increasedAwaitDrain) {
	      // If the user unpiped during `dest.write()`, it is possible
	      // to get stuck in a permanently paused state if that write
	      // also returned false.
	      // => Check whether `dest` is still a piping destination.
	      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
	        debug('false write response, pause', src._readableState.awaitDrain);
	        src._readableState.awaitDrain++;
	        increasedAwaitDrain = true;
	      }
	      src.pause();
	    }
	  }

	  // if the dest has an error, then stop piping into it.
	  // however, don't suppress the throwing behavior for this.
	  function onerror(er) {
	    debug('onerror', er);
	    unpipe();
	    dest.removeListener('error', onerror);
	    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
	  }

	  // Make sure our error handler is attached before userland ones.
	  prependListener(dest, 'error', onerror);

	  // Both close and finish should trigger unpipe, but only once.
	  function onclose() {
	    dest.removeListener('finish', onfinish);
	    unpipe();
	  }
	  dest.once('close', onclose);
	  function onfinish() {
	    debug('onfinish');
	    dest.removeListener('close', onclose);
	    unpipe();
	  }
	  dest.once('finish', onfinish);

	  function unpipe() {
	    debug('unpipe');
	    src.unpipe(dest);
	  }

	  // tell the dest that it's being piped to
	  dest.emit('pipe', src);

	  // start the flow if it hasn't been started already.
	  if (!state.flowing) {
	    debug('pipe resume');
	    src.resume();
	  }

	  return dest;
	};

	function pipeOnDrain(src) {
	  return function () {
	    var state = src._readableState;
	    debug('pipeOnDrain', state.awaitDrain);
	    if (state.awaitDrain) state.awaitDrain--;
	    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
	      state.flowing = true;
	      flow(src);
	    }
	  };
	}

	Readable.prototype.unpipe = function (dest) {
	  var state = this._readableState;

	  // if we're not piping anywhere, then do nothing.
	  if (state.pipesCount === 0) return this;

	  // just one destination.  most common case.
	  if (state.pipesCount === 1) {
	    // passed in one, but it's not the right one.
	    if (dest && dest !== state.pipes) return this;

	    if (!dest) dest = state.pipes;

	    // got a match.
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;
	    if (dest) dest.emit('unpipe', this);
	    return this;
	  }

	  // slow case. multiple pipe destinations.

	  if (!dest) {
	    // remove all.
	    var dests = state.pipes;
	    var len = state.pipesCount;
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;

	    for (var i = 0; i < len; i++) {
	      dests[i].emit('unpipe', this);
	    }return this;
	  }

	  // try to find the right one.
	  var index = indexOf(state.pipes, dest);
	  if (index === -1) return this;

	  state.pipes.splice(index, 1);
	  state.pipesCount -= 1;
	  if (state.pipesCount === 1) state.pipes = state.pipes[0];

	  dest.emit('unpipe', this);

	  return this;
	};

	// set up data events if they are asked for
	// Ensure readable listeners eventually get something
	Readable.prototype.on = function (ev, fn) {
	  var res = Stream.prototype.on.call(this, ev, fn);

	  if (ev === 'data') {
	    // Start flowing on next tick if stream isn't explicitly paused
	    if (this._readableState.flowing !== false) this.resume();
	  } else if (ev === 'readable') {
	    var state = this._readableState;
	    if (!state.endEmitted && !state.readableListening) {
	      state.readableListening = state.needReadable = true;
	      state.emittedReadable = false;
	      if (!state.reading) {
	        processNextTick(nReadingNextTick, this);
	      } else if (state.length) {
	        emitReadable(this, state);
	      }
	    }
	  }

	  return res;
	};
	Readable.prototype.addListener = Readable.prototype.on;

	function nReadingNextTick(self) {
	  debug('readable nexttick read 0');
	  self.read(0);
	}

	// pause() and resume() are remnants of the legacy readable stream API
	// If the user uses them, then switch into old mode.
	Readable.prototype.resume = function () {
	  var state = this._readableState;
	  if (!state.flowing) {
	    debug('resume');
	    state.flowing = true;
	    resume(this, state);
	  }
	  return this;
	};

	function resume(stream, state) {
	  if (!state.resumeScheduled) {
	    state.resumeScheduled = true;
	    processNextTick(resume_, stream, state);
	  }
	}

	function resume_(stream, state) {
	  if (!state.reading) {
	    debug('resume read 0');
	    stream.read(0);
	  }

	  state.resumeScheduled = false;
	  state.awaitDrain = 0;
	  stream.emit('resume');
	  flow(stream);
	  if (state.flowing && !state.reading) stream.read(0);
	}

	Readable.prototype.pause = function () {
	  debug('call pause flowing=%j', this._readableState.flowing);
	  if (false !== this._readableState.flowing) {
	    debug('pause');
	    this._readableState.flowing = false;
	    this.emit('pause');
	  }
	  return this;
	};

	function flow(stream) {
	  var state = stream._readableState;
	  debug('flow', state.flowing);
	  while (state.flowing && stream.read() !== null) {}
	}

	// wrap an old-style stream as the async data source.
	// This is *not* part of the readable stream interface.
	// It is an ugly unfortunate mess of history.
	Readable.prototype.wrap = function (stream) {
	  var state = this._readableState;
	  var paused = false;

	  var self = this;
	  stream.on('end', function () {
	    debug('wrapped end');
	    if (state.decoder && !state.ended) {
	      var chunk = state.decoder.end();
	      if (chunk && chunk.length) self.push(chunk);
	    }

	    self.push(null);
	  });

	  stream.on('data', function (chunk) {
	    debug('wrapped data');
	    if (state.decoder) chunk = state.decoder.write(chunk);

	    // don't skip over falsy values in objectMode
	    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

	    var ret = self.push(chunk);
	    if (!ret) {
	      paused = true;
	      stream.pause();
	    }
	  });

	  // proxy all the other methods.
	  // important when wrapping filters and duplexes.
	  for (var i in stream) {
	    if (this[i] === undefined && typeof stream[i] === 'function') {
	      this[i] = function (method) {
	        return function () {
	          return stream[method].apply(stream, arguments);
	        };
	      }(i);
	    }
	  }

	  // proxy certain important events.
	  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
	  forEach(events, function (ev) {
	    stream.on(ev, self.emit.bind(self, ev));
	  });

	  // when we try to consume some more bytes, simply unpause the
	  // underlying stream.
	  self._read = function (n) {
	    debug('wrapped _read', n);
	    if (paused) {
	      paused = false;
	      stream.resume();
	    }
	  };

	  return self;
	};

	// exposed for testing purposes only.
	Readable._fromList = fromList;

	// Pluck off n bytes from an array of buffers.
	// Length is the combined lengths of all the buffers in the list.
	// This function is designed to be inlinable, so please take care when making
	// changes to the function body.
	function fromList(n, state) {
	  // nothing buffered
	  if (state.length === 0) return null;

	  var ret;
	  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
	    // read it all, truncate the list
	    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
	    state.buffer.clear();
	  } else {
	    // read part of list
	    ret = fromListPartial(n, state.buffer, state.decoder);
	  }

	  return ret;
	}

	// Extracts only enough buffered data to satisfy the amount requested.
	// This function is designed to be inlinable, so please take care when making
	// changes to the function body.
	function fromListPartial(n, list, hasStrings) {
	  var ret;
	  if (n < list.head.data.length) {
	    // slice is the same for buffers and strings
	    ret = list.head.data.slice(0, n);
	    list.head.data = list.head.data.slice(n);
	  } else if (n === list.head.data.length) {
	    // first chunk is a perfect match
	    ret = list.shift();
	  } else {
	    // result spans more than one buffer
	    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
	  }
	  return ret;
	}

	// Copies a specified amount of characters from the list of buffered data
	// chunks.
	// This function is designed to be inlinable, so please take care when making
	// changes to the function body.
	function copyFromBufferString(n, list) {
	  var p = list.head;
	  var c = 1;
	  var ret = p.data;
	  n -= ret.length;
	  while (p = p.next) {
	    var str = p.data;
	    var nb = n > str.length ? str.length : n;
	    if (nb === str.length) ret += str;else ret += str.slice(0, n);
	    n -= nb;
	    if (n === 0) {
	      if (nb === str.length) {
	        ++c;
	        if (p.next) list.head = p.next;else list.head = list.tail = null;
	      } else {
	        list.head = p;
	        p.data = str.slice(nb);
	      }
	      break;
	    }
	    ++c;
	  }
	  list.length -= c;
	  return ret;
	}

	// Copies a specified amount of bytes from the list of buffered data chunks.
	// This function is designed to be inlinable, so please take care when making
	// changes to the function body.
	function copyFromBuffer(n, list) {
	  var ret = bufferShim.allocUnsafe(n);
	  var p = list.head;
	  var c = 1;
	  p.data.copy(ret);
	  n -= p.data.length;
	  while (p = p.next) {
	    var buf = p.data;
	    var nb = n > buf.length ? buf.length : n;
	    buf.copy(ret, ret.length - n, 0, nb);
	    n -= nb;
	    if (n === 0) {
	      if (nb === buf.length) {
	        ++c;
	        if (p.next) list.head = p.next;else list.head = list.tail = null;
	      } else {
	        list.head = p;
	        p.data = buf.slice(nb);
	      }
	      break;
	    }
	    ++c;
	  }
	  list.length -= c;
	  return ret;
	}

	function endReadable(stream) {
	  var state = stream._readableState;

	  // If we get here before consuming all the bytes, then that is a
	  // bug in node.  Should never happen.
	  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

	  if (!state.endEmitted) {
	    state.ended = true;
	    processNextTick(endReadableNT, state, stream);
	  }
	}

	function endReadableNT(state, stream) {
	  // Check that we didn't get one last unshift.
	  if (!state.endEmitted && state.length === 0) {
	    state.endEmitted = true;
	    stream.readable = false;
	    stream.emit('end');
	  }
	}

	function forEach(xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}

	function indexOf(xs, x) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    if (xs[i] === x) return i;
	  }
	  return -1;
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 27 */
/***/ function(module, exports) {

	var toString = {}.toString;

	module.exports = Array.isArray || function (arr) {
	  return toString.call(arr) == '[object Array]';
	};


/***/ },
/* 28 */
/***/ function(module, exports) {

	/* (ignored) */

/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Buffer = __webpack_require__(4).Buffer;
	/*<replacement>*/
	var bufferShim = __webpack_require__(24);
	/*</replacement>*/

	module.exports = BufferList;

	function BufferList() {
	  this.head = null;
	  this.tail = null;
	  this.length = 0;
	}

	BufferList.prototype.push = function (v) {
	  var entry = { data: v, next: null };
	  if (this.length > 0) this.tail.next = entry;else this.head = entry;
	  this.tail = entry;
	  ++this.length;
	};

	BufferList.prototype.unshift = function (v) {
	  var entry = { data: v, next: this.head };
	  if (this.length === 0) this.tail = entry;
	  this.head = entry;
	  ++this.length;
	};

	BufferList.prototype.shift = function () {
	  if (this.length === 0) return;
	  var ret = this.head.data;
	  if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
	  --this.length;
	  return ret;
	};

	BufferList.prototype.clear = function () {
	  this.head = this.tail = null;
	  this.length = 0;
	};

	BufferList.prototype.join = function (s) {
	  if (this.length === 0) return '';
	  var p = this.head;
	  var ret = '' + p.data;
	  while (p = p.next) {
	    ret += s + p.data;
	  }return ret;
	};

	BufferList.prototype.concat = function (n) {
	  if (this.length === 0) return bufferShim.alloc(0);
	  if (this.length === 1) return this.head.data;
	  var ret = bufferShim.allocUnsafe(n >>> 0);
	  var p = this.head;
	  var i = 0;
	  while (p) {
	    p.data.copy(ret, i);
	    i += p.data.length;
	    p = p.next;
	  }
	  return ret;
	};

/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var Buffer = __webpack_require__(4).Buffer;

	var isBufferEncoding = Buffer.isEncoding
	  || function(encoding) {
	       switch (encoding && encoding.toLowerCase()) {
	         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
	         default: return false;
	       }
	     }


	function assertEncoding(encoding) {
	  if (encoding && !isBufferEncoding(encoding)) {
	    throw new Error('Unknown encoding: ' + encoding);
	  }
	}

	// StringDecoder provides an interface for efficiently splitting a series of
	// buffers into a series of JS strings without breaking apart multi-byte
	// characters. CESU-8 is handled as part of the UTF-8 encoding.
	//
	// @TODO Handling all encodings inside a single object makes it very difficult
	// to reason about this code, so it should be split up in the future.
	// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
	// points as used by CESU-8.
	var StringDecoder = exports.StringDecoder = function(encoding) {
	  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
	  assertEncoding(encoding);
	  switch (this.encoding) {
	    case 'utf8':
	      // CESU-8 represents each of Surrogate Pair by 3-bytes
	      this.surrogateSize = 3;
	      break;
	    case 'ucs2':
	    case 'utf16le':
	      // UTF-16 represents each of Surrogate Pair by 2-bytes
	      this.surrogateSize = 2;
	      this.detectIncompleteChar = utf16DetectIncompleteChar;
	      break;
	    case 'base64':
	      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
	      this.surrogateSize = 3;
	      this.detectIncompleteChar = base64DetectIncompleteChar;
	      break;
	    default:
	      this.write = passThroughWrite;
	      return;
	  }

	  // Enough space to store all bytes of a single character. UTF-8 needs 4
	  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
	  this.charBuffer = new Buffer(6);
	  // Number of bytes received for the current incomplete multi-byte character.
	  this.charReceived = 0;
	  // Number of bytes expected for the current incomplete multi-byte character.
	  this.charLength = 0;
	};


	// write decodes the given buffer and returns it as JS string that is
	// guaranteed to not contain any partial multi-byte characters. Any partial
	// character found at the end of the buffer is buffered up, and will be
	// returned when calling write again with the remaining bytes.
	//
	// Note: Converting a Buffer containing an orphan surrogate to a String
	// currently works, but converting a String to a Buffer (via `new Buffer`, or
	// Buffer#write) will replace incomplete surrogates with the unicode
	// replacement character. See https://codereview.chromium.org/121173009/ .
	StringDecoder.prototype.write = function(buffer) {
	  var charStr = '';
	  // if our last write ended with an incomplete multibyte character
	  while (this.charLength) {
	    // determine how many remaining bytes this buffer has to offer for this char
	    var available = (buffer.length >= this.charLength - this.charReceived) ?
	        this.charLength - this.charReceived :
	        buffer.length;

	    // add the new bytes to the char buffer
	    buffer.copy(this.charBuffer, this.charReceived, 0, available);
	    this.charReceived += available;

	    if (this.charReceived < this.charLength) {
	      // still not enough chars in this buffer? wait for more ...
	      return '';
	    }

	    // remove bytes belonging to the current character from the buffer
	    buffer = buffer.slice(available, buffer.length);

	    // get the character that was split
	    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

	    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	    var charCode = charStr.charCodeAt(charStr.length - 1);
	    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	      this.charLength += this.surrogateSize;
	      charStr = '';
	      continue;
	    }
	    this.charReceived = this.charLength = 0;

	    // if there are no more bytes in this buffer, just emit our char
	    if (buffer.length === 0) {
	      return charStr;
	    }
	    break;
	  }

	  // determine and set charLength / charReceived
	  this.detectIncompleteChar(buffer);

	  var end = buffer.length;
	  if (this.charLength) {
	    // buffer the incomplete character bytes we got
	    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
	    end -= this.charReceived;
	  }

	  charStr += buffer.toString(this.encoding, 0, end);

	  var end = charStr.length - 1;
	  var charCode = charStr.charCodeAt(end);
	  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	    var size = this.surrogateSize;
	    this.charLength += size;
	    this.charReceived += size;
	    this.charBuffer.copy(this.charBuffer, size, 0, size);
	    buffer.copy(this.charBuffer, 0, 0, size);
	    return charStr.substring(0, end);
	  }

	  // or just emit the charStr
	  return charStr;
	};

	// detectIncompleteChar determines if there is an incomplete UTF-8 character at
	// the end of the given buffer. If so, it sets this.charLength to the byte
	// length that character, and sets this.charReceived to the number of bytes
	// that are available for this character.
	StringDecoder.prototype.detectIncompleteChar = function(buffer) {
	  // determine how many bytes we have to check at the end of this buffer
	  var i = (buffer.length >= 3) ? 3 : buffer.length;

	  // Figure out if one of the last i bytes of our buffer announces an
	  // incomplete char.
	  for (; i > 0; i--) {
	    var c = buffer[buffer.length - i];

	    // See http://en.wikipedia.org/wiki/UTF-8#Description

	    // 110XXXXX
	    if (i == 1 && c >> 5 == 0x06) {
	      this.charLength = 2;
	      break;
	    }

	    // 1110XXXX
	    if (i <= 2 && c >> 4 == 0x0E) {
	      this.charLength = 3;
	      break;
	    }

	    // 11110XXX
	    if (i <= 3 && c >> 3 == 0x1E) {
	      this.charLength = 4;
	      break;
	    }
	  }
	  this.charReceived = i;
	};

	StringDecoder.prototype.end = function(buffer) {
	  var res = '';
	  if (buffer && buffer.length)
	    res = this.write(buffer);

	  if (this.charReceived) {
	    var cr = this.charReceived;
	    var buf = this.charBuffer;
	    var enc = this.encoding;
	    res += buf.slice(0, cr).toString(enc);
	  }

	  return res;
	};

	function passThroughWrite(buffer) {
	  return buffer.toString(this.encoding);
	}

	function utf16DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 2;
	  this.charLength = this.charReceived ? 2 : 0;
	}

	function base64DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 3;
	  this.charLength = this.charReceived ? 3 : 0;
	}


/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(25)


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(33)


/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	// a transform stream is a readable/writable stream where you do
	// something with the data.  Sometimes it's called a "filter",
	// but that's not a great name for it, since that implies a thing where
	// some bits pass through, and others are simply ignored.  (That would
	// be a valid example of a transform, of course.)
	//
	// While the output is causally related to the input, it's not a
	// necessarily symmetric or synchronous transformation.  For example,
	// a zlib stream might take multiple plain-text writes(), and then
	// emit a single compressed chunk some time in the future.
	//
	// Here's how this works:
	//
	// The Transform stream has all the aspects of the readable and writable
	// stream classes.  When you write(chunk), that calls _write(chunk,cb)
	// internally, and returns false if there's a lot of pending writes
	// buffered up.  When you call read(), that calls _read(n) until
	// there's enough pending readable data buffered up.
	//
	// In a transform stream, the written data is placed in a buffer.  When
	// _read(n) is called, it transforms the queued up data, calling the
	// buffered _write cb's as it consumes chunks.  If consuming a single
	// written chunk would result in multiple output chunks, then the first
	// outputted bit calls the readcb, and subsequent chunks just go into
	// the read buffer, and will cause it to emit 'readable' if necessary.
	//
	// This way, back-pressure is actually determined by the reading side,
	// since _read has to be called to start processing a new chunk.  However,
	// a pathological inflate type of transform can cause excessive buffering
	// here.  For example, imagine a stream where every byte of input is
	// interpreted as an integer from 0-255, and then results in that many
	// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
	// 1kb of data being output.  In this case, you could write a very small
	// amount of input, and end up with a very large amount of output.  In
	// such a pathological inflating mechanism, there'd be no way to tell
	// the system to stop doing the transform.  A single 4MB write could
	// cause the system to run out of memory.
	//
	// However, even in such a pathological case, only a single written chunk
	// would be consumed, and then the rest would wait (un-transformed) until
	// the results of the previous transformed chunk were consumed.

	'use strict';

	module.exports = Transform;

	var Duplex = __webpack_require__(25);

	/*<replacement>*/
	var util = __webpack_require__(21);
	util.inherits = __webpack_require__(22);
	/*</replacement>*/

	util.inherits(Transform, Duplex);

	function TransformState(stream) {
	  this.afterTransform = function (er, data) {
	    return afterTransform(stream, er, data);
	  };

	  this.needTransform = false;
	  this.transforming = false;
	  this.writecb = null;
	  this.writechunk = null;
	  this.writeencoding = null;
	}

	function afterTransform(stream, er, data) {
	  var ts = stream._transformState;
	  ts.transforming = false;

	  var cb = ts.writecb;

	  if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

	  ts.writechunk = null;
	  ts.writecb = null;

	  if (data !== null && data !== undefined) stream.push(data);

	  cb(er);

	  var rs = stream._readableState;
	  rs.reading = false;
	  if (rs.needReadable || rs.length < rs.highWaterMark) {
	    stream._read(rs.highWaterMark);
	  }
	}

	function Transform(options) {
	  if (!(this instanceof Transform)) return new Transform(options);

	  Duplex.call(this, options);

	  this._transformState = new TransformState(this);

	  var stream = this;

	  // start out asking for a readable event once data is transformed.
	  this._readableState.needReadable = true;

	  // we have implemented the _read method, and done the other things
	  // that Readable wants before the first _read call, so unset the
	  // sync guard flag.
	  this._readableState.sync = false;

	  if (options) {
	    if (typeof options.transform === 'function') this._transform = options.transform;

	    if (typeof options.flush === 'function') this._flush = options.flush;
	  }

	  // When the writable side finishes, then flush out anything remaining.
	  this.once('prefinish', function () {
	    if (typeof this._flush === 'function') this._flush(function (er, data) {
	      done(stream, er, data);
	    });else done(stream);
	  });
	}

	Transform.prototype.push = function (chunk, encoding) {
	  this._transformState.needTransform = false;
	  return Duplex.prototype.push.call(this, chunk, encoding);
	};

	// This is the part where you do stuff!
	// override this function in implementation classes.
	// 'chunk' is an input chunk.
	//
	// Call `push(newChunk)` to pass along transformed output
	// to the readable side.  You may call 'push' zero or more times.
	//
	// Call `cb(err)` when you are done with this chunk.  If you pass
	// an error, then that'll put the hurt on the whole operation.  If you
	// never call cb(), then you'll never get another chunk.
	Transform.prototype._transform = function (chunk, encoding, cb) {
	  throw new Error('_transform() is not implemented');
	};

	Transform.prototype._write = function (chunk, encoding, cb) {
	  var ts = this._transformState;
	  ts.writecb = cb;
	  ts.writechunk = chunk;
	  ts.writeencoding = encoding;
	  if (!ts.transforming) {
	    var rs = this._readableState;
	    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
	  }
	};

	// Doesn't matter what the args are here.
	// _transform does all the work.
	// That we got here means that the readable side wants more data.
	Transform.prototype._read = function (n) {
	  var ts = this._transformState;

	  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
	    ts.transforming = true;
	    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
	  } else {
	    // mark that we need a transform, so that any data that comes in
	    // will get processed, now that we've asked for it.
	    ts.needTransform = true;
	  }
	};

	function done(stream, er, data) {
	  if (er) return stream.emit('error', er);

	  if (data !== null && data !== undefined) stream.push(data);

	  // if there's nothing in the write buffer, then that means
	  // that nothing more will ever be provided
	  var ws = stream._writableState;
	  var ts = stream._transformState;

	  if (ws.length) throw new Error('Calling transform done when ws.length != 0');

	  if (ts.transforming) throw new Error('Calling transform done when still transforming');

	  return stream.push(null);
	}

/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(35)


/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	// a passthrough stream.
	// basically just the most minimal sort of Transform stream.
	// Every written chunk gets output as-is.

	'use strict';

	module.exports = PassThrough;

	var Transform = __webpack_require__(33);

	/*<replacement>*/
	var util = __webpack_require__(21);
	util.inherits = __webpack_require__(22);
	/*</replacement>*/

	util.inherits(PassThrough, Transform);

	function PassThrough(options) {
	  if (!(this instanceof PassThrough)) return new PassThrough(options);

	  Transform.call(this, options);
	}

	PassThrough.prototype._transform = function (chunk, encoding, cb) {
	  cb(null, chunk);
	};

/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	var Buffer = __webpack_require__(4).Buffer

	module.exports = function (buf) {
		// If the buffer is backed by a Uint8Array, a faster version will work
		if (buf instanceof Uint8Array) {
			// If the buffer isn't a subarray, return the underlying ArrayBuffer
			if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
				return buf.buffer
			} else if (typeof buf.buffer.slice === 'function') {
				// Otherwise we need to get a proper copy
				return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
			}
		}

		if (Buffer.isBuffer(buf)) {
			// This is the slow version that will work with any Buffer
			// implementation (even in old browsers)
			var arrayCopy = new Uint8Array(buf.length)
			var len = buf.length
			for (var i = 0; i < len; i++) {
				arrayCopy[i] = buf[i]
			}
			return arrayCopy.buffer
		} else {
			throw new Error('Argument must be a Buffer')
		}
	}


/***/ },
/* 37 */
/***/ function(module, exports) {

	module.exports = extend

	var hasOwnProperty = Object.prototype.hasOwnProperty;

	function extend() {
	    var target = {}

	    for (var i = 0; i < arguments.length; i++) {
	        var source = arguments[i]

	        for (var key in source) {
	            if (hasOwnProperty.call(source, key)) {
	                target[key] = source[key]
	            }
	        }
	    }

	    return target
	}


/***/ },
/* 38 */
/***/ function(module, exports) {

	module.exports = {
	  "100": "Continue",
	  "101": "Switching Protocols",
	  "102": "Processing",
	  "200": "OK",
	  "201": "Created",
	  "202": "Accepted",
	  "203": "Non-Authoritative Information",
	  "204": "No Content",
	  "205": "Reset Content",
	  "206": "Partial Content",
	  "207": "Multi-Status",
	  "208": "Already Reported",
	  "226": "IM Used",
	  "300": "Multiple Choices",
	  "301": "Moved Permanently",
	  "302": "Found",
	  "303": "See Other",
	  "304": "Not Modified",
	  "305": "Use Proxy",
	  "307": "Temporary Redirect",
	  "308": "Permanent Redirect",
	  "400": "Bad Request",
	  "401": "Unauthorized",
	  "402": "Payment Required",
	  "403": "Forbidden",
	  "404": "Not Found",
	  "405": "Method Not Allowed",
	  "406": "Not Acceptable",
	  "407": "Proxy Authentication Required",
	  "408": "Request Timeout",
	  "409": "Conflict",
	  "410": "Gone",
	  "411": "Length Required",
	  "412": "Precondition Failed",
	  "413": "Payload Too Large",
	  "414": "URI Too Long",
	  "415": "Unsupported Media Type",
	  "416": "Range Not Satisfiable",
	  "417": "Expectation Failed",
	  "418": "I'm a teapot",
	  "421": "Misdirected Request",
	  "422": "Unprocessable Entity",
	  "423": "Locked",
	  "424": "Failed Dependency",
	  "425": "Unordered Collection",
	  "426": "Upgrade Required",
	  "428": "Precondition Required",
	  "429": "Too Many Requests",
	  "431": "Request Header Fields Too Large",
	  "451": "Unavailable For Legal Reasons",
	  "500": "Internal Server Error",
	  "501": "Not Implemented",
	  "502": "Bad Gateway",
	  "503": "Service Unavailable",
	  "504": "Gateway Timeout",
	  "505": "HTTP Version Not Supported",
	  "506": "Variant Also Negotiates",
	  "507": "Insufficient Storage",
	  "508": "Loop Detected",
	  "509": "Bandwidth Limit Exceeded",
	  "510": "Not Extended",
	  "511": "Network Authentication Required"
	}


/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	'use strict';

	var punycode = __webpack_require__(40);
	var util = __webpack_require__(42);

	exports.parse = urlParse;
	exports.resolve = urlResolve;
	exports.resolveObject = urlResolveObject;
	exports.format = urlFormat;

	exports.Url = Url;

	function Url() {
	  this.protocol = null;
	  this.slashes = null;
	  this.auth = null;
	  this.host = null;
	  this.port = null;
	  this.hostname = null;
	  this.hash = null;
	  this.search = null;
	  this.query = null;
	  this.pathname = null;
	  this.path = null;
	  this.href = null;
	}

	// Reference: RFC 3986, RFC 1808, RFC 2396

	// define these here so at least they only have to be
	// compiled once on the first module load.
	var protocolPattern = /^([a-z0-9.+-]+:)/i,
	    portPattern = /:[0-9]*$/,

	    // Special case for a simple path URL
	    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

	    // RFC 2396: characters reserved for delimiting URLs.
	    // We actually just auto-escape these.
	    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

	    // RFC 2396: characters not allowed for various reasons.
	    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

	    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
	    autoEscape = ['\''].concat(unwise),
	    // Characters that are never ever allowed in a hostname.
	    // Note that any invalid chars are also handled, but these
	    // are the ones that are *expected* to be seen, so we fast-path
	    // them.
	    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
	    hostEndingChars = ['/', '?', '#'],
	    hostnameMaxLen = 255,
	    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
	    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
	    // protocols that can allow "unsafe" and "unwise" chars.
	    unsafeProtocol = {
	      'javascript': true,
	      'javascript:': true
	    },
	    // protocols that never have a hostname.
	    hostlessProtocol = {
	      'javascript': true,
	      'javascript:': true
	    },
	    // protocols that always contain a // bit.
	    slashedProtocol = {
	      'http': true,
	      'https': true,
	      'ftp': true,
	      'gopher': true,
	      'file': true,
	      'http:': true,
	      'https:': true,
	      'ftp:': true,
	      'gopher:': true,
	      'file:': true
	    },
	    querystring = __webpack_require__(43);

	function urlParse(url, parseQueryString, slashesDenoteHost) {
	  if (url && util.isObject(url) && url instanceof Url) return url;

	  var u = new Url;
	  u.parse(url, parseQueryString, slashesDenoteHost);
	  return u;
	}

	Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
	  if (!util.isString(url)) {
	    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
	  }

	  // Copy chrome, IE, opera backslash-handling behavior.
	  // Back slashes before the query string get converted to forward slashes
	  // See: https://code.google.com/p/chromium/issues/detail?id=25916
	  var queryIndex = url.indexOf('?'),
	      splitter =
	          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
	      uSplit = url.split(splitter),
	      slashRegex = /\\/g;
	  uSplit[0] = uSplit[0].replace(slashRegex, '/');
	  url = uSplit.join(splitter);

	  var rest = url;

	  // trim before proceeding.
	  // This is to support parse stuff like "  http://foo.com  \n"
	  rest = rest.trim();

	  if (!slashesDenoteHost && url.split('#').length === 1) {
	    // Try fast path regexp
	    var simplePath = simplePathPattern.exec(rest);
	    if (simplePath) {
	      this.path = rest;
	      this.href = rest;
	      this.pathname = simplePath[1];
	      if (simplePath[2]) {
	        this.search = simplePath[2];
	        if (parseQueryString) {
	          this.query = querystring.parse(this.search.substr(1));
	        } else {
	          this.query = this.search.substr(1);
	        }
	      } else if (parseQueryString) {
	        this.search = '';
	        this.query = {};
	      }
	      return this;
	    }
	  }

	  var proto = protocolPattern.exec(rest);
	  if (proto) {
	    proto = proto[0];
	    var lowerProto = proto.toLowerCase();
	    this.protocol = lowerProto;
	    rest = rest.substr(proto.length);
	  }

	  // figure out if it's got a host
	  // user@server is *always* interpreted as a hostname, and url
	  // resolution will treat //foo/bar as host=foo,path=bar because that's
	  // how the browser resolves relative URLs.
	  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
	    var slashes = rest.substr(0, 2) === '//';
	    if (slashes && !(proto && hostlessProtocol[proto])) {
	      rest = rest.substr(2);
	      this.slashes = true;
	    }
	  }

	  if (!hostlessProtocol[proto] &&
	      (slashes || (proto && !slashedProtocol[proto]))) {

	    // there's a hostname.
	    // the first instance of /, ?, ;, or # ends the host.
	    //
	    // If there is an @ in the hostname, then non-host chars *are* allowed
	    // to the left of the last @ sign, unless some host-ending character
	    // comes *before* the @-sign.
	    // URLs are obnoxious.
	    //
	    // ex:
	    // http://a@b@c/ => user:a@b host:c
	    // http://a@b?@c => user:a host:c path:/?@c

	    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
	    // Review our test case against browsers more comprehensively.

	    // find the first instance of any hostEndingChars
	    var hostEnd = -1;
	    for (var i = 0; i < hostEndingChars.length; i++) {
	      var hec = rest.indexOf(hostEndingChars[i]);
	      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
	        hostEnd = hec;
	    }

	    // at this point, either we have an explicit point where the
	    // auth portion cannot go past, or the last @ char is the decider.
	    var auth, atSign;
	    if (hostEnd === -1) {
	      // atSign can be anywhere.
	      atSign = rest.lastIndexOf('@');
	    } else {
	      // atSign must be in auth portion.
	      // http://a@b/c@d => host:b auth:a path:/c@d
	      atSign = rest.lastIndexOf('@', hostEnd);
	    }

	    // Now we have a portion which is definitely the auth.
	    // Pull that off.
	    if (atSign !== -1) {
	      auth = rest.slice(0, atSign);
	      rest = rest.slice(atSign + 1);
	      this.auth = decodeURIComponent(auth);
	    }

	    // the host is the remaining to the left of the first non-host char
	    hostEnd = -1;
	    for (var i = 0; i < nonHostChars.length; i++) {
	      var hec = rest.indexOf(nonHostChars[i]);
	      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
	        hostEnd = hec;
	    }
	    // if we still have not hit it, then the entire thing is a host.
	    if (hostEnd === -1)
	      hostEnd = rest.length;

	    this.host = rest.slice(0, hostEnd);
	    rest = rest.slice(hostEnd);

	    // pull out port.
	    this.parseHost();

	    // we've indicated that there is a hostname,
	    // so even if it's empty, it has to be present.
	    this.hostname = this.hostname || '';

	    // if hostname begins with [ and ends with ]
	    // assume that it's an IPv6 address.
	    var ipv6Hostname = this.hostname[0] === '[' &&
	        this.hostname[this.hostname.length - 1] === ']';

	    // validate a little.
	    if (!ipv6Hostname) {
	      var hostparts = this.hostname.split(/\./);
	      for (var i = 0, l = hostparts.length; i < l; i++) {
	        var part = hostparts[i];
	        if (!part) continue;
	        if (!part.match(hostnamePartPattern)) {
	          var newpart = '';
	          for (var j = 0, k = part.length; j < k; j++) {
	            if (part.charCodeAt(j) > 127) {
	              // we replace non-ASCII char with a temporary placeholder
	              // we need this to make sure size of hostname is not
	              // broken by replacing non-ASCII by nothing
	              newpart += 'x';
	            } else {
	              newpart += part[j];
	            }
	          }
	          // we test again with ASCII char only
	          if (!newpart.match(hostnamePartPattern)) {
	            var validParts = hostparts.slice(0, i);
	            var notHost = hostparts.slice(i + 1);
	            var bit = part.match(hostnamePartStart);
	            if (bit) {
	              validParts.push(bit[1]);
	              notHost.unshift(bit[2]);
	            }
	            if (notHost.length) {
	              rest = '/' + notHost.join('.') + rest;
	            }
	            this.hostname = validParts.join('.');
	            break;
	          }
	        }
	      }
	    }

	    if (this.hostname.length > hostnameMaxLen) {
	      this.hostname = '';
	    } else {
	      // hostnames are always lower case.
	      this.hostname = this.hostname.toLowerCase();
	    }

	    if (!ipv6Hostname) {
	      // IDNA Support: Returns a punycoded representation of "domain".
	      // It only converts parts of the domain name that
	      // have non-ASCII characters, i.e. it doesn't matter if
	      // you call it with a domain that already is ASCII-only.
	      this.hostname = punycode.toASCII(this.hostname);
	    }

	    var p = this.port ? ':' + this.port : '';
	    var h = this.hostname || '';
	    this.host = h + p;
	    this.href += this.host;

	    // strip [ and ] from the hostname
	    // the host field still retains them, though
	    if (ipv6Hostname) {
	      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
	      if (rest[0] !== '/') {
	        rest = '/' + rest;
	      }
	    }
	  }

	  // now rest is set to the post-host stuff.
	  // chop off any delim chars.
	  if (!unsafeProtocol[lowerProto]) {

	    // First, make 100% sure that any "autoEscape" chars get
	    // escaped, even if encodeURIComponent doesn't think they
	    // need to be.
	    for (var i = 0, l = autoEscape.length; i < l; i++) {
	      var ae = autoEscape[i];
	      if (rest.indexOf(ae) === -1)
	        continue;
	      var esc = encodeURIComponent(ae);
	      if (esc === ae) {
	        esc = escape(ae);
	      }
	      rest = rest.split(ae).join(esc);
	    }
	  }


	  // chop off from the tail first.
	  var hash = rest.indexOf('#');
	  if (hash !== -1) {
	    // got a fragment string.
	    this.hash = rest.substr(hash);
	    rest = rest.slice(0, hash);
	  }
	  var qm = rest.indexOf('?');
	  if (qm !== -1) {
	    this.search = rest.substr(qm);
	    this.query = rest.substr(qm + 1);
	    if (parseQueryString) {
	      this.query = querystring.parse(this.query);
	    }
	    rest = rest.slice(0, qm);
	  } else if (parseQueryString) {
	    // no query string, but parseQueryString still requested
	    this.search = '';
	    this.query = {};
	  }
	  if (rest) this.pathname = rest;
	  if (slashedProtocol[lowerProto] &&
	      this.hostname && !this.pathname) {
	    this.pathname = '/';
	  }

	  //to support http.request
	  if (this.pathname || this.search) {
	    var p = this.pathname || '';
	    var s = this.search || '';
	    this.path = p + s;
	  }

	  // finally, reconstruct the href based on what has been validated.
	  this.href = this.format();
	  return this;
	};

	// format a parsed object into a url string
	function urlFormat(obj) {
	  // ensure it's an object, and not a string url.
	  // If it's an obj, this is a no-op.
	  // this way, you can call url_format() on strings
	  // to clean up potentially wonky urls.
	  if (util.isString(obj)) obj = urlParse(obj);
	  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
	  return obj.format();
	}

	Url.prototype.format = function() {
	  var auth = this.auth || '';
	  if (auth) {
	    auth = encodeURIComponent(auth);
	    auth = auth.replace(/%3A/i, ':');
	    auth += '@';
	  }

	  var protocol = this.protocol || '',
	      pathname = this.pathname || '',
	      hash = this.hash || '',
	      host = false,
	      query = '';

	  if (this.host) {
	    host = auth + this.host;
	  } else if (this.hostname) {
	    host = auth + (this.hostname.indexOf(':') === -1 ?
	        this.hostname :
	        '[' + this.hostname + ']');
	    if (this.port) {
	      host += ':' + this.port;
	    }
	  }

	  if (this.query &&
	      util.isObject(this.query) &&
	      Object.keys(this.query).length) {
	    query = querystring.stringify(this.query);
	  }

	  var search = this.search || (query && ('?' + query)) || '';

	  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

	  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
	  // unless they had them to begin with.
	  if (this.slashes ||
	      (!protocol || slashedProtocol[protocol]) && host !== false) {
	    host = '//' + (host || '');
	    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
	  } else if (!host) {
	    host = '';
	  }

	  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
	  if (search && search.charAt(0) !== '?') search = '?' + search;

	  pathname = pathname.replace(/[?#]/g, function(match) {
	    return encodeURIComponent(match);
	  });
	  search = search.replace('#', '%23');

	  return protocol + host + pathname + search + hash;
	};

	function urlResolve(source, relative) {
	  return urlParse(source, false, true).resolve(relative);
	}

	Url.prototype.resolve = function(relative) {
	  return this.resolveObject(urlParse(relative, false, true)).format();
	};

	function urlResolveObject(source, relative) {
	  if (!source) return relative;
	  return urlParse(source, false, true).resolveObject(relative);
	}

	Url.prototype.resolveObject = function(relative) {
	  if (util.isString(relative)) {
	    var rel = new Url();
	    rel.parse(relative, false, true);
	    relative = rel;
	  }

	  var result = new Url();
	  var tkeys = Object.keys(this);
	  for (var tk = 0; tk < tkeys.length; tk++) {
	    var tkey = tkeys[tk];
	    result[tkey] = this[tkey];
	  }

	  // hash is always overridden, no matter what.
	  // even href="" will remove it.
	  result.hash = relative.hash;

	  // if the relative url is empty, then there's nothing left to do here.
	  if (relative.href === '') {
	    result.href = result.format();
	    return result;
	  }

	  // hrefs like //foo/bar always cut to the protocol.
	  if (relative.slashes && !relative.protocol) {
	    // take everything except the protocol from relative
	    var rkeys = Object.keys(relative);
	    for (var rk = 0; rk < rkeys.length; rk++) {
	      var rkey = rkeys[rk];
	      if (rkey !== 'protocol')
	        result[rkey] = relative[rkey];
	    }

	    //urlParse appends trailing / to urls like http://www.example.com
	    if (slashedProtocol[result.protocol] &&
	        result.hostname && !result.pathname) {
	      result.path = result.pathname = '/';
	    }

	    result.href = result.format();
	    return result;
	  }

	  if (relative.protocol && relative.protocol !== result.protocol) {
	    // if it's a known url protocol, then changing
	    // the protocol does weird things
	    // first, if it's not file:, then we MUST have a host,
	    // and if there was a path
	    // to begin with, then we MUST have a path.
	    // if it is file:, then the host is dropped,
	    // because that's known to be hostless.
	    // anything else is assumed to be absolute.
	    if (!slashedProtocol[relative.protocol]) {
	      var keys = Object.keys(relative);
	      for (var v = 0; v < keys.length; v++) {
	        var k = keys[v];
	        result[k] = relative[k];
	      }
	      result.href = result.format();
	      return result;
	    }

	    result.protocol = relative.protocol;
	    if (!relative.host && !hostlessProtocol[relative.protocol]) {
	      var relPath = (relative.pathname || '').split('/');
	      while (relPath.length && !(relative.host = relPath.shift()));
	      if (!relative.host) relative.host = '';
	      if (!relative.hostname) relative.hostname = '';
	      if (relPath[0] !== '') relPath.unshift('');
	      if (relPath.length < 2) relPath.unshift('');
	      result.pathname = relPath.join('/');
	    } else {
	      result.pathname = relative.pathname;
	    }
	    result.search = relative.search;
	    result.query = relative.query;
	    result.host = relative.host || '';
	    result.auth = relative.auth;
	    result.hostname = relative.hostname || relative.host;
	    result.port = relative.port;
	    // to support http.request
	    if (result.pathname || result.search) {
	      var p = result.pathname || '';
	      var s = result.search || '';
	      result.path = p + s;
	    }
	    result.slashes = result.slashes || relative.slashes;
	    result.href = result.format();
	    return result;
	  }

	  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
	      isRelAbs = (
	          relative.host ||
	          relative.pathname && relative.pathname.charAt(0) === '/'
	      ),
	      mustEndAbs = (isRelAbs || isSourceAbs ||
	                    (result.host && relative.pathname)),
	      removeAllDots = mustEndAbs,
	      srcPath = result.pathname && result.pathname.split('/') || [],
	      relPath = relative.pathname && relative.pathname.split('/') || [],
	      psychotic = result.protocol && !slashedProtocol[result.protocol];

	  // if the url is a non-slashed url, then relative
	  // links like ../.. should be able
	  // to crawl up to the hostname, as well.  This is strange.
	  // result.protocol has already been set by now.
	  // Later on, put the first path part into the host field.
	  if (psychotic) {
	    result.hostname = '';
	    result.port = null;
	    if (result.host) {
	      if (srcPath[0] === '') srcPath[0] = result.host;
	      else srcPath.unshift(result.host);
	    }
	    result.host = '';
	    if (relative.protocol) {
	      relative.hostname = null;
	      relative.port = null;
	      if (relative.host) {
	        if (relPath[0] === '') relPath[0] = relative.host;
	        else relPath.unshift(relative.host);
	      }
	      relative.host = null;
	    }
	    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
	  }

	  if (isRelAbs) {
	    // it's absolute.
	    result.host = (relative.host || relative.host === '') ?
	                  relative.host : result.host;
	    result.hostname = (relative.hostname || relative.hostname === '') ?
	                      relative.hostname : result.hostname;
	    result.search = relative.search;
	    result.query = relative.query;
	    srcPath = relPath;
	    // fall through to the dot-handling below.
	  } else if (relPath.length) {
	    // it's relative
	    // throw away the existing file, and take the new path instead.
	    if (!srcPath) srcPath = [];
	    srcPath.pop();
	    srcPath = srcPath.concat(relPath);
	    result.search = relative.search;
	    result.query = relative.query;
	  } else if (!util.isNullOrUndefined(relative.search)) {
	    // just pull out the search.
	    // like href='?foo'.
	    // Put this after the other two cases because it simplifies the booleans
	    if (psychotic) {
	      result.hostname = result.host = srcPath.shift();
	      //occationaly the auth can get stuck only in host
	      //this especially happens in cases like
	      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
	      var authInHost = result.host && result.host.indexOf('@') > 0 ?
	                       result.host.split('@') : false;
	      if (authInHost) {
	        result.auth = authInHost.shift();
	        result.host = result.hostname = authInHost.shift();
	      }
	    }
	    result.search = relative.search;
	    result.query = relative.query;
	    //to support http.request
	    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
	      result.path = (result.pathname ? result.pathname : '') +
	                    (result.search ? result.search : '');
	    }
	    result.href = result.format();
	    return result;
	  }

	  if (!srcPath.length) {
	    // no path at all.  easy.
	    // we've already handled the other stuff above.
	    result.pathname = null;
	    //to support http.request
	    if (result.search) {
	      result.path = '/' + result.search;
	    } else {
	      result.path = null;
	    }
	    result.href = result.format();
	    return result;
	  }

	  // if a url ENDs in . or .., then it must get a trailing slash.
	  // however, if it ends in anything else non-slashy,
	  // then it must NOT get a trailing slash.
	  var last = srcPath.slice(-1)[0];
	  var hasTrailingSlash = (
	      (result.host || relative.host || srcPath.length > 1) &&
	      (last === '.' || last === '..') || last === '');

	  // strip single dots, resolve double dots to parent dir
	  // if the path tries to go above the root, `up` ends up > 0
	  var up = 0;
	  for (var i = srcPath.length; i >= 0; i--) {
	    last = srcPath[i];
	    if (last === '.') {
	      srcPath.splice(i, 1);
	    } else if (last === '..') {
	      srcPath.splice(i, 1);
	      up++;
	    } else if (up) {
	      srcPath.splice(i, 1);
	      up--;
	    }
	  }

	  // if the path is allowed to go above the root, restore leading ..s
	  if (!mustEndAbs && !removeAllDots) {
	    for (; up--; up) {
	      srcPath.unshift('..');
	    }
	  }

	  if (mustEndAbs && srcPath[0] !== '' &&
	      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
	    srcPath.unshift('');
	  }

	  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
	    srcPath.push('');
	  }

	  var isAbsolute = srcPath[0] === '' ||
	      (srcPath[0] && srcPath[0].charAt(0) === '/');

	  // put the host back
	  if (psychotic) {
	    result.hostname = result.host = isAbsolute ? '' :
	                                    srcPath.length ? srcPath.shift() : '';
	    //occationaly the auth can get stuck only in host
	    //this especially happens in cases like
	    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
	    var authInHost = result.host && result.host.indexOf('@') > 0 ?
	                     result.host.split('@') : false;
	    if (authInHost) {
	      result.auth = authInHost.shift();
	      result.host = result.hostname = authInHost.shift();
	    }
	  }

	  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

	  if (mustEndAbs && !isAbsolute) {
	    srcPath.unshift('');
	  }

	  if (!srcPath.length) {
	    result.pathname = null;
	    result.path = null;
	  } else {
	    result.pathname = srcPath.join('/');
	  }

	  //to support request.http
	  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
	    result.path = (result.pathname ? result.pathname : '') +
	                  (result.search ? result.search : '');
	  }
	  result.auth = relative.auth || result.auth;
	  result.slashes = result.slashes || relative.slashes;
	  result.href = result.format();
	  return result;
	};

	Url.prototype.parseHost = function() {
	  var host = this.host;
	  var port = portPattern.exec(host);
	  if (port) {
	    port = port[0];
	    if (port !== ':') {
	      this.port = port.substr(1);
	    }
	    host = host.substr(0, host.length - port.length);
	  }
	  if (host) this.hostname = host;
	};


/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module, global) {/*! https://mths.be/punycode v1.3.2 by @mathias */
	;(function(root) {

		/** Detect free variables */
		var freeExports = typeof exports == 'object' && exports &&
			!exports.nodeType && exports;
		var freeModule = typeof module == 'object' && module &&
			!module.nodeType && module;
		var freeGlobal = typeof global == 'object' && global;
		if (
			freeGlobal.global === freeGlobal ||
			freeGlobal.window === freeGlobal ||
			freeGlobal.self === freeGlobal
		) {
			root = freeGlobal;
		}

		/**
		 * The `punycode` object.
		 * @name punycode
		 * @type Object
		 */
		var punycode,

		/** Highest positive signed 32-bit float value */
		maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

		/** Bootstring parameters */
		base = 36,
		tMin = 1,
		tMax = 26,
		skew = 38,
		damp = 700,
		initialBias = 72,
		initialN = 128, // 0x80
		delimiter = '-', // '\x2D'

		/** Regular expressions */
		regexPunycode = /^xn--/,
		regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
		regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

		/** Error messages */
		errors = {
			'overflow': 'Overflow: input needs wider integers to process',
			'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
			'invalid-input': 'Invalid input'
		},

		/** Convenience shortcuts */
		baseMinusTMin = base - tMin,
		floor = Math.floor,
		stringFromCharCode = String.fromCharCode,

		/** Temporary variable */
		key;

		/*--------------------------------------------------------------------------*/

		/**
		 * A generic error utility function.
		 * @private
		 * @param {String} type The error type.
		 * @returns {Error} Throws a `RangeError` with the applicable error message.
		 */
		function error(type) {
			throw RangeError(errors[type]);
		}

		/**
		 * A generic `Array#map` utility function.
		 * @private
		 * @param {Array} array The array to iterate over.
		 * @param {Function} callback The function that gets called for every array
		 * item.
		 * @returns {Array} A new array of values returned by the callback function.
		 */
		function map(array, fn) {
			var length = array.length;
			var result = [];
			while (length--) {
				result[length] = fn(array[length]);
			}
			return result;
		}

		/**
		 * A simple `Array#map`-like wrapper to work with domain name strings or email
		 * addresses.
		 * @private
		 * @param {String} domain The domain name or email address.
		 * @param {Function} callback The function that gets called for every
		 * character.
		 * @returns {Array} A new string of characters returned by the callback
		 * function.
		 */
		function mapDomain(string, fn) {
			var parts = string.split('@');
			var result = '';
			if (parts.length > 1) {
				// In email addresses, only the domain name should be punycoded. Leave
				// the local part (i.e. everything up to `@`) intact.
				result = parts[0] + '@';
				string = parts[1];
			}
			// Avoid `split(regex)` for IE8 compatibility. See #17.
			string = string.replace(regexSeparators, '\x2E');
			var labels = string.split('.');
			var encoded = map(labels, fn).join('.');
			return result + encoded;
		}

		/**
		 * Creates an array containing the numeric code points of each Unicode
		 * character in the string. While JavaScript uses UCS-2 internally,
		 * this function will convert a pair of surrogate halves (each of which
		 * UCS-2 exposes as separate characters) into a single code point,
		 * matching UTF-16.
		 * @see `punycode.ucs2.encode`
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode.ucs2
		 * @name decode
		 * @param {String} string The Unicode input string (UCS-2).
		 * @returns {Array} The new array of code points.
		 */
		function ucs2decode(string) {
			var output = [],
			    counter = 0,
			    length = string.length,
			    value,
			    extra;
			while (counter < length) {
				value = string.charCodeAt(counter++);
				if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
					// high surrogate, and there is a next character
					extra = string.charCodeAt(counter++);
					if ((extra & 0xFC00) == 0xDC00) { // low surrogate
						output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
					} else {
						// unmatched surrogate; only append this code unit, in case the next
						// code unit is the high surrogate of a surrogate pair
						output.push(value);
						counter--;
					}
				} else {
					output.push(value);
				}
			}
			return output;
		}

		/**
		 * Creates a string based on an array of numeric code points.
		 * @see `punycode.ucs2.decode`
		 * @memberOf punycode.ucs2
		 * @name encode
		 * @param {Array} codePoints The array of numeric code points.
		 * @returns {String} The new Unicode string (UCS-2).
		 */
		function ucs2encode(array) {
			return map(array, function(value) {
				var output = '';
				if (value > 0xFFFF) {
					value -= 0x10000;
					output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
					value = 0xDC00 | value & 0x3FF;
				}
				output += stringFromCharCode(value);
				return output;
			}).join('');
		}

		/**
		 * Converts a basic code point into a digit/integer.
		 * @see `digitToBasic()`
		 * @private
		 * @param {Number} codePoint The basic numeric code point value.
		 * @returns {Number} The numeric value of a basic code point (for use in
		 * representing integers) in the range `0` to `base - 1`, or `base` if
		 * the code point does not represent a value.
		 */
		function basicToDigit(codePoint) {
			if (codePoint - 48 < 10) {
				return codePoint - 22;
			}
			if (codePoint - 65 < 26) {
				return codePoint - 65;
			}
			if (codePoint - 97 < 26) {
				return codePoint - 97;
			}
			return base;
		}

		/**
		 * Converts a digit/integer into a basic code point.
		 * @see `basicToDigit()`
		 * @private
		 * @param {Number} digit The numeric value of a basic code point.
		 * @returns {Number} The basic code point whose value (when used for
		 * representing integers) is `digit`, which needs to be in the range
		 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
		 * used; else, the lowercase form is used. The behavior is undefined
		 * if `flag` is non-zero and `digit` has no uppercase form.
		 */
		function digitToBasic(digit, flag) {
			//  0..25 map to ASCII a..z or A..Z
			// 26..35 map to ASCII 0..9
			return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
		}

		/**
		 * Bias adaptation function as per section 3.4 of RFC 3492.
		 * http://tools.ietf.org/html/rfc3492#section-3.4
		 * @private
		 */
		function adapt(delta, numPoints, firstTime) {
			var k = 0;
			delta = firstTime ? floor(delta / damp) : delta >> 1;
			delta += floor(delta / numPoints);
			for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
				delta = floor(delta / baseMinusTMin);
			}
			return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
		}

		/**
		 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
		 * symbols.
		 * @memberOf punycode
		 * @param {String} input The Punycode string of ASCII-only symbols.
		 * @returns {String} The resulting string of Unicode symbols.
		 */
		function decode(input) {
			// Don't use UCS-2
			var output = [],
			    inputLength = input.length,
			    out,
			    i = 0,
			    n = initialN,
			    bias = initialBias,
			    basic,
			    j,
			    index,
			    oldi,
			    w,
			    k,
			    digit,
			    t,
			    /** Cached calculation results */
			    baseMinusT;

			// Handle the basic code points: let `basic` be the number of input code
			// points before the last delimiter, or `0` if there is none, then copy
			// the first basic code points to the output.

			basic = input.lastIndexOf(delimiter);
			if (basic < 0) {
				basic = 0;
			}

			for (j = 0; j < basic; ++j) {
				// if it's not a basic code point
				if (input.charCodeAt(j) >= 0x80) {
					error('not-basic');
				}
				output.push(input.charCodeAt(j));
			}

			// Main decoding loop: start just after the last delimiter if any basic code
			// points were copied; start at the beginning otherwise.

			for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

				// `index` is the index of the next character to be consumed.
				// Decode a generalized variable-length integer into `delta`,
				// which gets added to `i`. The overflow checking is easier
				// if we increase `i` as we go, then subtract off its starting
				// value at the end to obtain `delta`.
				for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

					if (index >= inputLength) {
						error('invalid-input');
					}

					digit = basicToDigit(input.charCodeAt(index++));

					if (digit >= base || digit > floor((maxInt - i) / w)) {
						error('overflow');
					}

					i += digit * w;
					t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

					if (digit < t) {
						break;
					}

					baseMinusT = base - t;
					if (w > floor(maxInt / baseMinusT)) {
						error('overflow');
					}

					w *= baseMinusT;

				}

				out = output.length + 1;
				bias = adapt(i - oldi, out, oldi == 0);

				// `i` was supposed to wrap around from `out` to `0`,
				// incrementing `n` each time, so we'll fix that now:
				if (floor(i / out) > maxInt - n) {
					error('overflow');
				}

				n += floor(i / out);
				i %= out;

				// Insert `n` at position `i` of the output
				output.splice(i++, 0, n);

			}

			return ucs2encode(output);
		}

		/**
		 * Converts a string of Unicode symbols (e.g. a domain name label) to a
		 * Punycode string of ASCII-only symbols.
		 * @memberOf punycode
		 * @param {String} input The string of Unicode symbols.
		 * @returns {String} The resulting Punycode string of ASCII-only symbols.
		 */
		function encode(input) {
			var n,
			    delta,
			    handledCPCount,
			    basicLength,
			    bias,
			    j,
			    m,
			    q,
			    k,
			    t,
			    currentValue,
			    output = [],
			    /** `inputLength` will hold the number of code points in `input`. */
			    inputLength,
			    /** Cached calculation results */
			    handledCPCountPlusOne,
			    baseMinusT,
			    qMinusT;

			// Convert the input in UCS-2 to Unicode
			input = ucs2decode(input);

			// Cache the length
			inputLength = input.length;

			// Initialize the state
			n = initialN;
			delta = 0;
			bias = initialBias;

			// Handle the basic code points
			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue < 0x80) {
					output.push(stringFromCharCode(currentValue));
				}
			}

			handledCPCount = basicLength = output.length;

			// `handledCPCount` is the number of code points that have been handled;
			// `basicLength` is the number of basic code points.

			// Finish the basic string - if it is not empty - with a delimiter
			if (basicLength) {
				output.push(delimiter);
			}

			// Main encoding loop:
			while (handledCPCount < inputLength) {

				// All non-basic code points < n have been handled already. Find the next
				// larger one:
				for (m = maxInt, j = 0; j < inputLength; ++j) {
					currentValue = input[j];
					if (currentValue >= n && currentValue < m) {
						m = currentValue;
					}
				}

				// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
				// but guard against overflow
				handledCPCountPlusOne = handledCPCount + 1;
				if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
					error('overflow');
				}

				delta += (m - n) * handledCPCountPlusOne;
				n = m;

				for (j = 0; j < inputLength; ++j) {
					currentValue = input[j];

					if (currentValue < n && ++delta > maxInt) {
						error('overflow');
					}

					if (currentValue == n) {
						// Represent delta as a generalized variable-length integer
						for (q = delta, k = base; /* no condition */; k += base) {
							t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
							if (q < t) {
								break;
							}
							qMinusT = q - t;
							baseMinusT = base - t;
							output.push(
								stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
							);
							q = floor(qMinusT / baseMinusT);
						}

						output.push(stringFromCharCode(digitToBasic(q, 0)));
						bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
						delta = 0;
						++handledCPCount;
					}
				}

				++delta;
				++n;

			}
			return output.join('');
		}

		/**
		 * Converts a Punycode string representing a domain name or an email address
		 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
		 * it doesn't matter if you call it on a string that has already been
		 * converted to Unicode.
		 * @memberOf punycode
		 * @param {String} input The Punycoded domain name or email address to
		 * convert to Unicode.
		 * @returns {String} The Unicode representation of the given Punycode
		 * string.
		 */
		function toUnicode(input) {
			return mapDomain(input, function(string) {
				return regexPunycode.test(string)
					? decode(string.slice(4).toLowerCase())
					: string;
			});
		}

		/**
		 * Converts a Unicode string representing a domain name or an email address to
		 * Punycode. Only the non-ASCII parts of the domain name will be converted,
		 * i.e. it doesn't matter if you call it with a domain that's already in
		 * ASCII.
		 * @memberOf punycode
		 * @param {String} input The domain name or email address to convert, as a
		 * Unicode string.
		 * @returns {String} The Punycode representation of the given domain name or
		 * email address.
		 */
		function toASCII(input) {
			return mapDomain(input, function(string) {
				return regexNonASCII.test(string)
					? 'xn--' + encode(string)
					: string;
			});
		}

		/*--------------------------------------------------------------------------*/

		/** Define the public API */
		punycode = {
			/**
			 * A string representing the current Punycode.js version number.
			 * @memberOf punycode
			 * @type String
			 */
			'version': '1.3.2',
			/**
			 * An object of methods to convert from JavaScript's internal character
			 * representation (UCS-2) to Unicode code points, and back.
			 * @see <https://mathiasbynens.be/notes/javascript-encoding>
			 * @memberOf punycode
			 * @type Object
			 */
			'ucs2': {
				'decode': ucs2decode,
				'encode': ucs2encode
			},
			'decode': decode,
			'encode': encode,
			'toASCII': toASCII,
			'toUnicode': toUnicode
		};

		/** Expose `punycode` */
		// Some AMD build optimizers, like r.js, check for specific condition patterns
		// like the following:
		if (
			true
		) {
			!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {
				return punycode;
			}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
		} else if (freeExports && freeModule) {
			if (module.exports == freeExports) { // in Node.js or RingoJS v0.8.0+
				freeModule.exports = punycode;
			} else { // in Narwhal or RingoJS v0.7.0-
				for (key in punycode) {
					punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
				}
			}
		} else { // in Rhino or a web browser
			root.punycode = punycode;
		}

	}(this));

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(41)(module), (function() { return this; }())))

/***/ },
/* 41 */
/***/ function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ },
/* 42 */
/***/ function(module, exports) {

	'use strict';

	module.exports = {
	  isString: function(arg) {
	    return typeof(arg) === 'string';
	  },
	  isObject: function(arg) {
	    return typeof(arg) === 'object' && arg !== null;
	  },
	  isNull: function(arg) {
	    return arg === null;
	  },
	  isNullOrUndefined: function(arg) {
	    return arg == null;
	  }
	};


/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.decode = exports.parse = __webpack_require__(44);
	exports.encode = exports.stringify = __webpack_require__(45);


/***/ },
/* 44 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	'use strict';

	// If obj.hasOwnProperty has been overridden, then calling
	// obj.hasOwnProperty(prop) will break.
	// See: https://github.com/joyent/node/issues/1707
	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	module.exports = function(qs, sep, eq, options) {
	  sep = sep || '&';
	  eq = eq || '=';
	  var obj = {};

	  if (typeof qs !== 'string' || qs.length === 0) {
	    return obj;
	  }

	  var regexp = /\+/g;
	  qs = qs.split(sep);

	  var maxKeys = 1000;
	  if (options && typeof options.maxKeys === 'number') {
	    maxKeys = options.maxKeys;
	  }

	  var len = qs.length;
	  // maxKeys <= 0 means that we should not limit keys count
	  if (maxKeys > 0 && len > maxKeys) {
	    len = maxKeys;
	  }

	  for (var i = 0; i < len; ++i) {
	    var x = qs[i].replace(regexp, '%20'),
	        idx = x.indexOf(eq),
	        kstr, vstr, k, v;

	    if (idx >= 0) {
	      kstr = x.substr(0, idx);
	      vstr = x.substr(idx + 1);
	    } else {
	      kstr = x;
	      vstr = '';
	    }

	    k = decodeURIComponent(kstr);
	    v = decodeURIComponent(vstr);

	    if (!hasOwnProperty(obj, k)) {
	      obj[k] = v;
	    } else if (Array.isArray(obj[k])) {
	      obj[k].push(v);
	    } else {
	      obj[k] = [obj[k], v];
	    }
	  }

	  return obj;
	};


/***/ },
/* 45 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	'use strict';

	var stringifyPrimitive = function(v) {
	  switch (typeof v) {
	    case 'string':
	      return v;

	    case 'boolean':
	      return v ? 'true' : 'false';

	    case 'number':
	      return isFinite(v) ? v : '';

	    default:
	      return '';
	  }
	};

	module.exports = function(obj, sep, eq, name) {
	  sep = sep || '&';
	  eq = eq || '=';
	  if (obj === null) {
	    obj = undefined;
	  }

	  if (typeof obj === 'object') {
	    return Object.keys(obj).map(function(k) {
	      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
	      if (Array.isArray(obj[k])) {
	        return obj[k].map(function(v) {
	          return ks + encodeURIComponent(stringifyPrimitive(v));
	        }).join(sep);
	      } else {
	        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
	      }
	    }).join(sep);

	  }

	  if (!name) return '';
	  return encodeURIComponent(stringifyPrimitive(name)) + eq +
	         encodeURIComponent(stringifyPrimitive(obj));
	};


/***/ },
/* 46 */
/***/ function(module, exports, __webpack_require__) {

	var http = __webpack_require__(8);

	var https = module.exports;

	for (var key in http) {
	    if (http.hasOwnProperty(key)) https[key] = http[key];
	};

	https.request = function (params, cb) {
	    if (!params) params = {};
	    params.scheme = 'https';
	    params.protocol = 'https:';
	    return http.request.call(this, params, cb);
	}


/***/ },
/* 47 */
/***/ function(module, exports) {

	'use strict';

	module.exports.HOST = 'localhost';
	module.exports.PORT = 9222;

/***/ },
/* 48 */
/***/ function(module, exports) {

	'use strict';

	// callback(err, data)

	function externalRequest(transport, options, callback) {
	    var request = transport.get(options, function (response) {
	        var data = '';
	        response.on('data', function (chunk) {
	            data += chunk;
	        });
	        response.on('end', function () {
	            if (response.statusCode === 200) {
	                callback(null, data);
	            } else {
	                callback(new Error(data));
	            }
	        });
	    });
	    request.on('error', function (err) {
	        callback(err);
	    });
	}

	module.exports = externalRequest;

/***/ },
/* 49 */
/***/ function(module, exports) {

	module.exports = {
		"version": {
			"major": "1",
			"minor": "2"
		},
		"domains": [
			{
				"domain": "Inspector",
				"experimental": true,
				"types": [],
				"commands": [
					{
						"name": "enable",
						"description": "Enables inspector domain notifications."
					},
					{
						"name": "disable",
						"description": "Disables inspector domain notifications."
					}
				],
				"events": [
					{
						"name": "detached",
						"description": "Fired when remote debugging connection is about to be terminated. Contains detach reason.",
						"parameters": [
							{
								"name": "reason",
								"type": "string",
								"description": "The reason why connection has been terminated."
							}
						]
					},
					{
						"name": "targetCrashed",
						"description": "Fired when debugging target has crashed"
					}
				]
			},
			{
				"domain": "Memory",
				"experimental": true,
				"types": [
					{
						"id": "PressureLevel",
						"type": "string",
						"enum": [
							"moderate",
							"critical"
						],
						"description": "Memory pressure level."
					}
				],
				"commands": [
					{
						"name": "getDOMCounters",
						"returns": [
							{
								"name": "documents",
								"type": "integer"
							},
							{
								"name": "nodes",
								"type": "integer"
							},
							{
								"name": "jsEventListeners",
								"type": "integer"
							}
						]
					},
					{
						"name": "setPressureNotificationsSuppressed",
						"description": "Enable/disable suppressing memory pressure notifications in all processes.",
						"parameters": [
							{
								"name": "suppressed",
								"type": "boolean",
								"description": "If true, memory pressure notifications will be suppressed."
							}
						]
					},
					{
						"name": "simulatePressureNotification",
						"description": "Simulate a memory pressure notification in all processes.",
						"parameters": [
							{
								"name": "level",
								"$ref": "PressureLevel",
								"description": "Memory pressure level of the notification."
							}
						]
					}
				]
			},
			{
				"domain": "Page",
				"description": "Actions and events related to the inspected page belong to the page domain.",
				"dependencies": [
					"Debugger",
					"DOM"
				],
				"types": [
					{
						"id": "ResourceType",
						"type": "string",
						"enum": [
							"Document",
							"Stylesheet",
							"Image",
							"Media",
							"Font",
							"Script",
							"TextTrack",
							"XHR",
							"Fetch",
							"EventSource",
							"WebSocket",
							"Manifest",
							"Other"
						],
						"description": "Resource type as it was perceived by the rendering engine."
					},
					{
						"id": "FrameId",
						"type": "string",
						"description": "Unique frame identifier."
					},
					{
						"id": "Frame",
						"type": "object",
						"description": "Information about the Frame on the page.",
						"properties": [
							{
								"name": "id",
								"type": "string",
								"description": "Frame unique identifier."
							},
							{
								"name": "parentId",
								"type": "string",
								"optional": true,
								"description": "Parent frame identifier."
							},
							{
								"name": "loaderId",
								"$ref": "Network.LoaderId",
								"description": "Identifier of the loader associated with this frame."
							},
							{
								"name": "name",
								"type": "string",
								"optional": true,
								"description": "Frame's name as specified in the tag."
							},
							{
								"name": "url",
								"type": "string",
								"description": "Frame document's URL."
							},
							{
								"name": "securityOrigin",
								"type": "string",
								"description": "Frame document's security origin."
							},
							{
								"name": "mimeType",
								"type": "string",
								"description": "Frame document's mimeType as determined by the browser."
							}
						]
					},
					{
						"id": "FrameResource",
						"type": "object",
						"description": "Information about the Resource on the page.",
						"properties": [
							{
								"name": "url",
								"type": "string",
								"description": "Resource URL."
							},
							{
								"name": "type",
								"$ref": "ResourceType",
								"description": "Type of this resource."
							},
							{
								"name": "mimeType",
								"type": "string",
								"description": "Resource mimeType as determined by the browser."
							},
							{
								"name": "lastModified",
								"$ref": "Network.Timestamp",
								"description": "last-modified timestamp as reported by server.",
								"optional": true
							},
							{
								"name": "contentSize",
								"type": "number",
								"description": "Resource content size.",
								"optional": true
							},
							{
								"name": "failed",
								"type": "boolean",
								"optional": true,
								"description": "True if the resource failed to load."
							},
							{
								"name": "canceled",
								"type": "boolean",
								"optional": true,
								"description": "True if the resource was canceled during loading."
							}
						],
						"experimental": true
					},
					{
						"id": "FrameResourceTree",
						"type": "object",
						"description": "Information about the Frame hierarchy along with their cached resources.",
						"properties": [
							{
								"name": "frame",
								"$ref": "Frame",
								"description": "Frame information for this tree item."
							},
							{
								"name": "childFrames",
								"type": "array",
								"optional": true,
								"items": {
									"$ref": "FrameResourceTree"
								},
								"description": "Child frames."
							},
							{
								"name": "resources",
								"type": "array",
								"items": {
									"$ref": "FrameResource"
								},
								"description": "Information about frame resources."
							}
						],
						"experimental": true
					},
					{
						"id": "ScriptIdentifier",
						"type": "string",
						"description": "Unique script identifier.",
						"experimental": true
					},
					{
						"id": "NavigationEntry",
						"type": "object",
						"description": "Navigation history entry.",
						"properties": [
							{
								"name": "id",
								"type": "integer",
								"description": "Unique id of the navigation history entry."
							},
							{
								"name": "url",
								"type": "string",
								"description": "URL of the navigation history entry."
							},
							{
								"name": "title",
								"type": "string",
								"description": "Title of the navigation history entry."
							}
						],
						"experimental": true
					},
					{
						"id": "ScreencastFrameMetadata",
						"type": "object",
						"description": "Screencast frame metadata.",
						"properties": [
							{
								"name": "offsetTop",
								"type": "number",
								"experimental": true,
								"description": "Top offset in DIP."
							},
							{
								"name": "pageScaleFactor",
								"type": "number",
								"experimental": true,
								"description": "Page scale factor."
							},
							{
								"name": "deviceWidth",
								"type": "number",
								"experimental": true,
								"description": "Device screen width in DIP."
							},
							{
								"name": "deviceHeight",
								"type": "number",
								"experimental": true,
								"description": "Device screen height in DIP."
							},
							{
								"name": "scrollOffsetX",
								"type": "number",
								"experimental": true,
								"description": "Position of horizontal scroll in CSS pixels."
							},
							{
								"name": "scrollOffsetY",
								"type": "number",
								"experimental": true,
								"description": "Position of vertical scroll in CSS pixels."
							},
							{
								"name": "timestamp",
								"type": "number",
								"optional": true,
								"experimental": true,
								"description": "Frame swap timestamp."
							}
						],
						"experimental": true
					},
					{
						"id": "DialogType",
						"description": "Javascript dialog type.",
						"type": "string",
						"enum": [
							"alert",
							"confirm",
							"prompt",
							"beforeunload"
						],
						"experimental": true
					},
					{
						"id": "AppManifestError",
						"description": "Error while paring app manifest.",
						"type": "object",
						"properties": [
							{
								"name": "message",
								"type": "string",
								"description": "Error message."
							},
							{
								"name": "critical",
								"type": "integer",
								"description": "If criticial, this is a non-recoverable parse error."
							},
							{
								"name": "line",
								"type": "integer",
								"description": "Error line."
							},
							{
								"name": "column",
								"type": "integer",
								"description": "Error column."
							}
						],
						"experimental": true
					},
					{
						"id": "NavigationResponse",
						"description": "Proceed: allow the navigation; Cancel: cancel the navigation; CancelAndIgnore: cancels the navigation and makes the requester of the navigation acts like the request was never made.",
						"type": "string",
						"enum": [
							"Proceed",
							"Cancel",
							"CancelAndIgnore"
						],
						"experimental": true
					},
					{
						"id": "LayoutViewport",
						"type": "object",
						"description": "Layout viewport position and dimensions.",
						"experimental": true,
						"properties": [
							{
								"name": "pageX",
								"type": "integer",
								"description": "Horizontal offset relative to the document (CSS pixels)."
							},
							{
								"name": "pageY",
								"type": "integer",
								"description": "Vertical offset relative to the document (CSS pixels)."
							},
							{
								"name": "clientWidth",
								"type": "integer",
								"description": "Width (CSS pixels), excludes scrollbar if present."
							},
							{
								"name": "clientHeight",
								"type": "integer",
								"description": "Height (CSS pixels), excludes scrollbar if present."
							}
						]
					},
					{
						"id": "VisualViewport",
						"type": "object",
						"description": "Visual viewport position, dimensions, and scale.",
						"experimental": true,
						"properties": [
							{
								"name": "offsetX",
								"type": "number",
								"description": "Horizontal offset relative to the layout viewport (CSS pixels)."
							},
							{
								"name": "offsetY",
								"type": "number",
								"description": "Vertical offset relative to the layout viewport (CSS pixels)."
							},
							{
								"name": "pageX",
								"type": "number",
								"description": "Horizontal offset relative to the document (CSS pixels)."
							},
							{
								"name": "pageY",
								"type": "number",
								"description": "Vertical offset relative to the document (CSS pixels)."
							},
							{
								"name": "clientWidth",
								"type": "number",
								"description": "Width (CSS pixels), excludes scrollbar if present."
							},
							{
								"name": "clientHeight",
								"type": "number",
								"description": "Height (CSS pixels), excludes scrollbar if present."
							},
							{
								"name": "scale",
								"type": "number",
								"description": "Scale relative to the ideal viewport (size at width=device-width)."
							}
						]
					}
				],
				"commands": [
					{
						"name": "enable",
						"description": "Enables page domain notifications."
					},
					{
						"name": "disable",
						"description": "Disables page domain notifications."
					},
					{
						"name": "addScriptToEvaluateOnLoad",
						"parameters": [
							{
								"name": "scriptSource",
								"type": "string"
							}
						],
						"returns": [
							{
								"name": "identifier",
								"$ref": "ScriptIdentifier",
								"description": "Identifier of the added script."
							}
						],
						"experimental": true
					},
					{
						"name": "removeScriptToEvaluateOnLoad",
						"parameters": [
							{
								"name": "identifier",
								"$ref": "ScriptIdentifier"
							}
						],
						"experimental": true
					},
					{
						"name": "setAutoAttachToCreatedPages",
						"parameters": [
							{
								"name": "autoAttach",
								"type": "boolean",
								"description": "If true, browser will open a new inspector window for every page created from this one."
							}
						],
						"description": "Controls whether browser will open a new inspector window for connected pages.",
						"experimental": true
					},
					{
						"name": "reload",
						"parameters": [
							{
								"name": "ignoreCache",
								"type": "boolean",
								"optional": true,
								"description": "If true, browser cache is ignored (as if the user pressed Shift+refresh)."
							},
							{
								"name": "scriptToEvaluateOnLoad",
								"type": "string",
								"optional": true,
								"description": "If set, the script will be injected into all frames of the inspected page after reload."
							}
						],
						"description": "Reloads given page optionally ignoring the cache."
					},
					{
						"name": "navigate",
						"parameters": [
							{
								"name": "url",
								"type": "string",
								"description": "URL to navigate the page to."
							}
						],
						"returns": [
							{
								"name": "frameId",
								"$ref": "FrameId",
								"experimental": true,
								"description": "Frame id that will be navigated."
							}
						],
						"description": "Navigates current page to the given URL."
					},
					{
						"name": "stopLoading",
						"description": "Force the page stop all navigations and pending resource fetches.",
						"experimental": true
					},
					{
						"name": "getNavigationHistory",
						"returns": [
							{
								"name": "currentIndex",
								"type": "integer",
								"description": "Index of the current navigation history entry."
							},
							{
								"name": "entries",
								"type": "array",
								"items": {
									"$ref": "NavigationEntry"
								},
								"description": "Array of navigation history entries."
							}
						],
						"description": "Returns navigation history for the current page.",
						"experimental": true
					},
					{
						"name": "navigateToHistoryEntry",
						"parameters": [
							{
								"name": "entryId",
								"type": "integer",
								"description": "Unique id of the entry to navigate to."
							}
						],
						"description": "Navigates current page to the given history entry.",
						"experimental": true
					},
					{
						"name": "getCookies",
						"returns": [
							{
								"name": "cookies",
								"type": "array",
								"items": {
									"$ref": "Network.Cookie"
								},
								"description": "Array of cookie objects."
							}
						],
						"description": "Returns all browser cookies. Depending on the backend support, will return detailed cookie information in the <code>cookies</code> field.",
						"experimental": true,
						"redirect": "Network"
					},
					{
						"name": "deleteCookie",
						"parameters": [
							{
								"name": "cookieName",
								"type": "string",
								"description": "Name of the cookie to remove."
							},
							{
								"name": "url",
								"type": "string",
								"description": "URL to match cooke domain and path."
							}
						],
						"description": "Deletes browser cookie with given name, domain and path.",
						"experimental": true,
						"redirect": "Network"
					},
					{
						"name": "getResourceTree",
						"description": "Returns present frame / resource tree structure.",
						"returns": [
							{
								"name": "frameTree",
								"$ref": "FrameResourceTree",
								"description": "Present frame / resource tree structure."
							}
						],
						"experimental": true
					},
					{
						"name": "getResourceContent",
						"description": "Returns content of the given resource.",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "FrameId",
								"description": "Frame id to get resource for."
							},
							{
								"name": "url",
								"type": "string",
								"description": "URL of the resource to get content for."
							}
						],
						"returns": [
							{
								"name": "content",
								"type": "string",
								"description": "Resource content."
							},
							{
								"name": "base64Encoded",
								"type": "boolean",
								"description": "True, if content was served as base64."
							}
						],
						"experimental": true
					},
					{
						"name": "searchInResource",
						"description": "Searches for given string in resource content.",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "FrameId",
								"description": "Frame id for resource to search in."
							},
							{
								"name": "url",
								"type": "string",
								"description": "URL of the resource to search in."
							},
							{
								"name": "query",
								"type": "string",
								"description": "String to search for."
							},
							{
								"name": "caseSensitive",
								"type": "boolean",
								"optional": true,
								"description": "If true, search is case sensitive."
							},
							{
								"name": "isRegex",
								"type": "boolean",
								"optional": true,
								"description": "If true, treats string parameter as regex."
							}
						],
						"returns": [
							{
								"name": "result",
								"type": "array",
								"items": {
									"$ref": "Debugger.SearchMatch"
								},
								"description": "List of search matches."
							}
						],
						"experimental": true
					},
					{
						"name": "setDocumentContent",
						"description": "Sets given markup as the document's HTML.",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "FrameId",
								"description": "Frame id to set HTML for."
							},
							{
								"name": "html",
								"type": "string",
								"description": "HTML content to set."
							}
						],
						"experimental": true
					},
					{
						"name": "setDeviceMetricsOverride",
						"description": "Overrides the values of device screen dimensions (window.screen.width, window.screen.height, window.innerWidth, window.innerHeight, and \"device-width\"/\"device-height\"-related CSS media query results).",
						"parameters": [
							{
								"name": "width",
								"type": "integer",
								"description": "Overriding width value in pixels (minimum 0, maximum 10000000). 0 disables the override."
							},
							{
								"name": "height",
								"type": "integer",
								"description": "Overriding height value in pixels (minimum 0, maximum 10000000). 0 disables the override."
							},
							{
								"name": "deviceScaleFactor",
								"type": "number",
								"description": "Overriding device scale factor value. 0 disables the override."
							},
							{
								"name": "mobile",
								"type": "boolean",
								"description": "Whether to emulate mobile device. This includes viewport meta tag, overlay scrollbars, text autosizing and more."
							},
							{
								"name": "fitWindow",
								"type": "boolean",
								"description": "Whether a view that exceeds the available browser window area should be scaled down to fit."
							},
							{
								"name": "scale",
								"type": "number",
								"optional": true,
								"description": "Scale to apply to resulting view image. Ignored in |fitWindow| mode."
							},
							{
								"name": "offsetX",
								"type": "number",
								"optional": true,
								"description": "X offset to shift resulting view image by. Ignored in |fitWindow| mode."
							},
							{
								"name": "offsetY",
								"type": "number",
								"optional": true,
								"description": "Y offset to shift resulting view image by. Ignored in |fitWindow| mode."
							},
							{
								"name": "screenWidth",
								"type": "integer",
								"optional": true,
								"description": "Overriding screen width value in pixels (minimum 0, maximum 10000000). Only used for |mobile==true|."
							},
							{
								"name": "screenHeight",
								"type": "integer",
								"optional": true,
								"description": "Overriding screen height value in pixels (minimum 0, maximum 10000000). Only used for |mobile==true|."
							},
							{
								"name": "positionX",
								"type": "integer",
								"optional": true,
								"description": "Overriding view X position on screen in pixels (minimum 0, maximum 10000000). Only used for |mobile==true|."
							},
							{
								"name": "positionY",
								"type": "integer",
								"optional": true,
								"description": "Overriding view Y position on screen in pixels (minimum 0, maximum 10000000). Only used for |mobile==true|."
							},
							{
								"name": "screenOrientation",
								"$ref": "Emulation.ScreenOrientation",
								"optional": true,
								"description": "Screen orientation override."
							}
						],
						"redirect": "Emulation",
						"experimental": true
					},
					{
						"name": "clearDeviceMetricsOverride",
						"description": "Clears the overriden device metrics.",
						"redirect": "Emulation",
						"experimental": true
					},
					{
						"name": "setGeolocationOverride",
						"description": "Overrides the Geolocation Position or Error. Omitting any of the parameters emulates position unavailable.",
						"parameters": [
							{
								"name": "latitude",
								"type": "number",
								"optional": true,
								"description": "Mock latitude"
							},
							{
								"name": "longitude",
								"type": "number",
								"optional": true,
								"description": "Mock longitude"
							},
							{
								"name": "accuracy",
								"type": "number",
								"optional": true,
								"description": "Mock accuracy"
							}
						],
						"redirect": "Emulation"
					},
					{
						"name": "clearGeolocationOverride",
						"description": "Clears the overriden Geolocation Position and Error.",
						"redirect": "Emulation"
					},
					{
						"name": "setDeviceOrientationOverride",
						"description": "Overrides the Device Orientation.",
						"parameters": [
							{
								"name": "alpha",
								"type": "number",
								"description": "Mock alpha"
							},
							{
								"name": "beta",
								"type": "number",
								"description": "Mock beta"
							},
							{
								"name": "gamma",
								"type": "number",
								"description": "Mock gamma"
							}
						],
						"redirect": "DeviceOrientation",
						"experimental": true
					},
					{
						"name": "clearDeviceOrientationOverride",
						"description": "Clears the overridden Device Orientation.",
						"redirect": "DeviceOrientation",
						"experimental": true
					},
					{
						"name": "setTouchEmulationEnabled",
						"parameters": [
							{
								"name": "enabled",
								"type": "boolean",
								"description": "Whether the touch event emulation should be enabled."
							},
							{
								"name": "configuration",
								"type": "string",
								"enum": [
									"mobile",
									"desktop"
								],
								"optional": true,
								"description": "Touch/gesture events configuration. Default: current platform."
							}
						],
						"description": "Toggles mouse event-based touch event emulation.",
						"experimental": true,
						"redirect": "Emulation"
					},
					{
						"name": "captureScreenshot",
						"description": "Capture page screenshot.",
						"returns": [
							{
								"name": "data",
								"type": "string",
								"description": "Base64-encoded image data (PNG)."
							}
						],
						"experimental": true
					},
					{
						"name": "startScreencast",
						"description": "Starts sending each frame using the <code>screencastFrame</code> event.",
						"parameters": [
							{
								"name": "format",
								"type": "string",
								"optional": true,
								"enum": [
									"jpeg",
									"png"
								],
								"description": "Image compression format."
							},
							{
								"name": "quality",
								"type": "integer",
								"optional": true,
								"description": "Compression quality from range [0..100]."
							},
							{
								"name": "maxWidth",
								"type": "integer",
								"optional": true,
								"description": "Maximum screenshot width."
							},
							{
								"name": "maxHeight",
								"type": "integer",
								"optional": true,
								"description": "Maximum screenshot height."
							},
							{
								"name": "everyNthFrame",
								"type": "integer",
								"optional": true,
								"description": "Send every n-th frame."
							}
						],
						"experimental": true
					},
					{
						"name": "stopScreencast",
						"description": "Stops sending each frame in the <code>screencastFrame</code>.",
						"experimental": true
					},
					{
						"name": "screencastFrameAck",
						"description": "Acknowledges that a screencast frame has been received by the frontend.",
						"parameters": [
							{
								"name": "sessionId",
								"type": "integer",
								"description": "Frame number."
							}
						],
						"experimental": true
					},
					{
						"name": "handleJavaScriptDialog",
						"description": "Accepts or dismisses a JavaScript initiated dialog (alert, confirm, prompt, or onbeforeunload).",
						"parameters": [
							{
								"name": "accept",
								"type": "boolean",
								"description": "Whether to accept or dismiss the dialog."
							},
							{
								"name": "promptText",
								"type": "string",
								"optional": true,
								"description": "The text to enter into the dialog prompt before accepting. Used only if this is a prompt dialog."
							}
						]
					},
					{
						"name": "setColorPickerEnabled",
						"parameters": [
							{
								"name": "enabled",
								"type": "boolean",
								"description": "Shows / hides color picker"
							}
						],
						"description": "Shows / hides color picker",
						"experimental": true
					},
					{
						"name": "configureOverlay",
						"parameters": [
							{
								"name": "suspended",
								"type": "boolean",
								"optional": true,
								"description": "Whether overlay should be suspended and not consume any resources."
							},
							{
								"name": "message",
								"type": "string",
								"optional": true,
								"description": "Overlay message to display."
							}
						],
						"experimental": true,
						"description": "Configures overlay."
					},
					{
						"name": "getAppManifest",
						"experimental": true,
						"returns": [
							{
								"name": "url",
								"type": "string",
								"description": "Manifest location."
							},
							{
								"name": "errors",
								"type": "array",
								"items": {
									"$ref": "AppManifestError"
								}
							},
							{
								"name": "data",
								"type": "string",
								"optional": true,
								"description": "Manifest content."
							}
						]
					},
					{
						"name": "requestAppBanner",
						"experimental": true
					},
					{
						"name": "setControlNavigations",
						"parameters": [
							{
								"name": "enabled",
								"type": "boolean"
							}
						],
						"description": "Toggles navigation throttling which allows programatic control over navigation and redirect response.",
						"experimental": true
					},
					{
						"name": "processNavigation",
						"parameters": [
							{
								"name": "response",
								"$ref": "NavigationResponse"
							},
							{
								"name": "navigationId",
								"type": "integer"
							}
						],
						"description": "Should be sent in response to a navigationRequested or a redirectRequested event, telling the browser how to handle the navigation.",
						"experimental": true
					},
					{
						"name": "getLayoutMetrics",
						"description": "Returns metrics relating to the layouting of the page, such as viewport bounds/scale.",
						"experimental": true,
						"returns": [
							{
								"name": "layoutViewport",
								"$ref": "LayoutViewport",
								"description": "Metrics relating to the layout viewport."
							},
							{
								"name": "visualViewport",
								"$ref": "VisualViewport",
								"description": "Metrics relating to the visual viewport."
							}
						]
					}
				],
				"events": [
					{
						"name": "domContentEventFired",
						"parameters": [
							{
								"name": "timestamp",
								"type": "number"
							}
						]
					},
					{
						"name": "loadEventFired",
						"parameters": [
							{
								"name": "timestamp",
								"type": "number"
							}
						]
					},
					{
						"name": "frameAttached",
						"description": "Fired when frame has been attached to its parent.",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "FrameId",
								"description": "Id of the frame that has been attached."
							},
							{
								"name": "parentFrameId",
								"$ref": "FrameId",
								"description": "Parent frame identifier."
							}
						]
					},
					{
						"name": "frameNavigated",
						"description": "Fired once navigation of the frame has completed. Frame is now associated with the new loader.",
						"parameters": [
							{
								"name": "frame",
								"$ref": "Frame",
								"description": "Frame object."
							}
						]
					},
					{
						"name": "frameDetached",
						"description": "Fired when frame has been detached from its parent.",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "FrameId",
								"description": "Id of the frame that has been detached."
							}
						]
					},
					{
						"name": "frameStartedLoading",
						"description": "Fired when frame has started loading.",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "FrameId",
								"description": "Id of the frame that has started loading."
							}
						],
						"experimental": true
					},
					{
						"name": "frameStoppedLoading",
						"description": "Fired when frame has stopped loading.",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "FrameId",
								"description": "Id of the frame that has stopped loading."
							}
						],
						"experimental": true
					},
					{
						"name": "frameScheduledNavigation",
						"description": "Fired when frame schedules a potential navigation.",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "FrameId",
								"description": "Id of the frame that has scheduled a navigation."
							},
							{
								"name": "delay",
								"type": "number",
								"description": "Delay (in seconds) until the navigation is scheduled to begin. The navigation is not guaranteed to start."
							}
						],
						"experimental": true
					},
					{
						"name": "frameClearedScheduledNavigation",
						"description": "Fired when frame no longer has a scheduled navigation.",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "FrameId",
								"description": "Id of the frame that has cleared its scheduled navigation."
							}
						],
						"experimental": true
					},
					{
						"name": "frameResized",
						"experimental": true
					},
					{
						"name": "javascriptDialogOpening",
						"description": "Fired when a JavaScript initiated dialog (alert, confirm, prompt, or onbeforeunload) is about to open.",
						"parameters": [
							{
								"name": "message",
								"type": "string",
								"description": "Message that will be displayed by the dialog."
							},
							{
								"name": "type",
								"$ref": "DialogType",
								"description": "Dialog type."
							}
						]
					},
					{
						"name": "javascriptDialogClosed",
						"description": "Fired when a JavaScript initiated dialog (alert, confirm, prompt, or onbeforeunload) has been closed.",
						"parameters": [
							{
								"name": "result",
								"type": "boolean",
								"description": "Whether dialog was confirmed."
							}
						]
					},
					{
						"name": "screencastFrame",
						"description": "Compressed image data requested by the <code>startScreencast</code>.",
						"parameters": [
							{
								"name": "data",
								"type": "string",
								"description": "Base64-encoded compressed image."
							},
							{
								"name": "metadata",
								"$ref": "ScreencastFrameMetadata",
								"description": "Screencast frame metadata."
							},
							{
								"name": "sessionId",
								"type": "integer",
								"description": "Frame number."
							}
						],
						"experimental": true
					},
					{
						"name": "screencastVisibilityChanged",
						"description": "Fired when the page with currently enabled screencast was shown or hidden </code>.",
						"parameters": [
							{
								"name": "visible",
								"type": "boolean",
								"description": "True if the page is visible."
							}
						],
						"experimental": true
					},
					{
						"name": "colorPicked",
						"description": "Fired when a color has been picked.",
						"parameters": [
							{
								"name": "color",
								"$ref": "DOM.RGBA",
								"description": "RGBA of the picked color."
							}
						],
						"experimental": true
					},
					{
						"name": "interstitialShown",
						"description": "Fired when interstitial page was shown"
					},
					{
						"name": "interstitialHidden",
						"description": "Fired when interstitial page was hidden"
					},
					{
						"name": "navigationRequested",
						"description": "Fired when a navigation is started if navigation throttles are enabled.  The navigation will be deferred until processNavigation is called.",
						"parameters": [
							{
								"name": "isInMainFrame",
								"type": "boolean",
								"description": "Whether the navigation is taking place in the main frame or in a subframe."
							},
							{
								"name": "isRedirect",
								"type": "boolean",
								"description": "Whether the navigation has encountered a server redirect or not."
							},
							{
								"name": "navigationId",
								"type": "integer"
							},
							{
								"name": "url",
								"type": "string",
								"description": "URL of requested navigation."
							}
						]
					}
				]
			},
			{
				"domain": "Rendering",
				"description": "This domain allows to control rendering of the page.",
				"experimental": true,
				"commands": [
					{
						"name": "setShowPaintRects",
						"description": "Requests that backend shows paint rectangles",
						"parameters": [
							{
								"name": "result",
								"type": "boolean",
								"description": "True for showing paint rectangles"
							}
						]
					},
					{
						"name": "setShowDebugBorders",
						"description": "Requests that backend shows debug borders on layers",
						"parameters": [
							{
								"name": "show",
								"type": "boolean",
								"description": "True for showing debug borders"
							}
						]
					},
					{
						"name": "setShowFPSCounter",
						"description": "Requests that backend shows the FPS counter",
						"parameters": [
							{
								"name": "show",
								"type": "boolean",
								"description": "True for showing the FPS counter"
							}
						]
					},
					{
						"name": "setShowScrollBottleneckRects",
						"description": "Requests that backend shows scroll bottleneck rects",
						"parameters": [
							{
								"name": "show",
								"type": "boolean",
								"description": "True for showing scroll bottleneck rects"
							}
						]
					},
					{
						"name": "setShowViewportSizeOnResize",
						"description": "Paints viewport size upon main frame resize.",
						"parameters": [
							{
								"name": "show",
								"type": "boolean",
								"description": "Whether to paint size or not."
							}
						]
					}
				]
			},
			{
				"domain": "Emulation",
				"description": "This domain emulates different environments for the page.",
				"types": [
					{
						"id": "ScreenOrientation",
						"type": "object",
						"description": "Screen orientation.",
						"properties": [
							{
								"name": "type",
								"type": "string",
								"enum": [
									"portraitPrimary",
									"portraitSecondary",
									"landscapePrimary",
									"landscapeSecondary"
								],
								"description": "Orientation type."
							},
							{
								"name": "angle",
								"type": "integer",
								"description": "Orientation angle."
							}
						]
					},
					{
						"id": "VirtualTimePolicy",
						"type": "string",
						"enum": [
							"advance",
							"pause",
							"pauseIfNetworkFetchesPending"
						],
						"experimental": true,
						"description": "advance: If the scheduler runs out of immediate work, the virtual time base may fast forward to allow the next delayed task (if any) to run; pause: The virtual time base may not advance; pauseIfNetworkFetchesPending: The virtual time base may not advance if there are any pending resource fetches."
					}
				],
				"commands": [
					{
						"name": "setDeviceMetricsOverride",
						"description": "Overrides the values of device screen dimensions (window.screen.width, window.screen.height, window.innerWidth, window.innerHeight, and \"device-width\"/\"device-height\"-related CSS media query results).",
						"parameters": [
							{
								"name": "width",
								"type": "integer",
								"description": "Overriding width value in pixels (minimum 0, maximum 10000000). 0 disables the override."
							},
							{
								"name": "height",
								"type": "integer",
								"description": "Overriding height value in pixels (minimum 0, maximum 10000000). 0 disables the override."
							},
							{
								"name": "deviceScaleFactor",
								"type": "number",
								"description": "Overriding device scale factor value. 0 disables the override."
							},
							{
								"name": "mobile",
								"type": "boolean",
								"description": "Whether to emulate mobile device. This includes viewport meta tag, overlay scrollbars, text autosizing and more."
							},
							{
								"name": "fitWindow",
								"type": "boolean",
								"description": "Whether a view that exceeds the available browser window area should be scaled down to fit."
							},
							{
								"name": "scale",
								"type": "number",
								"optional": true,
								"experimental": true,
								"description": "Scale to apply to resulting view image. Ignored in |fitWindow| mode."
							},
							{
								"name": "offsetX",
								"type": "number",
								"optional": true,
								"deprecated": true,
								"experimental": true,
								"description": "Not used."
							},
							{
								"name": "offsetY",
								"type": "number",
								"optional": true,
								"deprecated": true,
								"experimental": true,
								"description": "Not used."
							},
							{
								"name": "screenWidth",
								"type": "integer",
								"optional": true,
								"experimental": true,
								"description": "Overriding screen width value in pixels (minimum 0, maximum 10000000). Only used for |mobile==true|."
							},
							{
								"name": "screenHeight",
								"type": "integer",
								"optional": true,
								"experimental": true,
								"description": "Overriding screen height value in pixels (minimum 0, maximum 10000000). Only used for |mobile==true|."
							},
							{
								"name": "positionX",
								"type": "integer",
								"optional": true,
								"experimental": true,
								"description": "Overriding view X position on screen in pixels (minimum 0, maximum 10000000). Only used for |mobile==true|."
							},
							{
								"name": "positionY",
								"type": "integer",
								"optional": true,
								"experimental": true,
								"description": "Overriding view Y position on screen in pixels (minimum 0, maximum 10000000). Only used for |mobile==true|."
							},
							{
								"name": "screenOrientation",
								"$ref": "ScreenOrientation",
								"optional": true,
								"description": "Screen orientation override."
							}
						]
					},
					{
						"name": "clearDeviceMetricsOverride",
						"description": "Clears the overriden device metrics."
					},
					{
						"name": "forceViewport",
						"description": "Overrides the visible area of the page. The change is hidden from the page, i.e. the observable scroll position and page scale does not change. In effect, the command moves the specified area of the page into the top-left corner of the frame.",
						"experimental": true,
						"parameters": [
							{
								"name": "x",
								"type": "number",
								"description": "X coordinate of top-left corner of the area (CSS pixels)."
							},
							{
								"name": "y",
								"type": "number",
								"description": "Y coordinate of top-left corner of the area (CSS pixels)."
							},
							{
								"name": "scale",
								"type": "number",
								"description": "Scale to apply to the area (relative to a page scale of 1.0)."
							}
						]
					},
					{
						"name": "resetViewport",
						"description": "Resets the visible area of the page to the original viewport, undoing any effects of the <code>forceViewport</code> command.",
						"experimental": true
					},
					{
						"name": "resetPageScaleFactor",
						"experimental": true,
						"description": "Requests that page scale factor is reset to initial values."
					},
					{
						"name": "setPageScaleFactor",
						"description": "Sets a specified page scale factor.",
						"experimental": true,
						"parameters": [
							{
								"name": "pageScaleFactor",
								"type": "number",
								"description": "Page scale factor."
							}
						]
					},
					{
						"name": "setVisibleSize",
						"description": "Resizes the frame/viewport of the page. Note that this does not affect the frame's container (e.g. browser window). Can be used to produce screenshots of the specified size. Not supported on Android.",
						"experimental": true,
						"parameters": [
							{
								"name": "width",
								"type": "integer",
								"description": "Frame width (DIP)."
							},
							{
								"name": "height",
								"type": "integer",
								"description": "Frame height (DIP)."
							}
						]
					},
					{
						"name": "setScriptExecutionDisabled",
						"description": "Switches script execution in the page.",
						"experimental": true,
						"parameters": [
							{
								"name": "value",
								"type": "boolean",
								"description": "Whether script execution should be disabled in the page."
							}
						]
					},
					{
						"name": "setGeolocationOverride",
						"description": "Overrides the Geolocation Position or Error. Omitting any of the parameters emulates position unavailable.",
						"experimental": true,
						"parameters": [
							{
								"name": "latitude",
								"type": "number",
								"optional": true,
								"description": "Mock latitude"
							},
							{
								"name": "longitude",
								"type": "number",
								"optional": true,
								"description": "Mock longitude"
							},
							{
								"name": "accuracy",
								"type": "number",
								"optional": true,
								"description": "Mock accuracy"
							}
						]
					},
					{
						"name": "clearGeolocationOverride",
						"description": "Clears the overriden Geolocation Position and Error.",
						"experimental": true
					},
					{
						"name": "setTouchEmulationEnabled",
						"parameters": [
							{
								"name": "enabled",
								"type": "boolean",
								"description": "Whether the touch event emulation should be enabled."
							},
							{
								"name": "configuration",
								"type": "string",
								"enum": [
									"mobile",
									"desktop"
								],
								"optional": true,
								"description": "Touch/gesture events configuration. Default: current platform."
							}
						],
						"description": "Toggles mouse event-based touch event emulation."
					},
					{
						"name": "setEmulatedMedia",
						"parameters": [
							{
								"name": "media",
								"type": "string",
								"description": "Media type to emulate. Empty string disables the override."
							}
						],
						"description": "Emulates the given media for CSS media queries."
					},
					{
						"name": "setCPUThrottlingRate",
						"parameters": [
							{
								"name": "rate",
								"type": "number",
								"description": "Throttling rate as a slowdown factor (1 is no throttle, 2 is 2x slowdown, etc)."
							}
						],
						"experimental": true,
						"description": "Enables CPU throttling to emulate slow CPUs."
					},
					{
						"name": "canEmulate",
						"description": "Tells whether emulation is supported.",
						"returns": [
							{
								"name": "result",
								"type": "boolean",
								"description": "True if emulation is supported."
							}
						],
						"experimental": true
					},
					{
						"name": "setVirtualTimePolicy",
						"description": "Turns on virtual time for all frames (replacing real-time with a synthetic time source) and sets the current virtual time policy.  Note this supersedes any previous time budget.",
						"parameters": [
							{
								"name": "policy",
								"$ref": "VirtualTimePolicy"
							},
							{
								"name": "budget",
								"type": "integer",
								"optional": true,
								"description": "If set, after this many virtual milliseconds have elapsed virtual time will be paused and a virtualTimeBudgetExpired event is sent."
							}
						],
						"experimental": true
					}
				],
				"events": [
					{
						"name": "virtualTimeBudgetExpired",
						"experimental": true,
						"description": "Notification sent after the virual time budget for the current VirtualTimePolicy has run out."
					}
				]
			},
			{
				"domain": "Security",
				"description": "Security",
				"experimental": true,
				"types": [
					{
						"id": "CertificateId",
						"type": "integer",
						"description": "An internal certificate ID value."
					},
					{
						"id": "SecurityState",
						"type": "string",
						"enum": [
							"unknown",
							"neutral",
							"insecure",
							"warning",
							"secure",
							"info"
						],
						"description": "The security level of a page or resource."
					},
					{
						"id": "SecurityStateExplanation",
						"type": "object",
						"properties": [
							{
								"name": "securityState",
								"$ref": "SecurityState",
								"description": "Security state representing the severity of the factor being explained."
							},
							{
								"name": "summary",
								"type": "string",
								"description": "Short phrase describing the type of factor."
							},
							{
								"name": "description",
								"type": "string",
								"description": "Full text explanation of the factor."
							},
							{
								"name": "hasCertificate",
								"type": "boolean",
								"description": "True if the page has a certificate."
							}
						],
						"description": "An explanation of an factor contributing to the security state."
					},
					{
						"id": "InsecureContentStatus",
						"type": "object",
						"properties": [
							{
								"name": "ranMixedContent",
								"type": "boolean",
								"description": "True if the page was loaded over HTTPS and ran mixed (HTTP) content such as scripts."
							},
							{
								"name": "displayedMixedContent",
								"type": "boolean",
								"description": "True if the page was loaded over HTTPS and displayed mixed (HTTP) content such as images."
							},
							{
								"name": "ranContentWithCertErrors",
								"type": "boolean",
								"description": "True if the page was loaded over HTTPS without certificate errors, and ran content such as scripts that were loaded with certificate errors."
							},
							{
								"name": "displayedContentWithCertErrors",
								"type": "boolean",
								"description": "True if the page was loaded over HTTPS without certificate errors, and displayed content such as images that were loaded with certificate errors."
							},
							{
								"name": "ranInsecureContentStyle",
								"$ref": "SecurityState",
								"description": "Security state representing a page that ran insecure content."
							},
							{
								"name": "displayedInsecureContentStyle",
								"$ref": "SecurityState",
								"description": "Security state representing a page that displayed insecure content."
							}
						],
						"description": "Information about insecure content on the page."
					}
				],
				"commands": [
					{
						"name": "enable",
						"description": "Enables tracking security state changes."
					},
					{
						"name": "disable",
						"description": "Disables tracking security state changes."
					},
					{
						"name": "showCertificateViewer",
						"description": "Displays native dialog with the certificate details."
					}
				],
				"events": [
					{
						"name": "securityStateChanged",
						"description": "The security state of the page changed.",
						"parameters": [
							{
								"name": "securityState",
								"$ref": "SecurityState",
								"description": "Security state."
							},
							{
								"name": "schemeIsCryptographic",
								"type": "boolean",
								"description": "True if the page was loaded over cryptographic transport such as HTTPS."
							},
							{
								"name": "explanations",
								"type": "array",
								"items": {
									"$ref": "SecurityStateExplanation"
								},
								"description": "List of explanations for the security state. If the overall security state is `insecure` or `warning`, at least one corresponding explanation should be included."
							},
							{
								"name": "insecureContentStatus",
								"$ref": "InsecureContentStatus",
								"description": "Information about insecure content on the page."
							},
							{
								"name": "summary",
								"type": "string",
								"description": "Overrides user-visible description of the state.",
								"optional": true
							}
						]
					}
				]
			},
			{
				"domain": "Network",
				"description": "Network domain allows tracking network activities of the page. It exposes information about http, file, data and other requests and responses, their headers, bodies, timing, etc.",
				"dependencies": [
					"Runtime",
					"Security"
				],
				"types": [
					{
						"id": "LoaderId",
						"type": "string",
						"description": "Unique loader identifier."
					},
					{
						"id": "RequestId",
						"type": "string",
						"description": "Unique request identifier."
					},
					{
						"id": "Timestamp",
						"type": "number",
						"description": "Number of seconds since epoch."
					},
					{
						"id": "Headers",
						"type": "object",
						"description": "Request / response headers as keys / values of JSON object."
					},
					{
						"id": "ConnectionType",
						"type": "string",
						"enum": [
							"none",
							"cellular2g",
							"cellular3g",
							"cellular4g",
							"bluetooth",
							"ethernet",
							"wifi",
							"wimax",
							"other"
						],
						"description": "Loading priority of a resource request."
					},
					{
						"id": "CookieSameSite",
						"type": "string",
						"enum": [
							"Strict",
							"Lax"
						],
						"description": "Represents the cookie's 'SameSite' status: https://tools.ietf.org/html/draft-west-first-party-cookies"
					},
					{
						"id": "ResourceTiming",
						"type": "object",
						"description": "Timing information for the request.",
						"properties": [
							{
								"name": "requestTime",
								"type": "number",
								"description": "Timing's requestTime is a baseline in seconds, while the other numbers are ticks in milliseconds relatively to this requestTime."
							},
							{
								"name": "proxyStart",
								"type": "number",
								"description": "Started resolving proxy."
							},
							{
								"name": "proxyEnd",
								"type": "number",
								"description": "Finished resolving proxy."
							},
							{
								"name": "dnsStart",
								"type": "number",
								"description": "Started DNS address resolve."
							},
							{
								"name": "dnsEnd",
								"type": "number",
								"description": "Finished DNS address resolve."
							},
							{
								"name": "connectStart",
								"type": "number",
								"description": "Started connecting to the remote host."
							},
							{
								"name": "connectEnd",
								"type": "number",
								"description": "Connected to the remote host."
							},
							{
								"name": "sslStart",
								"type": "number",
								"description": "Started SSL handshake."
							},
							{
								"name": "sslEnd",
								"type": "number",
								"description": "Finished SSL handshake."
							},
							{
								"name": "workerStart",
								"type": "number",
								"description": "Started running ServiceWorker.",
								"experimental": true
							},
							{
								"name": "workerReady",
								"type": "number",
								"description": "Finished Starting ServiceWorker.",
								"experimental": true
							},
							{
								"name": "sendStart",
								"type": "number",
								"description": "Started sending request."
							},
							{
								"name": "sendEnd",
								"type": "number",
								"description": "Finished sending request."
							},
							{
								"name": "pushStart",
								"type": "number",
								"description": "Time the server started pushing request.",
								"experimental": true
							},
							{
								"name": "pushEnd",
								"type": "number",
								"description": "Time the server finished pushing request.",
								"experimental": true
							},
							{
								"name": "receiveHeadersEnd",
								"type": "number",
								"description": "Finished receiving response headers."
							}
						]
					},
					{
						"id": "ResourcePriority",
						"type": "string",
						"enum": [
							"VeryLow",
							"Low",
							"Medium",
							"High",
							"VeryHigh"
						],
						"description": "Loading priority of a resource request."
					},
					{
						"id": "Request",
						"type": "object",
						"description": "HTTP request data.",
						"properties": [
							{
								"name": "url",
								"type": "string",
								"description": "Request URL."
							},
							{
								"name": "method",
								"type": "string",
								"description": "HTTP request method."
							},
							{
								"name": "headers",
								"$ref": "Headers",
								"description": "HTTP request headers."
							},
							{
								"name": "postData",
								"type": "string",
								"optional": true,
								"description": "HTTP POST request data."
							},
							{
								"name": "mixedContentType",
								"optional": true,
								"type": "string",
								"enum": [
									"blockable",
									"optionally-blockable",
									"none"
								],
								"description": "The mixed content status of the request, as defined in http://www.w3.org/TR/mixed-content/"
							},
							{
								"name": "initialPriority",
								"$ref": "ResourcePriority",
								"description": "Priority of the resource request at the time request is sent."
							},
							{
								"name": "referrerPolicy",
								"type": "string",
								"enum": [
									"unsafe-url",
									"no-referrer-when-downgrade",
									"no-referrer",
									"origin",
									"origin-when-cross-origin",
									"no-referrer-when-downgrade-origin-when-cross-origin"
								],
								"description": "The referrer policy of the request, as defined in https://www.w3.org/TR/referrer-policy/"
							}
						]
					},
					{
						"id": "SignedCertificateTimestamp",
						"type": "object",
						"description": "Details of a signed certificate timestamp (SCT).",
						"properties": [
							{
								"name": "status",
								"type": "string",
								"description": "Validation status."
							},
							{
								"name": "origin",
								"type": "string",
								"description": "Origin."
							},
							{
								"name": "logDescription",
								"type": "string",
								"description": "Log name / description."
							},
							{
								"name": "logId",
								"type": "string",
								"description": "Log ID."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Issuance date."
							},
							{
								"name": "hashAlgorithm",
								"type": "string",
								"description": "Hash algorithm."
							},
							{
								"name": "signatureAlgorithm",
								"type": "string",
								"description": "Signature algorithm."
							},
							{
								"name": "signatureData",
								"type": "string",
								"description": "Signature data."
							}
						]
					},
					{
						"id": "SecurityDetails",
						"type": "object",
						"description": "Security details about a request.",
						"properties": [
							{
								"name": "protocol",
								"type": "string",
								"description": "Protocol name (e.g. \"TLS 1.2\" or \"QUIC\")."
							},
							{
								"name": "keyExchange",
								"type": "string",
								"description": "Key Exchange used by the connection, or the empty string if not applicable."
							},
							{
								"name": "keyExchangeGroup",
								"type": "string",
								"optional": true,
								"description": "(EC)DH group used by the connection, if applicable."
							},
							{
								"name": "cipher",
								"type": "string",
								"description": "Cipher name."
							},
							{
								"name": "mac",
								"type": "string",
								"optional": true,
								"description": "TLS MAC. Note that AEAD ciphers do not have separate MACs."
							},
							{
								"name": "certificateId",
								"$ref": "Security.CertificateId",
								"description": "Certificate ID value."
							},
							{
								"name": "subjectName",
								"type": "string",
								"description": "Certificate subject name."
							},
							{
								"name": "sanList",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "Subject Alternative Name (SAN) DNS names and IP addresses."
							},
							{
								"name": "issuer",
								"type": "string",
								"description": "Name of the issuing CA."
							},
							{
								"name": "validFrom",
								"$ref": "Timestamp",
								"description": "Certificate valid from date."
							},
							{
								"name": "validTo",
								"$ref": "Timestamp",
								"description": "Certificate valid to (expiration) date"
							},
							{
								"name": "signedCertificateTimestampList",
								"type": "array",
								"items": {
									"$ref": "SignedCertificateTimestamp"
								},
								"description": "List of signed certificate timestamps (SCTs)."
							}
						]
					},
					{
						"id": "BlockedReason",
						"type": "string",
						"description": "The reason why request was blocked.",
						"enum": [
							"csp",
							"mixed-content",
							"origin",
							"inspector",
							"subresource-filter",
							"other"
						],
						"experimental": true
					},
					{
						"id": "Response",
						"type": "object",
						"description": "HTTP response data.",
						"properties": [
							{
								"name": "url",
								"type": "string",
								"description": "Response URL. This URL can be different from CachedResource.url in case of redirect."
							},
							{
								"name": "status",
								"type": "number",
								"description": "HTTP response status code."
							},
							{
								"name": "statusText",
								"type": "string",
								"description": "HTTP response status text."
							},
							{
								"name": "headers",
								"$ref": "Headers",
								"description": "HTTP response headers."
							},
							{
								"name": "headersText",
								"type": "string",
								"optional": true,
								"description": "HTTP response headers text."
							},
							{
								"name": "mimeType",
								"type": "string",
								"description": "Resource mimeType as determined by the browser."
							},
							{
								"name": "requestHeaders",
								"$ref": "Headers",
								"optional": true,
								"description": "Refined HTTP request headers that were actually transmitted over the network."
							},
							{
								"name": "requestHeadersText",
								"type": "string",
								"optional": true,
								"description": "HTTP request headers text."
							},
							{
								"name": "connectionReused",
								"type": "boolean",
								"description": "Specifies whether physical connection was actually reused for this request."
							},
							{
								"name": "connectionId",
								"type": "number",
								"description": "Physical connection id that was actually used for this request."
							},
							{
								"name": "remoteIPAddress",
								"type": "string",
								"optional": true,
								"experimental": true,
								"description": "Remote IP address."
							},
							{
								"name": "remotePort",
								"type": "integer",
								"optional": true,
								"experimental": true,
								"description": "Remote port."
							},
							{
								"name": "fromDiskCache",
								"type": "boolean",
								"optional": true,
								"description": "Specifies that the request was served from the disk cache."
							},
							{
								"name": "fromServiceWorker",
								"type": "boolean",
								"optional": true,
								"description": "Specifies that the request was served from the ServiceWorker."
							},
							{
								"name": "encodedDataLength",
								"type": "number",
								"optional": false,
								"description": "Total number of bytes received for this request so far."
							},
							{
								"name": "timing",
								"$ref": "ResourceTiming",
								"optional": true,
								"description": "Timing information for the given request."
							},
							{
								"name": "protocol",
								"type": "string",
								"optional": true,
								"description": "Protocol used to fetch this request."
							},
							{
								"name": "securityState",
								"$ref": "Security.SecurityState",
								"description": "Security state of the request resource."
							},
							{
								"name": "securityDetails",
								"$ref": "SecurityDetails",
								"optional": true,
								"description": "Security details for the request."
							}
						]
					},
					{
						"id": "WebSocketRequest",
						"type": "object",
						"description": "WebSocket request data.",
						"experimental": true,
						"properties": [
							{
								"name": "headers",
								"$ref": "Headers",
								"description": "HTTP request headers."
							}
						]
					},
					{
						"id": "WebSocketResponse",
						"type": "object",
						"description": "WebSocket response data.",
						"experimental": true,
						"properties": [
							{
								"name": "status",
								"type": "number",
								"description": "HTTP response status code."
							},
							{
								"name": "statusText",
								"type": "string",
								"description": "HTTP response status text."
							},
							{
								"name": "headers",
								"$ref": "Headers",
								"description": "HTTP response headers."
							},
							{
								"name": "headersText",
								"type": "string",
								"optional": true,
								"description": "HTTP response headers text."
							},
							{
								"name": "requestHeaders",
								"$ref": "Headers",
								"optional": true,
								"description": "HTTP request headers."
							},
							{
								"name": "requestHeadersText",
								"type": "string",
								"optional": true,
								"description": "HTTP request headers text."
							}
						]
					},
					{
						"id": "WebSocketFrame",
						"type": "object",
						"description": "WebSocket frame data.",
						"experimental": true,
						"properties": [
							{
								"name": "opcode",
								"type": "number",
								"description": "WebSocket frame opcode."
							},
							{
								"name": "mask",
								"type": "boolean",
								"description": "WebSocke frame mask."
							},
							{
								"name": "payloadData",
								"type": "string",
								"description": "WebSocke frame payload data."
							}
						]
					},
					{
						"id": "CachedResource",
						"type": "object",
						"description": "Information about the cached resource.",
						"properties": [
							{
								"name": "url",
								"type": "string",
								"description": "Resource URL. This is the url of the original network request."
							},
							{
								"name": "type",
								"$ref": "Page.ResourceType",
								"description": "Type of this resource."
							},
							{
								"name": "response",
								"$ref": "Response",
								"optional": true,
								"description": "Cached response data."
							},
							{
								"name": "bodySize",
								"type": "number",
								"description": "Cached response body size."
							}
						]
					},
					{
						"id": "Initiator",
						"type": "object",
						"description": "Information about the request initiator.",
						"properties": [
							{
								"name": "type",
								"type": "string",
								"enum": [
									"parser",
									"script",
									"other"
								],
								"description": "Type of this initiator."
							},
							{
								"name": "stack",
								"$ref": "Runtime.StackTrace",
								"optional": true,
								"description": "Initiator JavaScript stack trace, set for Script only."
							},
							{
								"name": "url",
								"type": "string",
								"optional": true,
								"description": "Initiator URL, set for Parser type only."
							},
							{
								"name": "lineNumber",
								"type": "number",
								"optional": true,
								"description": "Initiator line number, set for Parser type only (0-based)."
							}
						]
					},
					{
						"id": "Cookie",
						"type": "object",
						"description": "Cookie object",
						"properties": [
							{
								"name": "name",
								"type": "string",
								"description": "Cookie name."
							},
							{
								"name": "value",
								"type": "string",
								"description": "Cookie value."
							},
							{
								"name": "domain",
								"type": "string",
								"description": "Cookie domain."
							},
							{
								"name": "path",
								"type": "string",
								"description": "Cookie path."
							},
							{
								"name": "expires",
								"type": "number",
								"description": "Cookie expiration date as the number of seconds since the UNIX epoch."
							},
							{
								"name": "size",
								"type": "integer",
								"description": "Cookie size."
							},
							{
								"name": "httpOnly",
								"type": "boolean",
								"description": "True if cookie is http-only."
							},
							{
								"name": "secure",
								"type": "boolean",
								"description": "True if cookie is secure."
							},
							{
								"name": "session",
								"type": "boolean",
								"description": "True in case of session cookie."
							},
							{
								"name": "sameSite",
								"$ref": "CookieSameSite",
								"optional": true,
								"description": "Cookie SameSite type."
							}
						],
						"experimental": true
					}
				],
				"commands": [
					{
						"name": "enable",
						"description": "Enables network tracking, network events will now be delivered to the client.",
						"parameters": [
							{
								"name": "maxTotalBufferSize",
								"type": "integer",
								"optional": true,
								"experimental": true,
								"description": "Buffer size in bytes to use when preserving network payloads (XHRs, etc)."
							},
							{
								"name": "maxResourceBufferSize",
								"type": "integer",
								"optional": true,
								"experimental": true,
								"description": "Per-resource buffer size in bytes to use when preserving network payloads (XHRs, etc)."
							}
						]
					},
					{
						"name": "disable",
						"description": "Disables network tracking, prevents network events from being sent to the client."
					},
					{
						"name": "setUserAgentOverride",
						"description": "Allows overriding user agent with the given string.",
						"parameters": [
							{
								"name": "userAgent",
								"type": "string",
								"description": "User agent to use."
							}
						]
					},
					{
						"name": "setExtraHTTPHeaders",
						"description": "Specifies whether to always send extra HTTP headers with the requests from this page.",
						"parameters": [
							{
								"name": "headers",
								"$ref": "Headers",
								"description": "Map with extra HTTP headers."
							}
						]
					},
					{
						"name": "getResponseBody",
						"description": "Returns content served for the given request.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Identifier of the network request to get content for."
							}
						],
						"returns": [
							{
								"name": "body",
								"type": "string",
								"description": "Response body."
							},
							{
								"name": "base64Encoded",
								"type": "boolean",
								"description": "True, if content was sent as base64."
							}
						]
					},
					{
						"name": "addBlockedURL",
						"description": "Blocks specific URL from loading.",
						"parameters": [
							{
								"name": "url",
								"type": "string",
								"description": "URL to block."
							}
						],
						"experimental": true
					},
					{
						"name": "removeBlockedURL",
						"description": "Cancels blocking of a specific URL from loading.",
						"parameters": [
							{
								"name": "url",
								"type": "string",
								"description": "URL to stop blocking."
							}
						],
						"experimental": true
					},
					{
						"name": "replayXHR",
						"description": "This method sends a new XMLHttpRequest which is identical to the original one. The following parameters should be identical: method, url, async, request body, extra headers, withCredentials attribute, user, password.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Identifier of XHR to replay."
							}
						],
						"experimental": true
					},
					{
						"name": "setMonitoringXHREnabled",
						"parameters": [
							{
								"name": "enabled",
								"type": "boolean",
								"description": "Monitoring enabled state."
							}
						],
						"description": "Toggles monitoring of XMLHttpRequest. If <code>true</code>, console will receive messages upon each XHR issued.",
						"experimental": true
					},
					{
						"name": "canClearBrowserCache",
						"description": "Tells whether clearing browser cache is supported.",
						"returns": [
							{
								"name": "result",
								"type": "boolean",
								"description": "True if browser cache can be cleared."
							}
						]
					},
					{
						"name": "clearBrowserCache",
						"description": "Clears browser cache."
					},
					{
						"name": "canClearBrowserCookies",
						"description": "Tells whether clearing browser cookies is supported.",
						"returns": [
							{
								"name": "result",
								"type": "boolean",
								"description": "True if browser cookies can be cleared."
							}
						]
					},
					{
						"name": "clearBrowserCookies",
						"description": "Clears browser cookies."
					},
					{
						"name": "getCookies",
						"returns": [
							{
								"name": "cookies",
								"type": "array",
								"items": {
									"$ref": "Cookie"
								},
								"description": "Array of cookie objects."
							}
						],
						"description": "Returns all browser cookies for the current URL. Depending on the backend support, will return detailed cookie information in the <code>cookies</code> field.",
						"experimental": true
					},
					{
						"name": "getAllCookies",
						"returns": [
							{
								"name": "cookies",
								"type": "array",
								"items": {
									"$ref": "Cookie"
								},
								"description": "Array of cookie objects."
							}
						],
						"description": "Returns all browser cookies. Depending on the backend support, will return detailed cookie information in the <code>cookies</code> field.",
						"experimental": true
					},
					{
						"name": "deleteCookie",
						"parameters": [
							{
								"name": "cookieName",
								"type": "string",
								"description": "Name of the cookie to remove."
							},
							{
								"name": "url",
								"type": "string",
								"description": "URL to match cooke domain and path."
							}
						],
						"description": "Deletes browser cookie with given name, domain and path.",
						"experimental": true
					},
					{
						"name": "setCookie",
						"parameters": [
							{
								"name": "url",
								"type": "string",
								"description": "The request-URI to associate with the setting of the cookie. This value can affect the default domain and path values of the created cookie."
							},
							{
								"name": "name",
								"type": "string",
								"description": "The name of the cookie."
							},
							{
								"name": "value",
								"type": "string",
								"description": "The value of the cookie."
							},
							{
								"name": "domain",
								"type": "string",
								"optional": true,
								"description": "If omitted, the cookie becomes a host-only cookie."
							},
							{
								"name": "path",
								"type": "string",
								"optional": true,
								"description": "Defaults to the path portion of the url parameter."
							},
							{
								"name": "secure",
								"type": "boolean",
								"optional": true,
								"description": "Defaults ot false."
							},
							{
								"name": "httpOnly",
								"type": "boolean",
								"optional": true,
								"description": "Defaults to false."
							},
							{
								"name": "sameSite",
								"$ref": "CookieSameSite",
								"optional": true,
								"description": "Defaults to browser default behavior."
							},
							{
								"name": "expirationDate",
								"$ref": "Timestamp",
								"optional": true,
								"description": "If omitted, the cookie becomes a session cookie."
							}
						],
						"returns": [
							{
								"name": "success",
								"type": "boolean",
								"description": "True if successfully set cookie."
							}
						],
						"description": "Sets a cookie with the given cookie data; may overwrite equivalent cookies if they exist.",
						"experimental": true
					},
					{
						"name": "canEmulateNetworkConditions",
						"description": "Tells whether emulation of network conditions is supported.",
						"returns": [
							{
								"name": "result",
								"type": "boolean",
								"description": "True if emulation of network conditions is supported."
							}
						],
						"experimental": true
					},
					{
						"name": "emulateNetworkConditions",
						"description": "Activates emulation of network conditions.",
						"parameters": [
							{
								"name": "offline",
								"type": "boolean",
								"description": "True to emulate internet disconnection."
							},
							{
								"name": "latency",
								"type": "number",
								"description": "Additional latency (ms)."
							},
							{
								"name": "downloadThroughput",
								"type": "number",
								"description": "Maximal aggregated download throughput."
							},
							{
								"name": "uploadThroughput",
								"type": "number",
								"description": "Maximal aggregated upload throughput."
							},
							{
								"name": "connectionType",
								"$ref": "ConnectionType",
								"optional": true,
								"description": "Connection type if known."
							}
						]
					},
					{
						"name": "setCacheDisabled",
						"parameters": [
							{
								"name": "cacheDisabled",
								"type": "boolean",
								"description": "Cache disabled state."
							}
						],
						"description": "Toggles ignoring cache for each request. If <code>true</code>, cache will not be used."
					},
					{
						"name": "setBypassServiceWorker",
						"parameters": [
							{
								"name": "bypass",
								"type": "boolean",
								"description": "Bypass service worker and load from network."
							}
						],
						"experimental": true,
						"description": "Toggles ignoring of service worker for each request."
					},
					{
						"name": "setDataSizeLimitsForTest",
						"parameters": [
							{
								"name": "maxTotalSize",
								"type": "integer",
								"description": "Maximum total buffer size."
							},
							{
								"name": "maxResourceSize",
								"type": "integer",
								"description": "Maximum per-resource size."
							}
						],
						"description": "For testing.",
						"experimental": true
					},
					{
						"name": "getCertificate",
						"description": "Returns the DER-encoded certificate.",
						"parameters": [
							{
								"name": "origin",
								"type": "string",
								"description": "Origin to get certificate for."
							}
						],
						"returns": [
							{
								"name": "tableNames",
								"type": "array",
								"items": {
									"type": "string"
								}
							}
						],
						"experimental": true
					}
				],
				"events": [
					{
						"name": "resourceChangedPriority",
						"description": "Fired when resource loading priority is changed",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "newPriority",
								"$ref": "ResourcePriority",
								"description": "New priority"
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp."
							}
						],
						"experimental": true
					},
					{
						"name": "requestWillBeSent",
						"description": "Fired when page is about to send HTTP request.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "frameId",
								"$ref": "Page.FrameId",
								"description": "Frame identifier.",
								"experimental": true
							},
							{
								"name": "loaderId",
								"$ref": "LoaderId",
								"description": "Loader identifier."
							},
							{
								"name": "documentURL",
								"type": "string",
								"description": "URL of the document this request is loaded for."
							},
							{
								"name": "request",
								"$ref": "Request",
								"description": "Request data."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp."
							},
							{
								"name": "wallTime",
								"$ref": "Timestamp",
								"experimental": true,
								"description": "UTC Timestamp."
							},
							{
								"name": "initiator",
								"$ref": "Initiator",
								"description": "Request initiator."
							},
							{
								"name": "redirectResponse",
								"optional": true,
								"$ref": "Response",
								"description": "Redirect response data."
							},
							{
								"name": "type",
								"$ref": "Page.ResourceType",
								"optional": true,
								"experimental": true,
								"description": "Type of this resource."
							}
						]
					},
					{
						"name": "requestServedFromCache",
						"description": "Fired if request ended up loading from cache.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							}
						]
					},
					{
						"name": "responseReceived",
						"description": "Fired when HTTP response is available.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "frameId",
								"$ref": "Page.FrameId",
								"description": "Frame identifier.",
								"experimental": true
							},
							{
								"name": "loaderId",
								"$ref": "LoaderId",
								"description": "Loader identifier."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp."
							},
							{
								"name": "type",
								"$ref": "Page.ResourceType",
								"description": "Resource type."
							},
							{
								"name": "response",
								"$ref": "Response",
								"description": "Response data."
							}
						]
					},
					{
						"name": "dataReceived",
						"description": "Fired when data chunk was received over the network.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp."
							},
							{
								"name": "dataLength",
								"type": "integer",
								"description": "Data chunk length."
							},
							{
								"name": "encodedDataLength",
								"type": "integer",
								"description": "Actual bytes received (might be less than dataLength for compressed encodings)."
							}
						]
					},
					{
						"name": "loadingFinished",
						"description": "Fired when HTTP request has finished loading.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp."
							},
							{
								"name": "encodedDataLength",
								"type": "number",
								"description": "Total number of bytes received for this request."
							}
						]
					},
					{
						"name": "loadingFailed",
						"description": "Fired when HTTP request has failed to load.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp."
							},
							{
								"name": "type",
								"$ref": "Page.ResourceType",
								"description": "Resource type."
							},
							{
								"name": "errorText",
								"type": "string",
								"description": "User friendly error message."
							},
							{
								"name": "canceled",
								"type": "boolean",
								"optional": true,
								"description": "True if loading was canceled."
							},
							{
								"name": "blockedReason",
								"$ref": "BlockedReason",
								"optional": true,
								"description": "The reason why loading was blocked, if any.",
								"experimental": true
							}
						]
					},
					{
						"name": "webSocketWillSendHandshakeRequest",
						"description": "Fired when WebSocket is about to initiate handshake.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp."
							},
							{
								"name": "wallTime",
								"$ref": "Timestamp",
								"experimental": true,
								"description": "UTC Timestamp."
							},
							{
								"name": "request",
								"$ref": "WebSocketRequest",
								"description": "WebSocket request data."
							}
						],
						"experimental": true
					},
					{
						"name": "webSocketHandshakeResponseReceived",
						"description": "Fired when WebSocket handshake response becomes available.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp."
							},
							{
								"name": "response",
								"$ref": "WebSocketResponse",
								"description": "WebSocket response data."
							}
						],
						"experimental": true
					},
					{
						"name": "webSocketCreated",
						"description": "Fired upon WebSocket creation.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "url",
								"type": "string",
								"description": "WebSocket request URL."
							},
							{
								"name": "initiator",
								"$ref": "Initiator",
								"optional": true,
								"description": "Request initiator."
							}
						],
						"experimental": true
					},
					{
						"name": "webSocketClosed",
						"description": "Fired when WebSocket is closed.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp."
							}
						],
						"experimental": true
					},
					{
						"name": "webSocketFrameReceived",
						"description": "Fired when WebSocket frame is received.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp."
							},
							{
								"name": "response",
								"$ref": "WebSocketFrame",
								"description": "WebSocket response data."
							}
						],
						"experimental": true
					},
					{
						"name": "webSocketFrameError",
						"description": "Fired when WebSocket frame error occurs.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp."
							},
							{
								"name": "errorMessage",
								"type": "string",
								"description": "WebSocket frame error message."
							}
						],
						"experimental": true
					},
					{
						"name": "webSocketFrameSent",
						"description": "Fired when WebSocket frame is sent.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp."
							},
							{
								"name": "response",
								"$ref": "WebSocketFrame",
								"description": "WebSocket response data."
							}
						],
						"experimental": true
					},
					{
						"name": "eventSourceMessageReceived",
						"description": "Fired when EventSource message is received.",
						"parameters": [
							{
								"name": "requestId",
								"$ref": "RequestId",
								"description": "Request identifier."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp."
							},
							{
								"name": "eventName",
								"type": "string",
								"description": "Message type."
							},
							{
								"name": "eventId",
								"type": "string",
								"description": "Message identifier."
							},
							{
								"name": "data",
								"type": "string",
								"description": "Message content."
							}
						],
						"experimental": true
					}
				]
			},
			{
				"domain": "Database",
				"experimental": true,
				"types": [
					{
						"id": "DatabaseId",
						"type": "string",
						"description": "Unique identifier of Database object.",
						"experimental": true
					},
					{
						"id": "Database",
						"type": "object",
						"description": "Database object.",
						"experimental": true,
						"properties": [
							{
								"name": "id",
								"$ref": "DatabaseId",
								"description": "Database ID."
							},
							{
								"name": "domain",
								"type": "string",
								"description": "Database domain."
							},
							{
								"name": "name",
								"type": "string",
								"description": "Database name."
							},
							{
								"name": "version",
								"type": "string",
								"description": "Database version."
							}
						]
					},
					{
						"id": "Error",
						"type": "object",
						"description": "Database error.",
						"properties": [
							{
								"name": "message",
								"type": "string",
								"description": "Error message."
							},
							{
								"name": "code",
								"type": "integer",
								"description": "Error code."
							}
						]
					}
				],
				"commands": [
					{
						"name": "enable",
						"description": "Enables database tracking, database events will now be delivered to the client."
					},
					{
						"name": "disable",
						"description": "Disables database tracking, prevents database events from being sent to the client."
					},
					{
						"name": "getDatabaseTableNames",
						"parameters": [
							{
								"name": "databaseId",
								"$ref": "DatabaseId"
							}
						],
						"returns": [
							{
								"name": "tableNames",
								"type": "array",
								"items": {
									"type": "string"
								}
							}
						]
					},
					{
						"name": "executeSQL",
						"parameters": [
							{
								"name": "databaseId",
								"$ref": "DatabaseId"
							},
							{
								"name": "query",
								"type": "string"
							}
						],
						"returns": [
							{
								"name": "columnNames",
								"type": "array",
								"optional": true,
								"items": {
									"type": "string"
								}
							},
							{
								"name": "values",
								"type": "array",
								"optional": true,
								"items": {
									"type": "any"
								}
							},
							{
								"name": "sqlError",
								"$ref": "Error",
								"optional": true
							}
						]
					}
				],
				"events": [
					{
						"name": "addDatabase",
						"parameters": [
							{
								"name": "database",
								"$ref": "Database"
							}
						]
					}
				]
			},
			{
				"domain": "IndexedDB",
				"dependencies": [
					"Runtime"
				],
				"experimental": true,
				"types": [
					{
						"id": "DatabaseWithObjectStores",
						"type": "object",
						"description": "Database with an array of object stores.",
						"properties": [
							{
								"name": "name",
								"type": "string",
								"description": "Database name."
							},
							{
								"name": "version",
								"type": "integer",
								"description": "Database version."
							},
							{
								"name": "objectStores",
								"type": "array",
								"items": {
									"$ref": "ObjectStore"
								},
								"description": "Object stores in this database."
							}
						]
					},
					{
						"id": "ObjectStore",
						"type": "object",
						"description": "Object store.",
						"properties": [
							{
								"name": "name",
								"type": "string",
								"description": "Object store name."
							},
							{
								"name": "keyPath",
								"$ref": "KeyPath",
								"description": "Object store key path."
							},
							{
								"name": "autoIncrement",
								"type": "boolean",
								"description": "If true, object store has auto increment flag set."
							},
							{
								"name": "indexes",
								"type": "array",
								"items": {
									"$ref": "ObjectStoreIndex"
								},
								"description": "Indexes in this object store."
							}
						]
					},
					{
						"id": "ObjectStoreIndex",
						"type": "object",
						"description": "Object store index.",
						"properties": [
							{
								"name": "name",
								"type": "string",
								"description": "Index name."
							},
							{
								"name": "keyPath",
								"$ref": "KeyPath",
								"description": "Index key path."
							},
							{
								"name": "unique",
								"type": "boolean",
								"description": "If true, index is unique."
							},
							{
								"name": "multiEntry",
								"type": "boolean",
								"description": "If true, index allows multiple entries for a key."
							}
						]
					},
					{
						"id": "Key",
						"type": "object",
						"description": "Key.",
						"properties": [
							{
								"name": "type",
								"type": "string",
								"enum": [
									"number",
									"string",
									"date",
									"array"
								],
								"description": "Key type."
							},
							{
								"name": "number",
								"type": "number",
								"optional": true,
								"description": "Number value."
							},
							{
								"name": "string",
								"type": "string",
								"optional": true,
								"description": "String value."
							},
							{
								"name": "date",
								"type": "number",
								"optional": true,
								"description": "Date value."
							},
							{
								"name": "array",
								"type": "array",
								"optional": true,
								"items": {
									"$ref": "Key"
								},
								"description": "Array value."
							}
						]
					},
					{
						"id": "KeyRange",
						"type": "object",
						"description": "Key range.",
						"properties": [
							{
								"name": "lower",
								"$ref": "Key",
								"optional": true,
								"description": "Lower bound."
							},
							{
								"name": "upper",
								"$ref": "Key",
								"optional": true,
								"description": "Upper bound."
							},
							{
								"name": "lowerOpen",
								"type": "boolean",
								"description": "If true lower bound is open."
							},
							{
								"name": "upperOpen",
								"type": "boolean",
								"description": "If true upper bound is open."
							}
						]
					},
					{
						"id": "DataEntry",
						"type": "object",
						"description": "Data entry.",
						"properties": [
							{
								"name": "key",
								"$ref": "Runtime.RemoteObject",
								"description": "Key object."
							},
							{
								"name": "primaryKey",
								"$ref": "Runtime.RemoteObject",
								"description": "Primary key object."
							},
							{
								"name": "value",
								"$ref": "Runtime.RemoteObject",
								"description": "Value object."
							}
						]
					},
					{
						"id": "KeyPath",
						"type": "object",
						"description": "Key path.",
						"properties": [
							{
								"name": "type",
								"type": "string",
								"enum": [
									"null",
									"string",
									"array"
								],
								"description": "Key path type."
							},
							{
								"name": "string",
								"type": "string",
								"optional": true,
								"description": "String value."
							},
							{
								"name": "array",
								"type": "array",
								"optional": true,
								"items": {
									"type": "string"
								},
								"description": "Array value."
							}
						]
					}
				],
				"commands": [
					{
						"name": "enable",
						"description": "Enables events from backend."
					},
					{
						"name": "disable",
						"description": "Disables events from backend."
					},
					{
						"name": "requestDatabaseNames",
						"parameters": [
							{
								"name": "securityOrigin",
								"type": "string",
								"description": "Security origin."
							}
						],
						"returns": [
							{
								"name": "databaseNames",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "Database names for origin."
							}
						],
						"description": "Requests database names for given security origin."
					},
					{
						"name": "requestDatabase",
						"parameters": [
							{
								"name": "securityOrigin",
								"type": "string",
								"description": "Security origin."
							},
							{
								"name": "databaseName",
								"type": "string",
								"description": "Database name."
							}
						],
						"returns": [
							{
								"name": "databaseWithObjectStores",
								"$ref": "DatabaseWithObjectStores",
								"description": "Database with an array of object stores."
							}
						],
						"description": "Requests database with given name in given frame."
					},
					{
						"name": "requestData",
						"parameters": [
							{
								"name": "securityOrigin",
								"type": "string",
								"description": "Security origin."
							},
							{
								"name": "databaseName",
								"type": "string",
								"description": "Database name."
							},
							{
								"name": "objectStoreName",
								"type": "string",
								"description": "Object store name."
							},
							{
								"name": "indexName",
								"type": "string",
								"description": "Index name, empty string for object store data requests."
							},
							{
								"name": "skipCount",
								"type": "integer",
								"description": "Number of records to skip."
							},
							{
								"name": "pageSize",
								"type": "integer",
								"description": "Number of records to fetch."
							},
							{
								"name": "keyRange",
								"$ref": "KeyRange",
								"optional": true,
								"description": "Key range."
							}
						],
						"returns": [
							{
								"name": "objectStoreDataEntries",
								"type": "array",
								"items": {
									"$ref": "DataEntry"
								},
								"description": "Array of object store data entries."
							},
							{
								"name": "hasMore",
								"type": "boolean",
								"description": "If true, there are more entries to fetch in the given range."
							}
						],
						"description": "Requests data from object store or index."
					},
					{
						"name": "clearObjectStore",
						"parameters": [
							{
								"name": "securityOrigin",
								"type": "string",
								"description": "Security origin."
							},
							{
								"name": "databaseName",
								"type": "string",
								"description": "Database name."
							},
							{
								"name": "objectStoreName",
								"type": "string",
								"description": "Object store name."
							}
						],
						"returns": [],
						"description": "Clears all entries from an object store."
					}
				]
			},
			{
				"domain": "CacheStorage",
				"experimental": true,
				"types": [
					{
						"id": "CacheId",
						"type": "string",
						"description": "Unique identifier of the Cache object."
					},
					{
						"id": "DataEntry",
						"type": "object",
						"description": "Data entry.",
						"properties": [
							{
								"name": "request",
								"type": "string",
								"description": "Request url spec."
							},
							{
								"name": "response",
								"type": "string",
								"description": "Response stataus text."
							}
						]
					},
					{
						"id": "Cache",
						"type": "object",
						"description": "Cache identifier.",
						"properties": [
							{
								"name": "cacheId",
								"$ref": "CacheId",
								"description": "An opaque unique id of the cache."
							},
							{
								"name": "securityOrigin",
								"type": "string",
								"description": "Security origin of the cache."
							},
							{
								"name": "cacheName",
								"type": "string",
								"description": "The name of the cache."
							}
						]
					}
				],
				"commands": [
					{
						"name": "requestCacheNames",
						"parameters": [
							{
								"name": "securityOrigin",
								"type": "string",
								"description": "Security origin."
							}
						],
						"returns": [
							{
								"name": "caches",
								"type": "array",
								"items": {
									"$ref": "Cache"
								},
								"description": "Caches for the security origin."
							}
						],
						"description": "Requests cache names."
					},
					{
						"name": "requestEntries",
						"parameters": [
							{
								"name": "cacheId",
								"$ref": "CacheId",
								"description": "ID of cache to get entries from."
							},
							{
								"name": "skipCount",
								"type": "integer",
								"description": "Number of records to skip."
							},
							{
								"name": "pageSize",
								"type": "integer",
								"description": "Number of records to fetch."
							}
						],
						"returns": [
							{
								"name": "cacheDataEntries",
								"type": "array",
								"items": {
									"$ref": "DataEntry"
								},
								"description": "Array of object store data entries."
							},
							{
								"name": "hasMore",
								"type": "boolean",
								"description": "If true, there are more entries to fetch in the given range."
							}
						],
						"description": "Requests data from cache."
					},
					{
						"name": "deleteCache",
						"parameters": [
							{
								"name": "cacheId",
								"$ref": "CacheId",
								"description": "Id of cache for deletion."
							}
						],
						"description": "Deletes a cache."
					},
					{
						"name": "deleteEntry",
						"parameters": [
							{
								"name": "cacheId",
								"$ref": "CacheId",
								"description": "Id of cache where the entry will be deleted."
							},
							{
								"name": "request",
								"type": "string",
								"description": "URL spec of the request."
							}
						],
						"description": "Deletes a cache entry."
					}
				]
			},
			{
				"domain": "DOMStorage",
				"experimental": true,
				"description": "Query and modify DOM storage.",
				"types": [
					{
						"id": "StorageId",
						"type": "object",
						"description": "DOM Storage identifier.",
						"experimental": true,
						"properties": [
							{
								"name": "securityOrigin",
								"type": "string",
								"description": "Security origin for the storage."
							},
							{
								"name": "isLocalStorage",
								"type": "boolean",
								"description": "Whether the storage is local storage (not session storage)."
							}
						]
					},
					{
						"id": "Item",
						"type": "array",
						"description": "DOM Storage item.",
						"experimental": true,
						"items": {
							"type": "string"
						}
					}
				],
				"commands": [
					{
						"name": "enable",
						"description": "Enables storage tracking, storage events will now be delivered to the client."
					},
					{
						"name": "disable",
						"description": "Disables storage tracking, prevents storage events from being sent to the client."
					},
					{
						"name": "getDOMStorageItems",
						"parameters": [
							{
								"name": "storageId",
								"$ref": "StorageId"
							}
						],
						"returns": [
							{
								"name": "entries",
								"type": "array",
								"items": {
									"$ref": "Item"
								}
							}
						]
					},
					{
						"name": "setDOMStorageItem",
						"parameters": [
							{
								"name": "storageId",
								"$ref": "StorageId"
							},
							{
								"name": "key",
								"type": "string"
							},
							{
								"name": "value",
								"type": "string"
							}
						]
					},
					{
						"name": "removeDOMStorageItem",
						"parameters": [
							{
								"name": "storageId",
								"$ref": "StorageId"
							},
							{
								"name": "key",
								"type": "string"
							}
						]
					}
				],
				"events": [
					{
						"name": "domStorageItemsCleared",
						"parameters": [
							{
								"name": "storageId",
								"$ref": "StorageId"
							}
						]
					},
					{
						"name": "domStorageItemRemoved",
						"parameters": [
							{
								"name": "storageId",
								"$ref": "StorageId"
							},
							{
								"name": "key",
								"type": "string"
							}
						]
					},
					{
						"name": "domStorageItemAdded",
						"parameters": [
							{
								"name": "storageId",
								"$ref": "StorageId"
							},
							{
								"name": "key",
								"type": "string"
							},
							{
								"name": "newValue",
								"type": "string"
							}
						]
					},
					{
						"name": "domStorageItemUpdated",
						"parameters": [
							{
								"name": "storageId",
								"$ref": "StorageId"
							},
							{
								"name": "key",
								"type": "string"
							},
							{
								"name": "oldValue",
								"type": "string"
							},
							{
								"name": "newValue",
								"type": "string"
							}
						]
					}
				]
			},
			{
				"domain": "ApplicationCache",
				"experimental": true,
				"types": [
					{
						"id": "ApplicationCacheResource",
						"type": "object",
						"description": "Detailed application cache resource information.",
						"properties": [
							{
								"name": "url",
								"type": "string",
								"description": "Resource url."
							},
							{
								"name": "size",
								"type": "integer",
								"description": "Resource size."
							},
							{
								"name": "type",
								"type": "string",
								"description": "Resource type."
							}
						]
					},
					{
						"id": "ApplicationCache",
						"type": "object",
						"description": "Detailed application cache information.",
						"properties": [
							{
								"name": "manifestURL",
								"type": "string",
								"description": "Manifest URL."
							},
							{
								"name": "size",
								"type": "number",
								"description": "Application cache size."
							},
							{
								"name": "creationTime",
								"type": "number",
								"description": "Application cache creation time."
							},
							{
								"name": "updateTime",
								"type": "number",
								"description": "Application cache update time."
							},
							{
								"name": "resources",
								"type": "array",
								"items": {
									"$ref": "ApplicationCacheResource"
								},
								"description": "Application cache resources."
							}
						]
					},
					{
						"id": "FrameWithManifest",
						"type": "object",
						"description": "Frame identifier - manifest URL pair.",
						"properties": [
							{
								"name": "frameId",
								"$ref": "Page.FrameId",
								"description": "Frame identifier."
							},
							{
								"name": "manifestURL",
								"type": "string",
								"description": "Manifest URL."
							},
							{
								"name": "status",
								"type": "integer",
								"description": "Application cache status."
							}
						]
					}
				],
				"commands": [
					{
						"name": "getFramesWithManifests",
						"returns": [
							{
								"name": "frameIds",
								"type": "array",
								"items": {
									"$ref": "FrameWithManifest"
								},
								"description": "Array of frame identifiers with manifest urls for each frame containing a document associated with some application cache."
							}
						],
						"description": "Returns array of frame identifiers with manifest urls for each frame containing a document associated with some application cache."
					},
					{
						"name": "enable",
						"description": "Enables application cache domain notifications."
					},
					{
						"name": "getManifestForFrame",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "Page.FrameId",
								"description": "Identifier of the frame containing document whose manifest is retrieved."
							}
						],
						"returns": [
							{
								"name": "manifestURL",
								"type": "string",
								"description": "Manifest URL for document in the given frame."
							}
						],
						"description": "Returns manifest URL for document in the given frame."
					},
					{
						"name": "getApplicationCacheForFrame",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "Page.FrameId",
								"description": "Identifier of the frame containing document whose application cache is retrieved."
							}
						],
						"returns": [
							{
								"name": "applicationCache",
								"$ref": "ApplicationCache",
								"description": "Relevant application cache data for the document in given frame."
							}
						],
						"description": "Returns relevant application cache data for the document in given frame."
					}
				],
				"events": [
					{
						"name": "applicationCacheStatusUpdated",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "Page.FrameId",
								"description": "Identifier of the frame containing document whose application cache updated status."
							},
							{
								"name": "manifestURL",
								"type": "string",
								"description": "Manifest URL."
							},
							{
								"name": "status",
								"type": "integer",
								"description": "Updated application cache status."
							}
						]
					},
					{
						"name": "networkStateUpdated",
						"parameters": [
							{
								"name": "isNowOnline",
								"type": "boolean"
							}
						]
					}
				]
			},
			{
				"domain": "DOM",
				"description": "This domain exposes DOM read/write operations. Each DOM Node is represented with its mirror object that has an <code>id</code>. This <code>id</code> can be used to get additional information on the Node, resolve it into the JavaScript object wrapper, etc. It is important that client receives DOM events only for the nodes that are known to the client. Backend keeps track of the nodes that were sent to the client and never sends the same node twice. It is client's responsibility to collect information about the nodes that were sent to the client.<p>Note that <code>iframe</code> owner elements will return corresponding document elements as their child nodes.</p>",
				"dependencies": [
					"Runtime"
				],
				"types": [
					{
						"id": "NodeId",
						"type": "integer",
						"description": "Unique DOM node identifier."
					},
					{
						"id": "BackendNodeId",
						"type": "integer",
						"description": "Unique DOM node identifier used to reference a node that may not have been pushed to the front-end.",
						"experimental": true
					},
					{
						"id": "BackendNode",
						"type": "object",
						"properties": [
							{
								"name": "nodeType",
								"type": "integer",
								"description": "<code>Node</code>'s nodeType."
							},
							{
								"name": "nodeName",
								"type": "string",
								"description": "<code>Node</code>'s nodeName."
							},
							{
								"name": "backendNodeId",
								"$ref": "BackendNodeId"
							}
						],
						"experimental": true,
						"description": "Backend node with a friendly name."
					},
					{
						"id": "PseudoType",
						"type": "string",
						"enum": [
							"first-line",
							"first-letter",
							"before",
							"after",
							"backdrop",
							"selection",
							"first-line-inherited",
							"scrollbar",
							"scrollbar-thumb",
							"scrollbar-button",
							"scrollbar-track",
							"scrollbar-track-piece",
							"scrollbar-corner",
							"resizer",
							"input-list-button"
						],
						"description": "Pseudo element type."
					},
					{
						"id": "ShadowRootType",
						"type": "string",
						"enum": [
							"user-agent",
							"open",
							"closed"
						],
						"description": "Shadow root type."
					},
					{
						"id": "Node",
						"type": "object",
						"properties": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Node identifier that is passed into the rest of the DOM messages as the <code>nodeId</code>. Backend will only push node with given <code>id</code> once. It is aware of all requested nodes and will only fire DOM events for nodes known to the client."
							},
							{
								"name": "backendNodeId",
								"$ref": "BackendNodeId",
								"description": "The BackendNodeId for this node.",
								"experimental": true
							},
							{
								"name": "nodeType",
								"type": "integer",
								"description": "<code>Node</code>'s nodeType."
							},
							{
								"name": "nodeName",
								"type": "string",
								"description": "<code>Node</code>'s nodeName."
							},
							{
								"name": "localName",
								"type": "string",
								"description": "<code>Node</code>'s localName."
							},
							{
								"name": "nodeValue",
								"type": "string",
								"description": "<code>Node</code>'s nodeValue."
							},
							{
								"name": "childNodeCount",
								"type": "integer",
								"optional": true,
								"description": "Child count for <code>Container</code> nodes."
							},
							{
								"name": "children",
								"type": "array",
								"optional": true,
								"items": {
									"$ref": "Node"
								},
								"description": "Child nodes of this node when requested with children."
							},
							{
								"name": "attributes",
								"type": "array",
								"optional": true,
								"items": {
									"type": "string"
								},
								"description": "Attributes of the <code>Element</code> node in the form of flat array <code>[name1, value1, name2, value2]</code>."
							},
							{
								"name": "documentURL",
								"type": "string",
								"optional": true,
								"description": "Document URL that <code>Document</code> or <code>FrameOwner</code> node points to."
							},
							{
								"name": "baseURL",
								"type": "string",
								"optional": true,
								"description": "Base URL that <code>Document</code> or <code>FrameOwner</code> node uses for URL completion.",
								"experimental": true
							},
							{
								"name": "publicId",
								"type": "string",
								"optional": true,
								"description": "<code>DocumentType</code>'s publicId."
							},
							{
								"name": "systemId",
								"type": "string",
								"optional": true,
								"description": "<code>DocumentType</code>'s systemId."
							},
							{
								"name": "internalSubset",
								"type": "string",
								"optional": true,
								"description": "<code>DocumentType</code>'s internalSubset."
							},
							{
								"name": "xmlVersion",
								"type": "string",
								"optional": true,
								"description": "<code>Document</code>'s XML version in case of XML documents."
							},
							{
								"name": "name",
								"type": "string",
								"optional": true,
								"description": "<code>Attr</code>'s name."
							},
							{
								"name": "value",
								"type": "string",
								"optional": true,
								"description": "<code>Attr</code>'s value."
							},
							{
								"name": "pseudoType",
								"$ref": "PseudoType",
								"optional": true,
								"description": "Pseudo element type for this node."
							},
							{
								"name": "shadowRootType",
								"$ref": "ShadowRootType",
								"optional": true,
								"description": "Shadow root type."
							},
							{
								"name": "frameId",
								"$ref": "Page.FrameId",
								"optional": true,
								"description": "Frame ID for frame owner elements.",
								"experimental": true
							},
							{
								"name": "contentDocument",
								"$ref": "Node",
								"optional": true,
								"description": "Content document for frame owner elements."
							},
							{
								"name": "shadowRoots",
								"type": "array",
								"optional": true,
								"items": {
									"$ref": "Node"
								},
								"description": "Shadow root list for given element host.",
								"experimental": true
							},
							{
								"name": "templateContent",
								"$ref": "Node",
								"optional": true,
								"description": "Content document fragment for template elements.",
								"experimental": true
							},
							{
								"name": "pseudoElements",
								"type": "array",
								"items": {
									"$ref": "Node"
								},
								"optional": true,
								"description": "Pseudo elements associated with this node.",
								"experimental": true
							},
							{
								"name": "importedDocument",
								"$ref": "Node",
								"optional": true,
								"description": "Import document for the HTMLImport links."
							},
							{
								"name": "distributedNodes",
								"type": "array",
								"items": {
									"$ref": "BackendNode"
								},
								"optional": true,
								"description": "Distributed nodes for given insertion point.",
								"experimental": true
							},
							{
								"name": "isSVG",
								"type": "boolean",
								"optional": true,
								"description": "Whether the node is SVG.",
								"experimental": true
							}
						],
						"description": "DOM interaction is implemented in terms of mirror objects that represent the actual DOM nodes. DOMNode is a base node mirror type."
					},
					{
						"id": "RGBA",
						"type": "object",
						"properties": [
							{
								"name": "r",
								"type": "integer",
								"description": "The red component, in the [0-255] range."
							},
							{
								"name": "g",
								"type": "integer",
								"description": "The green component, in the [0-255] range."
							},
							{
								"name": "b",
								"type": "integer",
								"description": "The blue component, in the [0-255] range."
							},
							{
								"name": "a",
								"type": "number",
								"optional": true,
								"description": "The alpha component, in the [0-1] range (default: 1)."
							}
						],
						"description": "A structure holding an RGBA color."
					},
					{
						"id": "Quad",
						"type": "array",
						"items": {
							"type": "number"
						},
						"minItems": 8,
						"maxItems": 8,
						"description": "An array of quad vertices, x immediately followed by y for each point, points clock-wise.",
						"experimental": true
					},
					{
						"id": "BoxModel",
						"type": "object",
						"experimental": true,
						"properties": [
							{
								"name": "content",
								"$ref": "Quad",
								"description": "Content box"
							},
							{
								"name": "padding",
								"$ref": "Quad",
								"description": "Padding box"
							},
							{
								"name": "border",
								"$ref": "Quad",
								"description": "Border box"
							},
							{
								"name": "margin",
								"$ref": "Quad",
								"description": "Margin box"
							},
							{
								"name": "width",
								"type": "integer",
								"description": "Node width"
							},
							{
								"name": "height",
								"type": "integer",
								"description": "Node height"
							},
							{
								"name": "shapeOutside",
								"$ref": "ShapeOutsideInfo",
								"optional": true,
								"description": "Shape outside coordinates"
							}
						],
						"description": "Box model."
					},
					{
						"id": "ShapeOutsideInfo",
						"type": "object",
						"experimental": true,
						"properties": [
							{
								"name": "bounds",
								"$ref": "Quad",
								"description": "Shape bounds"
							},
							{
								"name": "shape",
								"type": "array",
								"items": {
									"type": "any"
								},
								"description": "Shape coordinate details"
							},
							{
								"name": "marginShape",
								"type": "array",
								"items": {
									"type": "any"
								},
								"description": "Margin shape bounds"
							}
						],
						"description": "CSS Shape Outside details."
					},
					{
						"id": "Rect",
						"type": "object",
						"experimental": true,
						"properties": [
							{
								"name": "x",
								"type": "number",
								"description": "X coordinate"
							},
							{
								"name": "y",
								"type": "number",
								"description": "Y coordinate"
							},
							{
								"name": "width",
								"type": "number",
								"description": "Rectangle width"
							},
							{
								"name": "height",
								"type": "number",
								"description": "Rectangle height"
							}
						],
						"description": "Rectangle."
					},
					{
						"id": "HighlightConfig",
						"type": "object",
						"properties": [
							{
								"name": "showInfo",
								"type": "boolean",
								"optional": true,
								"description": "Whether the node info tooltip should be shown (default: false)."
							},
							{
								"name": "showRulers",
								"type": "boolean",
								"optional": true,
								"description": "Whether the rulers should be shown (default: false)."
							},
							{
								"name": "showExtensionLines",
								"type": "boolean",
								"optional": true,
								"description": "Whether the extension lines from node to the rulers should be shown (default: false)."
							},
							{
								"name": "displayAsMaterial",
								"type": "boolean",
								"optional": true,
								"experimental": true
							},
							{
								"name": "contentColor",
								"$ref": "RGBA",
								"optional": true,
								"description": "The content box highlight fill color (default: transparent)."
							},
							{
								"name": "paddingColor",
								"$ref": "RGBA",
								"optional": true,
								"description": "The padding highlight fill color (default: transparent)."
							},
							{
								"name": "borderColor",
								"$ref": "RGBA",
								"optional": true,
								"description": "The border highlight fill color (default: transparent)."
							},
							{
								"name": "marginColor",
								"$ref": "RGBA",
								"optional": true,
								"description": "The margin highlight fill color (default: transparent)."
							},
							{
								"name": "eventTargetColor",
								"$ref": "RGBA",
								"optional": true,
								"experimental": true,
								"description": "The event target element highlight fill color (default: transparent)."
							},
							{
								"name": "shapeColor",
								"$ref": "RGBA",
								"optional": true,
								"experimental": true,
								"description": "The shape outside fill color (default: transparent)."
							},
							{
								"name": "shapeMarginColor",
								"$ref": "RGBA",
								"optional": true,
								"experimental": true,
								"description": "The shape margin fill color (default: transparent)."
							},
							{
								"name": "selectorList",
								"type": "string",
								"optional": true,
								"description": "Selectors to highlight relevant nodes."
							}
						],
						"description": "Configuration data for the highlighting of page elements."
					},
					{
						"id": "InspectMode",
						"type": "string",
						"experimental": true,
						"enum": [
							"searchForNode",
							"searchForUAShadowDOM",
							"none"
						]
					}
				],
				"commands": [
					{
						"name": "enable",
						"description": "Enables DOM agent for the given page."
					},
					{
						"name": "disable",
						"description": "Disables DOM agent for the given page."
					},
					{
						"name": "getDocument",
						"parameters": [
							{
								"name": "depth",
								"type": "integer",
								"optional": true,
								"description": "The maximum depth at which children should be retrieved, defaults to 1. Use -1 for the entire subtree or provide an integer larger than 0.",
								"experimental": true
							},
							{
								"name": "pierce",
								"type": "boolean",
								"optional": true,
								"description": "Whether or not iframes and shadow roots should be traversed when returning the subtree (default is false).",
								"experimental": true
							}
						],
						"returns": [
							{
								"name": "root",
								"$ref": "Node",
								"description": "Resulting node."
							}
						],
						"description": "Returns the root DOM node (and optionally the subtree) to the caller."
					},
					{
						"name": "collectClassNamesFromSubtree",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to collect class names."
							}
						],
						"returns": [
							{
								"name": "classNames",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "Class name list."
							}
						],
						"description": "Collects class names for the node with given id and all of it's child nodes.",
						"experimental": true
					},
					{
						"name": "requestChildNodes",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to get children for."
							},
							{
								"name": "depth",
								"type": "integer",
								"optional": true,
								"description": "The maximum depth at which children should be retrieved, defaults to 1. Use -1 for the entire subtree or provide an integer larger than 0.",
								"experimental": true
							},
							{
								"name": "pierce",
								"type": "boolean",
								"optional": true,
								"description": "Whether or not iframes and shadow roots should be traversed when returning the sub-tree (default is false).",
								"experimental": true
							}
						],
						"description": "Requests that children of the node with given id are returned to the caller in form of <code>setChildNodes</code> events where not only immediate children are retrieved, but all children down to the specified depth."
					},
					{
						"name": "querySelector",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to query upon."
							},
							{
								"name": "selector",
								"type": "string",
								"description": "Selector string."
							}
						],
						"returns": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Query selector result."
							}
						],
						"description": "Executes <code>querySelector</code> on a given node."
					},
					{
						"name": "querySelectorAll",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to query upon."
							},
							{
								"name": "selector",
								"type": "string",
								"description": "Selector string."
							}
						],
						"returns": [
							{
								"name": "nodeIds",
								"type": "array",
								"items": {
									"$ref": "NodeId"
								},
								"description": "Query selector result."
							}
						],
						"description": "Executes <code>querySelectorAll</code> on a given node."
					},
					{
						"name": "setNodeName",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to set name for."
							},
							{
								"name": "name",
								"type": "string",
								"description": "New node's name."
							}
						],
						"returns": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "New node's id."
							}
						],
						"description": "Sets node name for a node with given id."
					},
					{
						"name": "setNodeValue",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to set value for."
							},
							{
								"name": "value",
								"type": "string",
								"description": "New node's value."
							}
						],
						"description": "Sets node value for a node with given id."
					},
					{
						"name": "removeNode",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to remove."
							}
						],
						"description": "Removes node with given id."
					},
					{
						"name": "setAttributeValue",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the element to set attribute for."
							},
							{
								"name": "name",
								"type": "string",
								"description": "Attribute name."
							},
							{
								"name": "value",
								"type": "string",
								"description": "Attribute value."
							}
						],
						"description": "Sets attribute for an element with given id."
					},
					{
						"name": "setAttributesAsText",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the element to set attributes for."
							},
							{
								"name": "text",
								"type": "string",
								"description": "Text with a number of attributes. Will parse this text using HTML parser."
							},
							{
								"name": "name",
								"type": "string",
								"optional": true,
								"description": "Attribute name to replace with new attributes derived from text in case text parsed successfully."
							}
						],
						"description": "Sets attributes on element with given id. This method is useful when user edits some existing attribute value and types in several attribute name/value pairs."
					},
					{
						"name": "removeAttribute",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the element to remove attribute from."
							},
							{
								"name": "name",
								"type": "string",
								"description": "Name of the attribute to remove."
							}
						],
						"description": "Removes attribute with given name from an element with given id."
					},
					{
						"name": "getOuterHTML",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to get markup for."
							}
						],
						"returns": [
							{
								"name": "outerHTML",
								"type": "string",
								"description": "Outer HTML markup."
							}
						],
						"description": "Returns node's HTML markup."
					},
					{
						"name": "setOuterHTML",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to set markup for."
							},
							{
								"name": "outerHTML",
								"type": "string",
								"description": "Outer HTML markup to set."
							}
						],
						"description": "Sets node HTML markup, returns new node id."
					},
					{
						"name": "performSearch",
						"parameters": [
							{
								"name": "query",
								"type": "string",
								"description": "Plain text or query selector or XPath search query."
							},
							{
								"name": "includeUserAgentShadowDOM",
								"type": "boolean",
								"optional": true,
								"description": "True to search in user agent shadow DOM.",
								"experimental": true
							}
						],
						"returns": [
							{
								"name": "searchId",
								"type": "string",
								"description": "Unique search session identifier."
							},
							{
								"name": "resultCount",
								"type": "integer",
								"description": "Number of search results."
							}
						],
						"description": "Searches for a given string in the DOM tree. Use <code>getSearchResults</code> to access search results or <code>cancelSearch</code> to end this search session.",
						"experimental": true
					},
					{
						"name": "getSearchResults",
						"parameters": [
							{
								"name": "searchId",
								"type": "string",
								"description": "Unique search session identifier."
							},
							{
								"name": "fromIndex",
								"type": "integer",
								"description": "Start index of the search result to be returned."
							},
							{
								"name": "toIndex",
								"type": "integer",
								"description": "End index of the search result to be returned."
							}
						],
						"returns": [
							{
								"name": "nodeIds",
								"type": "array",
								"items": {
									"$ref": "NodeId"
								},
								"description": "Ids of the search result nodes."
							}
						],
						"description": "Returns search results from given <code>fromIndex</code> to given <code>toIndex</code> from the sarch with the given identifier.",
						"experimental": true
					},
					{
						"name": "discardSearchResults",
						"parameters": [
							{
								"name": "searchId",
								"type": "string",
								"description": "Unique search session identifier."
							}
						],
						"description": "Discards search results from the session with the given id. <code>getSearchResults</code> should no longer be called for that search.",
						"experimental": true
					},
					{
						"name": "requestNode",
						"parameters": [
							{
								"name": "objectId",
								"$ref": "Runtime.RemoteObjectId",
								"description": "JavaScript object id to convert into node."
							}
						],
						"returns": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Node id for given object."
							}
						],
						"description": "Requests that the node is sent to the caller given the JavaScript node object reference. All nodes that form the path from the node to the root are also sent to the client as a series of <code>setChildNodes</code> notifications."
					},
					{
						"name": "setInspectMode",
						"experimental": true,
						"parameters": [
							{
								"name": "mode",
								"$ref": "InspectMode",
								"description": "Set an inspection mode."
							},
							{
								"name": "highlightConfig",
								"$ref": "HighlightConfig",
								"optional": true,
								"description": "A descriptor for the highlight appearance of hovered-over nodes. May be omitted if <code>enabled == false</code>."
							}
						],
						"description": "Enters the 'inspect' mode. In this mode, elements that user is hovering over are highlighted. Backend then generates 'inspectNodeRequested' event upon element selection."
					},
					{
						"name": "highlightRect",
						"parameters": [
							{
								"name": "x",
								"type": "integer",
								"description": "X coordinate"
							},
							{
								"name": "y",
								"type": "integer",
								"description": "Y coordinate"
							},
							{
								"name": "width",
								"type": "integer",
								"description": "Rectangle width"
							},
							{
								"name": "height",
								"type": "integer",
								"description": "Rectangle height"
							},
							{
								"name": "color",
								"$ref": "RGBA",
								"optional": true,
								"description": "The highlight fill color (default: transparent)."
							},
							{
								"name": "outlineColor",
								"$ref": "RGBA",
								"optional": true,
								"description": "The highlight outline color (default: transparent)."
							}
						],
						"description": "Highlights given rectangle. Coordinates are absolute with respect to the main frame viewport."
					},
					{
						"name": "highlightQuad",
						"parameters": [
							{
								"name": "quad",
								"$ref": "Quad",
								"description": "Quad to highlight"
							},
							{
								"name": "color",
								"$ref": "RGBA",
								"optional": true,
								"description": "The highlight fill color (default: transparent)."
							},
							{
								"name": "outlineColor",
								"$ref": "RGBA",
								"optional": true,
								"description": "The highlight outline color (default: transparent)."
							}
						],
						"description": "Highlights given quad. Coordinates are absolute with respect to the main frame viewport.",
						"experimental": true
					},
					{
						"name": "highlightNode",
						"parameters": [
							{
								"name": "highlightConfig",
								"$ref": "HighlightConfig",
								"description": "A descriptor for the highlight appearance."
							},
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"optional": true,
								"description": "Identifier of the node to highlight."
							},
							{
								"name": "backendNodeId",
								"$ref": "BackendNodeId",
								"optional": true,
								"description": "Identifier of the backend node to highlight."
							},
							{
								"name": "objectId",
								"$ref": "Runtime.RemoteObjectId",
								"optional": true,
								"description": "JavaScript object id of the node to be highlighted.",
								"experimental": true
							}
						],
						"description": "Highlights DOM node with given id or with the given JavaScript object wrapper. Either nodeId or objectId must be specified."
					},
					{
						"name": "hideHighlight",
						"description": "Hides DOM node highlight."
					},
					{
						"name": "highlightFrame",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "Page.FrameId",
								"description": "Identifier of the frame to highlight."
							},
							{
								"name": "contentColor",
								"$ref": "RGBA",
								"optional": true,
								"description": "The content box highlight fill color (default: transparent)."
							},
							{
								"name": "contentOutlineColor",
								"$ref": "RGBA",
								"optional": true,
								"description": "The content box highlight outline color (default: transparent)."
							}
						],
						"description": "Highlights owner element of the frame with given id.",
						"experimental": true
					},
					{
						"name": "pushNodeByPathToFrontend",
						"parameters": [
							{
								"name": "path",
								"type": "string",
								"description": "Path to node in the proprietary format."
							}
						],
						"returns": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node for given path."
							}
						],
						"description": "Requests that the node is sent to the caller given its path. // FIXME, use XPath",
						"experimental": true
					},
					{
						"name": "pushNodesByBackendIdsToFrontend",
						"parameters": [
							{
								"name": "backendNodeIds",
								"type": "array",
								"items": {
									"$ref": "BackendNodeId"
								},
								"description": "The array of backend node ids."
							}
						],
						"returns": [
							{
								"name": "nodeIds",
								"type": "array",
								"items": {
									"$ref": "NodeId"
								},
								"description": "The array of ids of pushed nodes that correspond to the backend ids specified in backendNodeIds."
							}
						],
						"description": "Requests that a batch of nodes is sent to the caller given their backend node ids.",
						"experimental": true
					},
					{
						"name": "setInspectedNode",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "DOM node id to be accessible by means of $x command line API."
							}
						],
						"description": "Enables console to refer to the node with given id via $x (see Command Line API for more details $x functions).",
						"experimental": true
					},
					{
						"name": "resolveNode",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to resolve."
							},
							{
								"name": "objectGroup",
								"type": "string",
								"optional": true,
								"description": "Symbolic group name that can be used to release multiple objects."
							}
						],
						"returns": [
							{
								"name": "object",
								"$ref": "Runtime.RemoteObject",
								"description": "JavaScript object wrapper for given node."
							}
						],
						"description": "Resolves JavaScript node object for given node id."
					},
					{
						"name": "getAttributes",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to retrieve attibutes for."
							}
						],
						"returns": [
							{
								"name": "attributes",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "An interleaved array of node attribute names and values."
							}
						],
						"description": "Returns attributes for the specified node."
					},
					{
						"name": "copyTo",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to copy."
							},
							{
								"name": "targetNodeId",
								"$ref": "NodeId",
								"description": "Id of the element to drop the copy into."
							},
							{
								"name": "insertBeforeNodeId",
								"$ref": "NodeId",
								"optional": true,
								"description": "Drop the copy before this node (if absent, the copy becomes the last child of <code>targetNodeId</code>)."
							}
						],
						"returns": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node clone."
							}
						],
						"description": "Creates a deep copy of the specified node and places it into the target container before the given anchor.",
						"experimental": true
					},
					{
						"name": "moveTo",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to move."
							},
							{
								"name": "targetNodeId",
								"$ref": "NodeId",
								"description": "Id of the element to drop the moved node into."
							},
							{
								"name": "insertBeforeNodeId",
								"$ref": "NodeId",
								"optional": true,
								"description": "Drop node before this one (if absent, the moved node becomes the last child of <code>targetNodeId</code>)."
							}
						],
						"returns": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "New id of the moved node."
							}
						],
						"description": "Moves node into the new container, places it before the given anchor."
					},
					{
						"name": "undo",
						"description": "Undoes the last performed action.",
						"experimental": true
					},
					{
						"name": "redo",
						"description": "Re-does the last undone action.",
						"experimental": true
					},
					{
						"name": "markUndoableState",
						"description": "Marks last undoable state.",
						"experimental": true
					},
					{
						"name": "focus",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to focus."
							}
						],
						"description": "Focuses the given element.",
						"experimental": true
					},
					{
						"name": "setFileInputFiles",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the file input node to set files for."
							},
							{
								"name": "files",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "Array of file paths to set."
							}
						],
						"description": "Sets files for the given file input element.",
						"experimental": true
					},
					{
						"name": "getBoxModel",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to get box model for."
							}
						],
						"returns": [
							{
								"name": "model",
								"$ref": "BoxModel",
								"description": "Box model for the node."
							}
						],
						"description": "Returns boxes for the currently selected nodes.",
						"experimental": true
					},
					{
						"name": "getNodeForLocation",
						"parameters": [
							{
								"name": "x",
								"type": "integer",
								"description": "X coordinate."
							},
							{
								"name": "y",
								"type": "integer",
								"description": "Y coordinate."
							}
						],
						"returns": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node at given coordinates."
							}
						],
						"description": "Returns node id at given location.",
						"experimental": true
					},
					{
						"name": "getRelayoutBoundary",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node."
							}
						],
						"returns": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Relayout boundary node id for the given node."
							}
						],
						"description": "Returns the id of the nearest ancestor that is a relayout boundary.",
						"experimental": true
					},
					{
						"name": "getHighlightObjectForTest",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node to get highlight object for."
							}
						],
						"returns": [
							{
								"name": "highlight",
								"type": "object",
								"description": "Highlight data for the node."
							}
						],
						"description": "For testing.",
						"experimental": true
					}
				],
				"events": [
					{
						"name": "documentUpdated",
						"description": "Fired when <code>Document</code> has been totally updated. Node ids are no longer valid."
					},
					{
						"name": "inspectNodeRequested",
						"parameters": [
							{
								"name": "backendNodeId",
								"$ref": "BackendNodeId",
								"description": "Id of the node to inspect."
							}
						],
						"description": "Fired when the node should be inspected. This happens after call to <code>setInspectMode</code>.",
						"experimental": true
					},
					{
						"name": "setChildNodes",
						"parameters": [
							{
								"name": "parentId",
								"$ref": "NodeId",
								"description": "Parent node id to populate with children."
							},
							{
								"name": "nodes",
								"type": "array",
								"items": {
									"$ref": "Node"
								},
								"description": "Child nodes array."
							}
						],
						"description": "Fired when backend wants to provide client with the missing DOM structure. This happens upon most of the calls requesting node ids."
					},
					{
						"name": "attributeModified",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node that has changed."
							},
							{
								"name": "name",
								"type": "string",
								"description": "Attribute name."
							},
							{
								"name": "value",
								"type": "string",
								"description": "Attribute value."
							}
						],
						"description": "Fired when <code>Element</code>'s attribute is modified."
					},
					{
						"name": "attributeRemoved",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node that has changed."
							},
							{
								"name": "name",
								"type": "string",
								"description": "A ttribute name."
							}
						],
						"description": "Fired when <code>Element</code>'s attribute is removed."
					},
					{
						"name": "inlineStyleInvalidated",
						"parameters": [
							{
								"name": "nodeIds",
								"type": "array",
								"items": {
									"$ref": "NodeId"
								},
								"description": "Ids of the nodes for which the inline styles have been invalidated."
							}
						],
						"description": "Fired when <code>Element</code>'s inline style is modified via a CSS property modification.",
						"experimental": true
					},
					{
						"name": "characterDataModified",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node that has changed."
							},
							{
								"name": "characterData",
								"type": "string",
								"description": "New text value."
							}
						],
						"description": "Mirrors <code>DOMCharacterDataModified</code> event."
					},
					{
						"name": "childNodeCountUpdated",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node that has changed."
							},
							{
								"name": "childNodeCount",
								"type": "integer",
								"description": "New node count."
							}
						],
						"description": "Fired when <code>Container</code>'s child node count has changed."
					},
					{
						"name": "childNodeInserted",
						"parameters": [
							{
								"name": "parentNodeId",
								"$ref": "NodeId",
								"description": "Id of the node that has changed."
							},
							{
								"name": "previousNodeId",
								"$ref": "NodeId",
								"description": "If of the previous siblint."
							},
							{
								"name": "node",
								"$ref": "Node",
								"description": "Inserted node data."
							}
						],
						"description": "Mirrors <code>DOMNodeInserted</code> event."
					},
					{
						"name": "childNodeRemoved",
						"parameters": [
							{
								"name": "parentNodeId",
								"$ref": "NodeId",
								"description": "Parent id."
							},
							{
								"name": "nodeId",
								"$ref": "NodeId",
								"description": "Id of the node that has been removed."
							}
						],
						"description": "Mirrors <code>DOMNodeRemoved</code> event."
					},
					{
						"name": "shadowRootPushed",
						"parameters": [
							{
								"name": "hostId",
								"$ref": "NodeId",
								"description": "Host element id."
							},
							{
								"name": "root",
								"$ref": "Node",
								"description": "Shadow root."
							}
						],
						"description": "Called when shadow root is pushed into the element.",
						"experimental": true
					},
					{
						"name": "shadowRootPopped",
						"parameters": [
							{
								"name": "hostId",
								"$ref": "NodeId",
								"description": "Host element id."
							},
							{
								"name": "rootId",
								"$ref": "NodeId",
								"description": "Shadow root id."
							}
						],
						"description": "Called when shadow root is popped from the element.",
						"experimental": true
					},
					{
						"name": "pseudoElementAdded",
						"parameters": [
							{
								"name": "parentId",
								"$ref": "NodeId",
								"description": "Pseudo element's parent element id."
							},
							{
								"name": "pseudoElement",
								"$ref": "Node",
								"description": "The added pseudo element."
							}
						],
						"description": "Called when a pseudo element is added to an element.",
						"experimental": true
					},
					{
						"name": "pseudoElementRemoved",
						"parameters": [
							{
								"name": "parentId",
								"$ref": "NodeId",
								"description": "Pseudo element's parent element id."
							},
							{
								"name": "pseudoElementId",
								"$ref": "NodeId",
								"description": "The removed pseudo element id."
							}
						],
						"description": "Called when a pseudo element is removed from an element.",
						"experimental": true
					},
					{
						"name": "distributedNodesUpdated",
						"parameters": [
							{
								"name": "insertionPointId",
								"$ref": "NodeId",
								"description": "Insertion point where distrubuted nodes were updated."
							},
							{
								"name": "distributedNodes",
								"type": "array",
								"items": {
									"$ref": "BackendNode"
								},
								"description": "Distributed nodes for given insertion point."
							}
						],
						"description": "Called when distrubution is changed.",
						"experimental": true
					},
					{
						"name": "nodeHighlightRequested",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "NodeId"
							}
						],
						"experimental": true
					}
				]
			},
			{
				"domain": "CSS",
				"experimental": true,
				"description": "This domain exposes CSS read/write operations. All CSS objects (stylesheets, rules, and styles) have an associated <code>id</code> used in subsequent operations on the related object. Each object type has a specific <code>id</code> structure, and those are not interchangeable between objects of different kinds. CSS objects can be loaded using the <code>get*ForNode()</code> calls (which accept a DOM node id). A client can also discover all the existing stylesheets with the <code>getAllStyleSheets()</code> method (or keeping track of the <code>styleSheetAdded</code>/<code>styleSheetRemoved</code> events) and subsequently load the required stylesheet contents using the <code>getStyleSheet[Text]()</code> methods.",
				"dependencies": [
					"DOM"
				],
				"types": [
					{
						"id": "StyleSheetId",
						"type": "string"
					},
					{
						"id": "StyleSheetOrigin",
						"type": "string",
						"enum": [
							"injected",
							"user-agent",
							"inspector",
							"regular"
						],
						"description": "Stylesheet type: \"injected\" for stylesheets injected via extension, \"user-agent\" for user-agent stylesheets, \"inspector\" for stylesheets created by the inspector (i.e. those holding the \"via inspector\" rules), \"regular\" for regular stylesheets."
					},
					{
						"id": "PseudoElementMatches",
						"type": "object",
						"properties": [
							{
								"name": "pseudoType",
								"$ref": "DOM.PseudoType",
								"description": "Pseudo element type."
							},
							{
								"name": "matches",
								"type": "array",
								"items": {
									"$ref": "RuleMatch"
								},
								"description": "Matches of CSS rules applicable to the pseudo style."
							}
						],
						"description": "CSS rule collection for a single pseudo style."
					},
					{
						"id": "InheritedStyleEntry",
						"type": "object",
						"properties": [
							{
								"name": "inlineStyle",
								"$ref": "CSSStyle",
								"optional": true,
								"description": "The ancestor node's inline style, if any, in the style inheritance chain."
							},
							{
								"name": "matchedCSSRules",
								"type": "array",
								"items": {
									"$ref": "RuleMatch"
								},
								"description": "Matches of CSS rules matching the ancestor node in the style inheritance chain."
							}
						],
						"description": "Inherited CSS rule collection from ancestor node."
					},
					{
						"id": "RuleMatch",
						"type": "object",
						"properties": [
							{
								"name": "rule",
								"$ref": "CSSRule",
								"description": "CSS rule in the match."
							},
							{
								"name": "matchingSelectors",
								"type": "array",
								"items": {
									"type": "integer"
								},
								"description": "Matching selector indices in the rule's selectorList selectors (0-based)."
							}
						],
						"description": "Match data for a CSS rule."
					},
					{
						"id": "Value",
						"type": "object",
						"properties": [
							{
								"name": "text",
								"type": "string",
								"description": "Value text."
							},
							{
								"name": "range",
								"$ref": "SourceRange",
								"optional": true,
								"description": "Value range in the underlying resource (if available)."
							}
						],
						"description": "Data for a simple selector (these are delimited by commas in a selector list)."
					},
					{
						"id": "SelectorList",
						"type": "object",
						"properties": [
							{
								"name": "selectors",
								"type": "array",
								"items": {
									"$ref": "Value"
								},
								"description": "Selectors in the list."
							},
							{
								"name": "text",
								"type": "string",
								"description": "Rule selector text."
							}
						],
						"description": "Selector list data."
					},
					{
						"id": "CSSStyleSheetHeader",
						"type": "object",
						"properties": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId",
								"description": "The stylesheet identifier."
							},
							{
								"name": "frameId",
								"$ref": "Page.FrameId",
								"description": "Owner frame identifier."
							},
							{
								"name": "sourceURL",
								"type": "string",
								"description": "Stylesheet resource URL."
							},
							{
								"name": "sourceMapURL",
								"type": "string",
								"optional": true,
								"description": "URL of source map associated with the stylesheet (if any)."
							},
							{
								"name": "origin",
								"$ref": "StyleSheetOrigin",
								"description": "Stylesheet origin."
							},
							{
								"name": "title",
								"type": "string",
								"description": "Stylesheet title."
							},
							{
								"name": "ownerNode",
								"$ref": "DOM.BackendNodeId",
								"optional": true,
								"description": "The backend id for the owner node of the stylesheet."
							},
							{
								"name": "disabled",
								"type": "boolean",
								"description": "Denotes whether the stylesheet is disabled."
							},
							{
								"name": "hasSourceURL",
								"type": "boolean",
								"optional": true,
								"description": "Whether the sourceURL field value comes from the sourceURL comment."
							},
							{
								"name": "isInline",
								"type": "boolean",
								"description": "Whether this stylesheet is created for STYLE tag by parser. This flag is not set for document.written STYLE tags."
							},
							{
								"name": "startLine",
								"type": "number",
								"description": "Line offset of the stylesheet within the resource (zero based)."
							},
							{
								"name": "startColumn",
								"type": "number",
								"description": "Column offset of the stylesheet within the resource (zero based)."
							}
						],
						"description": "CSS stylesheet metainformation."
					},
					{
						"id": "CSSRule",
						"type": "object",
						"properties": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId",
								"optional": true,
								"description": "The css style sheet identifier (absent for user agent stylesheet and user-specified stylesheet rules) this rule came from."
							},
							{
								"name": "selectorList",
								"$ref": "SelectorList",
								"description": "Rule selector data."
							},
							{
								"name": "origin",
								"$ref": "StyleSheetOrigin",
								"description": "Parent stylesheet's origin."
							},
							{
								"name": "style",
								"$ref": "CSSStyle",
								"description": "Associated style declaration."
							},
							{
								"name": "media",
								"type": "array",
								"items": {
									"$ref": "CSSMedia"
								},
								"optional": true,
								"description": "Media list array (for rules involving media queries). The array enumerates media queries starting with the innermost one, going outwards."
							}
						],
						"description": "CSS rule representation."
					},
					{
						"id": "RuleUsage",
						"type": "object",
						"properties": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId",
								"description": "The css style sheet identifier (absent for user agent stylesheet and user-specified stylesheet rules) this rule came from."
							},
							{
								"name": "range",
								"$ref": "SourceRange",
								"description": "Style declaration range in the enclosing stylesheet (if available)."
							},
							{
								"name": "used",
								"type": "boolean",
								"description": "Indicates whether the rule was actually used by some element in the page."
							}
						],
						"description": "CSS rule usage information.",
						"experimental": true
					},
					{
						"id": "SourceRange",
						"type": "object",
						"properties": [
							{
								"name": "startLine",
								"type": "integer",
								"description": "Start line of range."
							},
							{
								"name": "startColumn",
								"type": "integer",
								"description": "Start column of range (inclusive)."
							},
							{
								"name": "endLine",
								"type": "integer",
								"description": "End line of range"
							},
							{
								"name": "endColumn",
								"type": "integer",
								"description": "End column of range (exclusive)."
							}
						],
						"description": "Text range within a resource. All numbers are zero-based."
					},
					{
						"id": "ShorthandEntry",
						"type": "object",
						"properties": [
							{
								"name": "name",
								"type": "string",
								"description": "Shorthand name."
							},
							{
								"name": "value",
								"type": "string",
								"description": "Shorthand value."
							},
							{
								"name": "important",
								"type": "boolean",
								"optional": true,
								"description": "Whether the property has \"!important\" annotation (implies <code>false</code> if absent)."
							}
						]
					},
					{
						"id": "CSSComputedStyleProperty",
						"type": "object",
						"properties": [
							{
								"name": "name",
								"type": "string",
								"description": "Computed style property name."
							},
							{
								"name": "value",
								"type": "string",
								"description": "Computed style property value."
							}
						]
					},
					{
						"id": "CSSStyle",
						"type": "object",
						"properties": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId",
								"optional": true,
								"description": "The css style sheet identifier (absent for user agent stylesheet and user-specified stylesheet rules) this rule came from."
							},
							{
								"name": "cssProperties",
								"type": "array",
								"items": {
									"$ref": "CSSProperty"
								},
								"description": "CSS properties in the style."
							},
							{
								"name": "shorthandEntries",
								"type": "array",
								"items": {
									"$ref": "ShorthandEntry"
								},
								"description": "Computed values for all shorthands found in the style."
							},
							{
								"name": "cssText",
								"type": "string",
								"optional": true,
								"description": "Style declaration text (if available)."
							},
							{
								"name": "range",
								"$ref": "SourceRange",
								"optional": true,
								"description": "Style declaration range in the enclosing stylesheet (if available)."
							}
						],
						"description": "CSS style representation."
					},
					{
						"id": "CSSProperty",
						"type": "object",
						"properties": [
							{
								"name": "name",
								"type": "string",
								"description": "The property name."
							},
							{
								"name": "value",
								"type": "string",
								"description": "The property value."
							},
							{
								"name": "important",
								"type": "boolean",
								"optional": true,
								"description": "Whether the property has \"!important\" annotation (implies <code>false</code> if absent)."
							},
							{
								"name": "implicit",
								"type": "boolean",
								"optional": true,
								"description": "Whether the property is implicit (implies <code>false</code> if absent)."
							},
							{
								"name": "text",
								"type": "string",
								"optional": true,
								"description": "The full property text as specified in the style."
							},
							{
								"name": "parsedOk",
								"type": "boolean",
								"optional": true,
								"description": "Whether the property is understood by the browser (implies <code>true</code> if absent)."
							},
							{
								"name": "disabled",
								"type": "boolean",
								"optional": true,
								"description": "Whether the property is disabled by the user (present for source-based properties only)."
							},
							{
								"name": "range",
								"$ref": "SourceRange",
								"optional": true,
								"description": "The entire property range in the enclosing style declaration (if available)."
							}
						],
						"description": "CSS property declaration data."
					},
					{
						"id": "CSSMedia",
						"type": "object",
						"properties": [
							{
								"name": "text",
								"type": "string",
								"description": "Media query text."
							},
							{
								"name": "source",
								"type": "string",
								"enum": [
									"mediaRule",
									"importRule",
									"linkedSheet",
									"inlineSheet"
								],
								"description": "Source of the media query: \"mediaRule\" if specified by a @media rule, \"importRule\" if specified by an @import rule, \"linkedSheet\" if specified by a \"media\" attribute in a linked stylesheet's LINK tag, \"inlineSheet\" if specified by a \"media\" attribute in an inline stylesheet's STYLE tag."
							},
							{
								"name": "sourceURL",
								"type": "string",
								"optional": true,
								"description": "URL of the document containing the media query description."
							},
							{
								"name": "range",
								"$ref": "SourceRange",
								"optional": true,
								"description": "The associated rule (@media or @import) header range in the enclosing stylesheet (if available)."
							},
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId",
								"optional": true,
								"description": "Identifier of the stylesheet containing this object (if exists)."
							},
							{
								"name": "mediaList",
								"type": "array",
								"items": {
									"$ref": "MediaQuery"
								},
								"optional": true,
								"experimental": true,
								"description": "Array of media queries."
							}
						],
						"description": "CSS media rule descriptor."
					},
					{
						"id": "MediaQuery",
						"type": "object",
						"properties": [
							{
								"name": "expressions",
								"type": "array",
								"items": {
									"$ref": "MediaQueryExpression"
								},
								"description": "Array of media query expressions."
							},
							{
								"name": "active",
								"type": "boolean",
								"description": "Whether the media query condition is satisfied."
							}
						],
						"description": "Media query descriptor.",
						"experimental": true
					},
					{
						"id": "MediaQueryExpression",
						"type": "object",
						"properties": [
							{
								"name": "value",
								"type": "number",
								"description": "Media query expression value."
							},
							{
								"name": "unit",
								"type": "string",
								"description": "Media query expression units."
							},
							{
								"name": "feature",
								"type": "string",
								"description": "Media query expression feature."
							},
							{
								"name": "valueRange",
								"$ref": "SourceRange",
								"optional": true,
								"description": "The associated range of the value text in the enclosing stylesheet (if available)."
							},
							{
								"name": "computedLength",
								"type": "number",
								"optional": true,
								"description": "Computed length of media query expression (if applicable)."
							}
						],
						"description": "Media query expression descriptor.",
						"experimental": true
					},
					{
						"id": "PlatformFontUsage",
						"type": "object",
						"properties": [
							{
								"name": "familyName",
								"type": "string",
								"description": "Font's family name reported by platform."
							},
							{
								"name": "isCustomFont",
								"type": "boolean",
								"description": "Indicates if the font was downloaded or resolved locally."
							},
							{
								"name": "glyphCount",
								"type": "number",
								"description": "Amount of glyphs that were rendered with this font."
							}
						],
						"description": "Information about amount of glyphs that were rendered with given font.",
						"experimental": true
					},
					{
						"id": "CSSKeyframesRule",
						"type": "object",
						"properties": [
							{
								"name": "animationName",
								"$ref": "Value",
								"description": "Animation name."
							},
							{
								"name": "keyframes",
								"type": "array",
								"items": {
									"$ref": "CSSKeyframeRule"
								},
								"description": "List of keyframes."
							}
						],
						"description": "CSS keyframes rule representation."
					},
					{
						"id": "CSSKeyframeRule",
						"type": "object",
						"properties": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId",
								"optional": true,
								"description": "The css style sheet identifier (absent for user agent stylesheet and user-specified stylesheet rules) this rule came from."
							},
							{
								"name": "origin",
								"$ref": "StyleSheetOrigin",
								"description": "Parent stylesheet's origin."
							},
							{
								"name": "keyText",
								"$ref": "Value",
								"description": "Associated key text."
							},
							{
								"name": "style",
								"$ref": "CSSStyle",
								"description": "Associated style declaration."
							}
						],
						"description": "CSS keyframe rule representation."
					},
					{
						"id": "StyleDeclarationEdit",
						"type": "object",
						"properties": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId",
								"description": "The css style sheet identifier."
							},
							{
								"name": "range",
								"$ref": "SourceRange",
								"description": "The range of the style text in the enclosing stylesheet."
							},
							{
								"name": "text",
								"type": "string",
								"description": "New style text."
							}
						],
						"description": "A descriptor of operation to mutate style declaration text."
					},
					{
						"id": "InlineTextBox",
						"type": "object",
						"properties": [
							{
								"name": "boundingBox",
								"$ref": "DOM.Rect",
								"description": "The absolute position bounding box."
							},
							{
								"name": "startCharacterIndex",
								"type": "integer",
								"description": "The starting index in characters, for this post layout textbox substring."
							},
							{
								"name": "numCharacters",
								"type": "integer",
								"description": "The number of characters in this post layout textbox substring."
							}
						],
						"description": "Details of post layout rendered text positions. The exact layout should not be regarded as stable and may change between versions.",
						"experimental": true
					},
					{
						"id": "LayoutTreeNode",
						"type": "object",
						"properties": [
							{
								"name": "nodeId",
								"$ref": "DOM.NodeId",
								"description": "The id of the related DOM node matching one from DOM.GetDocument."
							},
							{
								"name": "boundingBox",
								"$ref": "DOM.Rect",
								"description": "The absolute position bounding box."
							},
							{
								"name": "layoutText",
								"type": "string",
								"optional": true,
								"description": "Contents of the LayoutText if any"
							},
							{
								"name": "inlineTextNodes",
								"type": "array",
								"optional": true,
								"items": {
									"$ref": "InlineTextBox"
								},
								"description": "The post layout inline text nodes, if any."
							},
							{
								"name": "styleIndex",
								"type": "integer",
								"optional": true,
								"description": "Index into the computedStyles array returned by getLayoutTreeAndStyles."
							}
						],
						"description": "Details of an element in the DOM tree with a LayoutObject.",
						"experimental": true
					},
					{
						"id": "ComputedStyle",
						"type": "object",
						"properties": [
							{
								"name": "properties",
								"type": "array",
								"items": {
									"$ref": "CSSComputedStyleProperty"
								}
							}
						],
						"description": "A subset of the full ComputedStyle as defined by the request whitelist.",
						"experimental": true
					}
				],
				"commands": [
					{
						"name": "enable",
						"description": "Enables the CSS agent for the given page. Clients should not assume that the CSS agent has been enabled until the result of this command is received."
					},
					{
						"name": "disable",
						"description": "Disables the CSS agent for the given page."
					},
					{
						"name": "getMatchedStylesForNode",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "DOM.NodeId"
							}
						],
						"returns": [
							{
								"name": "inlineStyle",
								"$ref": "CSSStyle",
								"optional": true,
								"description": "Inline style for the specified DOM node."
							},
							{
								"name": "attributesStyle",
								"$ref": "CSSStyle",
								"optional": true,
								"description": "Attribute-defined element style (e.g. resulting from \"width=20 height=100%\")."
							},
							{
								"name": "matchedCSSRules",
								"type": "array",
								"items": {
									"$ref": "RuleMatch"
								},
								"optional": true,
								"description": "CSS rules matching this node, from all applicable stylesheets."
							},
							{
								"name": "pseudoElements",
								"type": "array",
								"items": {
									"$ref": "PseudoElementMatches"
								},
								"optional": true,
								"description": "Pseudo style matches for this node."
							},
							{
								"name": "inherited",
								"type": "array",
								"items": {
									"$ref": "InheritedStyleEntry"
								},
								"optional": true,
								"description": "A chain of inherited styles (from the immediate node parent up to the DOM tree root)."
							},
							{
								"name": "cssKeyframesRules",
								"type": "array",
								"items": {
									"$ref": "CSSKeyframesRule"
								},
								"optional": true,
								"description": "A list of CSS keyframed animations matching this node."
							}
						],
						"description": "Returns requested styles for a DOM node identified by <code>nodeId</code>."
					},
					{
						"name": "getInlineStylesForNode",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "DOM.NodeId"
							}
						],
						"returns": [
							{
								"name": "inlineStyle",
								"$ref": "CSSStyle",
								"optional": true,
								"description": "Inline style for the specified DOM node."
							},
							{
								"name": "attributesStyle",
								"$ref": "CSSStyle",
								"optional": true,
								"description": "Attribute-defined element style (e.g. resulting from \"width=20 height=100%\")."
							}
						],
						"description": "Returns the styles defined inline (explicitly in the \"style\" attribute and implicitly, using DOM attributes) for a DOM node identified by <code>nodeId</code>."
					},
					{
						"name": "getComputedStyleForNode",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "DOM.NodeId"
							}
						],
						"returns": [
							{
								"name": "computedStyle",
								"type": "array",
								"items": {
									"$ref": "CSSComputedStyleProperty"
								},
								"description": "Computed style for the specified DOM node."
							}
						],
						"description": "Returns the computed style for a DOM node identified by <code>nodeId</code>."
					},
					{
						"name": "getPlatformFontsForNode",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "DOM.NodeId"
							}
						],
						"returns": [
							{
								"name": "fonts",
								"type": "array",
								"items": {
									"$ref": "PlatformFontUsage"
								},
								"description": "Usage statistics for every employed platform font."
							}
						],
						"description": "Requests information about platform fonts which we used to render child TextNodes in the given node.",
						"experimental": true
					},
					{
						"name": "getStyleSheetText",
						"parameters": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId"
							}
						],
						"returns": [
							{
								"name": "text",
								"type": "string",
								"description": "The stylesheet text."
							}
						],
						"description": "Returns the current textual content and the URL for a stylesheet."
					},
					{
						"name": "collectClassNames",
						"parameters": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId"
							}
						],
						"returns": [
							{
								"name": "classNames",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "Class name list."
							}
						],
						"description": "Returns all class names from specified stylesheet.",
						"experimental": true
					},
					{
						"name": "setStyleSheetText",
						"parameters": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId"
							},
							{
								"name": "text",
								"type": "string"
							}
						],
						"returns": [
							{
								"name": "sourceMapURL",
								"type": "string",
								"optional": true,
								"description": "URL of source map associated with script (if any)."
							}
						],
						"description": "Sets the new stylesheet text."
					},
					{
						"name": "setRuleSelector",
						"parameters": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId"
							},
							{
								"name": "range",
								"$ref": "SourceRange"
							},
							{
								"name": "selector",
								"type": "string"
							}
						],
						"returns": [
							{
								"name": "selectorList",
								"$ref": "SelectorList",
								"description": "The resulting selector list after modification."
							}
						],
						"description": "Modifies the rule selector."
					},
					{
						"name": "setKeyframeKey",
						"parameters": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId"
							},
							{
								"name": "range",
								"$ref": "SourceRange"
							},
							{
								"name": "keyText",
								"type": "string"
							}
						],
						"returns": [
							{
								"name": "keyText",
								"$ref": "Value",
								"description": "The resulting key text after modification."
							}
						],
						"description": "Modifies the keyframe rule key text."
					},
					{
						"name": "setStyleTexts",
						"parameters": [
							{
								"name": "edits",
								"type": "array",
								"items": {
									"$ref": "StyleDeclarationEdit"
								}
							}
						],
						"returns": [
							{
								"name": "styles",
								"type": "array",
								"items": {
									"$ref": "CSSStyle"
								},
								"description": "The resulting styles after modification."
							}
						],
						"description": "Applies specified style edits one after another in the given order."
					},
					{
						"name": "setMediaText",
						"parameters": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId"
							},
							{
								"name": "range",
								"$ref": "SourceRange"
							},
							{
								"name": "text",
								"type": "string"
							}
						],
						"returns": [
							{
								"name": "media",
								"$ref": "CSSMedia",
								"description": "The resulting CSS media rule after modification."
							}
						],
						"description": "Modifies the rule selector."
					},
					{
						"name": "createStyleSheet",
						"parameters": [
							{
								"name": "frameId",
								"$ref": "Page.FrameId",
								"description": "Identifier of the frame where \"via-inspector\" stylesheet should be created."
							}
						],
						"returns": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId",
								"description": "Identifier of the created \"via-inspector\" stylesheet."
							}
						],
						"description": "Creates a new special \"via-inspector\" stylesheet in the frame with given <code>frameId</code>."
					},
					{
						"name": "addRule",
						"parameters": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId",
								"description": "The css style sheet identifier where a new rule should be inserted."
							},
							{
								"name": "ruleText",
								"type": "string",
								"description": "The text of a new rule."
							},
							{
								"name": "location",
								"$ref": "SourceRange",
								"description": "Text position of a new rule in the target style sheet."
							}
						],
						"returns": [
							{
								"name": "rule",
								"$ref": "CSSRule",
								"description": "The newly created rule."
							}
						],
						"description": "Inserts a new rule with the given <code>ruleText</code> in a stylesheet with given <code>styleSheetId</code>, at the position specified by <code>location</code>."
					},
					{
						"name": "forcePseudoState",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "DOM.NodeId",
								"description": "The element id for which to force the pseudo state."
							},
							{
								"name": "forcedPseudoClasses",
								"type": "array",
								"items": {
									"type": "string",
									"enum": [
										"active",
										"focus",
										"hover",
										"visited"
									]
								},
								"description": "Element pseudo classes to force when computing the element's style."
							}
						],
						"description": "Ensures that the given node will have specified pseudo-classes whenever its style is computed by the browser."
					},
					{
						"name": "getMediaQueries",
						"returns": [
							{
								"name": "medias",
								"type": "array",
								"items": {
									"$ref": "CSSMedia"
								}
							}
						],
						"description": "Returns all media queries parsed by the rendering engine.",
						"experimental": true
					},
					{
						"name": "setEffectivePropertyValueForNode",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "DOM.NodeId",
								"description": "The element id for which to set property."
							},
							{
								"name": "propertyName",
								"type": "string"
							},
							{
								"name": "value",
								"type": "string"
							}
						],
						"description": "Find a rule with the given active property for the given node and set the new value for this property",
						"experimental": true
					},
					{
						"name": "getBackgroundColors",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "DOM.NodeId",
								"description": "Id of the node to get background colors for."
							}
						],
						"returns": [
							{
								"name": "backgroundColors",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "The range of background colors behind this element, if it contains any visible text. If no visible text is present, this will be undefined. In the case of a flat background color, this will consist of simply that color. In the case of a gradient, this will consist of each of the color stops. For anything more complicated, this will be an empty array. Images will be ignored (as if the image had failed to load).",
								"optional": true
							}
						],
						"experimental": true
					},
					{
						"name": "getLayoutTreeAndStyles",
						"parameters": [
							{
								"name": "computedStyleWhitelist",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "Whitelist of computed styles to return."
							}
						],
						"returns": [
							{
								"name": "layoutTreeNodes",
								"type": "array",
								"items": {
									"$ref": "LayoutTreeNode"
								}
							},
							{
								"name": "computedStyles",
								"type": "array",
								"items": {
									"$ref": "ComputedStyle"
								}
							}
						],
						"description": "For the main document and any content documents, return the LayoutTreeNodes and a whitelisted subset of the computed style. It only returns pushed nodes, on way to pull all nodes is to call DOM.getDocument with a depth of -1.",
						"experimental": true
					},
					{
						"name": "startRuleUsageTracking",
						"description": "Enables the selector recording.",
						"experimental": true
					},
					{
						"name": "stopRuleUsageTracking",
						"returns": [
							{
								"name": "ruleUsage",
								"type": "array",
								"items": {
									"$ref": "RuleUsage"
								}
							}
						],
						"description": "The list of rules with an indication of whether these were used",
						"experimental": true
					}
				],
				"events": [
					{
						"name": "mediaQueryResultChanged",
						"description": "Fires whenever a MediaQuery result changes (for example, after a browser window has been resized.) The current implementation considers only viewport-dependent media features."
					},
					{
						"name": "fontsUpdated",
						"description": "Fires whenever a web font gets loaded."
					},
					{
						"name": "styleSheetChanged",
						"parameters": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId"
							}
						],
						"description": "Fired whenever a stylesheet is changed as a result of the client operation."
					},
					{
						"name": "styleSheetAdded",
						"parameters": [
							{
								"name": "header",
								"$ref": "CSSStyleSheetHeader",
								"description": "Added stylesheet metainfo."
							}
						],
						"description": "Fired whenever an active document stylesheet is added."
					},
					{
						"name": "styleSheetRemoved",
						"parameters": [
							{
								"name": "styleSheetId",
								"$ref": "StyleSheetId",
								"description": "Identifier of the removed stylesheet."
							}
						],
						"description": "Fired whenever an active document stylesheet is removed."
					}
				]
			},
			{
				"domain": "IO",
				"description": "Input/Output operations for streams produced by DevTools.",
				"experimental": true,
				"types": [
					{
						"id": "StreamHandle",
						"type": "string"
					}
				],
				"commands": [
					{
						"name": "read",
						"description": "Read a chunk of the stream",
						"parameters": [
							{
								"name": "handle",
								"$ref": "StreamHandle",
								"description": "Handle of the stream to read."
							},
							{
								"name": "offset",
								"type": "integer",
								"optional": true,
								"description": "Seek to the specified offset before reading (if not specificed, proceed with offset following the last read)."
							},
							{
								"name": "size",
								"type": "integer",
								"optional": true,
								"description": "Maximum number of bytes to read (left upon the agent discretion if not specified)."
							}
						],
						"returns": [
							{
								"name": "data",
								"type": "string",
								"description": "Data that were read."
							},
							{
								"name": "eof",
								"type": "boolean",
								"description": "Set if the end-of-file condition occured while reading."
							}
						]
					},
					{
						"name": "close",
						"description": "Close the stream, discard any temporary backing storage.",
						"parameters": [
							{
								"name": "handle",
								"$ref": "StreamHandle",
								"description": "Handle of the stream to close."
							}
						]
					}
				]
			},
			{
				"domain": "DOMDebugger",
				"description": "DOM debugging allows setting breakpoints on particular DOM operations and events. JavaScript execution will stop on these operations as if there was a regular breakpoint set.",
				"dependencies": [
					"DOM",
					"Debugger"
				],
				"types": [
					{
						"id": "DOMBreakpointType",
						"type": "string",
						"enum": [
							"subtree-modified",
							"attribute-modified",
							"node-removed"
						],
						"description": "DOM breakpoint type."
					},
					{
						"id": "EventListener",
						"type": "object",
						"description": "Object event listener.",
						"properties": [
							{
								"name": "type",
								"type": "string",
								"description": "<code>EventListener</code>'s type."
							},
							{
								"name": "useCapture",
								"type": "boolean",
								"description": "<code>EventListener</code>'s useCapture."
							},
							{
								"name": "passive",
								"type": "boolean",
								"description": "<code>EventListener</code>'s passive flag."
							},
							{
								"name": "once",
								"type": "boolean",
								"description": "<code>EventListener</code>'s once flag."
							},
							{
								"name": "scriptId",
								"$ref": "Runtime.ScriptId",
								"description": "Script id of the handler code."
							},
							{
								"name": "lineNumber",
								"type": "integer",
								"description": "Line number in the script (0-based)."
							},
							{
								"name": "columnNumber",
								"type": "integer",
								"description": "Column number in the script (0-based)."
							},
							{
								"name": "handler",
								"$ref": "Runtime.RemoteObject",
								"optional": true,
								"description": "Event handler function value."
							},
							{
								"name": "originalHandler",
								"$ref": "Runtime.RemoteObject",
								"optional": true,
								"description": "Event original handler function value."
							},
							{
								"name": "removeFunction",
								"$ref": "Runtime.RemoteObject",
								"optional": true,
								"description": "Event listener remove function."
							}
						],
						"experimental": true
					}
				],
				"commands": [
					{
						"name": "setDOMBreakpoint",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "DOM.NodeId",
								"description": "Identifier of the node to set breakpoint on."
							},
							{
								"name": "type",
								"$ref": "DOMBreakpointType",
								"description": "Type of the operation to stop upon."
							}
						],
						"description": "Sets breakpoint on particular operation with DOM."
					},
					{
						"name": "removeDOMBreakpoint",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "DOM.NodeId",
								"description": "Identifier of the node to remove breakpoint from."
							},
							{
								"name": "type",
								"$ref": "DOMBreakpointType",
								"description": "Type of the breakpoint to remove."
							}
						],
						"description": "Removes DOM breakpoint that was set using <code>setDOMBreakpoint</code>."
					},
					{
						"name": "setEventListenerBreakpoint",
						"parameters": [
							{
								"name": "eventName",
								"type": "string",
								"description": "DOM Event name to stop on (any DOM event will do)."
							},
							{
								"name": "targetName",
								"type": "string",
								"optional": true,
								"description": "EventTarget interface name to stop on. If equal to <code>\"*\"</code> or not provided, will stop on any EventTarget.",
								"experimental": true
							}
						],
						"description": "Sets breakpoint on particular DOM event."
					},
					{
						"name": "removeEventListenerBreakpoint",
						"parameters": [
							{
								"name": "eventName",
								"type": "string",
								"description": "Event name."
							},
							{
								"name": "targetName",
								"type": "string",
								"optional": true,
								"description": "EventTarget interface name.",
								"experimental": true
							}
						],
						"description": "Removes breakpoint on particular DOM event."
					},
					{
						"name": "setInstrumentationBreakpoint",
						"parameters": [
							{
								"name": "eventName",
								"type": "string",
								"description": "Instrumentation name to stop on."
							}
						],
						"description": "Sets breakpoint on particular native event.",
						"experimental": true
					},
					{
						"name": "removeInstrumentationBreakpoint",
						"parameters": [
							{
								"name": "eventName",
								"type": "string",
								"description": "Instrumentation name to stop on."
							}
						],
						"description": "Removes breakpoint on particular native event.",
						"experimental": true
					},
					{
						"name": "setXHRBreakpoint",
						"parameters": [
							{
								"name": "url",
								"type": "string",
								"description": "Resource URL substring. All XHRs having this substring in the URL will get stopped upon."
							}
						],
						"description": "Sets breakpoint on XMLHttpRequest."
					},
					{
						"name": "removeXHRBreakpoint",
						"parameters": [
							{
								"name": "url",
								"type": "string",
								"description": "Resource URL substring."
							}
						],
						"description": "Removes breakpoint from XMLHttpRequest."
					},
					{
						"name": "getEventListeners",
						"experimental": true,
						"parameters": [
							{
								"name": "objectId",
								"$ref": "Runtime.RemoteObjectId",
								"description": "Identifier of the object to return listeners for."
							}
						],
						"returns": [
							{
								"name": "listeners",
								"type": "array",
								"items": {
									"$ref": "EventListener"
								},
								"description": "Array of relevant listeners."
							}
						],
						"description": "Returns event listeners of the given object."
					}
				]
			},
			{
				"domain": "Target",
				"description": "Supports additional targets discovery and allows to attach to them.",
				"experimental": true,
				"types": [
					{
						"id": "TargetID",
						"type": "string"
					},
					{
						"id": "BrowserContextID",
						"type": "string"
					},
					{
						"id": "TargetInfo",
						"type": "object",
						"properties": [
							{
								"name": "targetId",
								"$ref": "TargetID"
							},
							{
								"name": "type",
								"type": "string"
							},
							{
								"name": "title",
								"type": "string"
							},
							{
								"name": "url",
								"type": "string"
							}
						]
					},
					{
						"id": "RemoteLocation",
						"type": "object",
						"properties": [
							{
								"name": "host",
								"type": "string"
							},
							{
								"name": "port",
								"type": "integer"
							}
						]
					}
				],
				"commands": [
					{
						"name": "setDiscoverTargets",
						"description": "Controls whether to discover available targets and notify via <code>targetCreated/targetDestroyed</code> events.",
						"parameters": [
							{
								"name": "discover",
								"type": "boolean",
								"description": "Whether to discover available targets."
							}
						]
					},
					{
						"name": "setAutoAttach",
						"description": "Controls whether to automatically attach to new targets which are considered to be related to this one. When turned on, attaches to all existing related targets as well. When turned off, automatically detaches from all currently attached targets.",
						"parameters": [
							{
								"name": "autoAttach",
								"type": "boolean",
								"description": "Whether to auto-attach to related targets."
							},
							{
								"name": "waitForDebuggerOnStart",
								"type": "boolean",
								"description": "Whether to pause new targets when attaching to them. Use <code>Runtime.runIfWaitingForDebugger</code> to run paused targets."
							}
						]
					},
					{
						"name": "setAttachToFrames",
						"parameters": [
							{
								"name": "value",
								"type": "boolean",
								"description": "Whether to attach to frames."
							}
						]
					},
					{
						"name": "setRemoteLocations",
						"description": "Enables target discovery for the specified locations, when <code>setDiscoverTargets</code> was set to <code>true</code>.",
						"parameters": [
							{
								"name": "locations",
								"type": "array",
								"items": {
									"$ref": "RemoteLocation"
								},
								"description": "List of remote locations."
							}
						]
					},
					{
						"name": "sendMessageToTarget",
						"description": "Sends protocol message to the target with given id.",
						"parameters": [
							{
								"name": "targetId",
								"type": "string"
							},
							{
								"name": "message",
								"type": "string"
							}
						]
					},
					{
						"name": "getTargetInfo",
						"description": "Returns information about a target.",
						"parameters": [
							{
								"name": "targetId",
								"$ref": "TargetID"
							}
						],
						"returns": [
							{
								"name": "targetInfo",
								"$ref": "TargetInfo"
							}
						]
					},
					{
						"name": "activateTarget",
						"description": "Activates (focuses) the target.",
						"parameters": [
							{
								"name": "targetId",
								"$ref": "TargetID"
							}
						]
					},
					{
						"name": "closeTarget",
						"description": "Closes the target. If the target is a page that gets closed too.",
						"parameters": [
							{
								"name": "targetId",
								"$ref": "TargetID"
							}
						],
						"returns": [
							{
								"name": "success",
								"type": "boolean"
							}
						]
					},
					{
						"name": "attachToTarget",
						"description": "Attaches to the target with given id.",
						"parameters": [
							{
								"name": "targetId",
								"$ref": "TargetID"
							}
						],
						"returns": [
							{
								"name": "success",
								"type": "boolean",
								"description": "Whether attach succeeded."
							}
						]
					},
					{
						"name": "detachFromTarget",
						"description": "Detaches from the target with given id.",
						"parameters": [
							{
								"name": "targetId",
								"$ref": "TargetID"
							}
						]
					},
					{
						"name": "createBrowserContext",
						"description": "Creates a new empty BrowserContext. Similar to an incognito profile but you can have more than one.",
						"returns": [
							{
								"name": "browserContextId",
								"$ref": "BrowserContextID",
								"description": "The id of the context created."
							}
						]
					},
					{
						"name": "disposeBrowserContext",
						"description": "Deletes a BrowserContext, will fail of any open page uses it.",
						"parameters": [
							{
								"name": "browserContextId",
								"$ref": "BrowserContextID"
							}
						],
						"returns": [
							{
								"name": "success",
								"type": "boolean"
							}
						]
					},
					{
						"name": "createTarget",
						"description": "Creates a new page.",
						"parameters": [
							{
								"name": "url",
								"type": "string",
								"description": "The initial URL the page will be navigated to."
							},
							{
								"name": "width",
								"type": "integer",
								"description": "Frame width in DIP (headless chrome only).",
								"optional": true
							},
							{
								"name": "height",
								"type": "integer",
								"description": "Frame height in DIP (headless chrome only).",
								"optional": true
							},
							{
								"name": "browserContextId",
								"$ref": "BrowserContextID",
								"description": "The browser context to create the page in (headless chrome only).",
								"optional": true
							}
						],
						"returns": [
							{
								"name": "targetId",
								"$ref": "TargetID",
								"description": "The id of the page opened."
							}
						]
					},
					{
						"name": "getTargets",
						"description": "Retrieves a list of available targets.",
						"returns": [
							{
								"name": "targetInfos",
								"type": "array",
								"items": {
									"$ref": "TargetInfo"
								},
								"description": "The list of targets."
							}
						]
					}
				],
				"events": [
					{
						"name": "targetCreated",
						"description": "Issued when a possible inspection target is created.",
						"parameters": [
							{
								"name": "targetInfo",
								"$ref": "TargetInfo"
							}
						]
					},
					{
						"name": "targetDestroyed",
						"description": "Issued when a target is destroyed.",
						"parameters": [
							{
								"name": "targetId",
								"$ref": "TargetID"
							}
						]
					},
					{
						"name": "attachedToTarget",
						"description": "Issued when attached to target because of auto-attach or <code>attachToTarget</code> command.",
						"parameters": [
							{
								"name": "targetInfo",
								"$ref": "TargetInfo"
							},
							{
								"name": "waitingForDebugger",
								"type": "boolean"
							}
						]
					},
					{
						"name": "detachedFromTarget",
						"description": "Issued when detached from target for any reason (including <code>detachFromTarget</code> command).",
						"parameters": [
							{
								"name": "targetId",
								"$ref": "TargetID"
							}
						]
					},
					{
						"name": "receivedMessageFromTarget",
						"description": "Notifies about new protocol message from attached target.",
						"parameters": [
							{
								"name": "targetId",
								"$ref": "TargetID"
							},
							{
								"name": "message",
								"type": "string"
							}
						]
					}
				]
			},
			{
				"domain": "ServiceWorker",
				"experimental": true,
				"types": [
					{
						"id": "ServiceWorkerRegistration",
						"type": "object",
						"description": "ServiceWorker registration.",
						"properties": [
							{
								"name": "registrationId",
								"type": "string"
							},
							{
								"name": "scopeURL",
								"type": "string"
							},
							{
								"name": "isDeleted",
								"type": "boolean"
							}
						]
					},
					{
						"id": "ServiceWorkerVersionRunningStatus",
						"type": "string",
						"enum": [
							"stopped",
							"starting",
							"running",
							"stopping"
						]
					},
					{
						"id": "ServiceWorkerVersionStatus",
						"type": "string",
						"enum": [
							"new",
							"installing",
							"installed",
							"activating",
							"activated",
							"redundant"
						]
					},
					{
						"id": "ServiceWorkerVersion",
						"type": "object",
						"description": "ServiceWorker version.",
						"properties": [
							{
								"name": "versionId",
								"type": "string"
							},
							{
								"name": "registrationId",
								"type": "string"
							},
							{
								"name": "scriptURL",
								"type": "string"
							},
							{
								"name": "runningStatus",
								"$ref": "ServiceWorkerVersionRunningStatus"
							},
							{
								"name": "status",
								"$ref": "ServiceWorkerVersionStatus"
							},
							{
								"name": "scriptLastModified",
								"type": "number",
								"optional": true,
								"description": "The Last-Modified header value of the main script."
							},
							{
								"name": "scriptResponseTime",
								"type": "number",
								"optional": true,
								"description": "The time at which the response headers of the main script were received from the server.  For cached script it is the last time the cache entry was validated."
							},
							{
								"name": "controlledClients",
								"type": "array",
								"optional": true,
								"items": {
									"$ref": "Target.TargetID"
								}
							},
							{
								"name": "targetId",
								"$ref": "Target.TargetID",
								"optional": true
							}
						]
					},
					{
						"id": "ServiceWorkerErrorMessage",
						"type": "object",
						"description": "ServiceWorker error message.",
						"properties": [
							{
								"name": "errorMessage",
								"type": "string"
							},
							{
								"name": "registrationId",
								"type": "string"
							},
							{
								"name": "versionId",
								"type": "string"
							},
							{
								"name": "sourceURL",
								"type": "string"
							},
							{
								"name": "lineNumber",
								"type": "integer"
							},
							{
								"name": "columnNumber",
								"type": "integer"
							}
						]
					}
				],
				"commands": [
					{
						"name": "enable"
					},
					{
						"name": "disable"
					},
					{
						"name": "unregister",
						"parameters": [
							{
								"name": "scopeURL",
								"type": "string"
							}
						]
					},
					{
						"name": "updateRegistration",
						"parameters": [
							{
								"name": "scopeURL",
								"type": "string"
							}
						]
					},
					{
						"name": "startWorker",
						"parameters": [
							{
								"name": "scopeURL",
								"type": "string"
							}
						]
					},
					{
						"name": "skipWaiting",
						"parameters": [
							{
								"name": "scopeURL",
								"type": "string"
							}
						]
					},
					{
						"name": "stopWorker",
						"parameters": [
							{
								"name": "versionId",
								"type": "string"
							}
						]
					},
					{
						"name": "inspectWorker",
						"parameters": [
							{
								"name": "versionId",
								"type": "string"
							}
						]
					},
					{
						"name": "setForceUpdateOnPageLoad",
						"parameters": [
							{
								"name": "forceUpdateOnPageLoad",
								"type": "boolean"
							}
						]
					},
					{
						"name": "deliverPushMessage",
						"parameters": [
							{
								"name": "origin",
								"type": "string"
							},
							{
								"name": "registrationId",
								"type": "string"
							},
							{
								"name": "data",
								"type": "string"
							}
						]
					},
					{
						"name": "dispatchSyncEvent",
						"parameters": [
							{
								"name": "origin",
								"type": "string"
							},
							{
								"name": "registrationId",
								"type": "string"
							},
							{
								"name": "tag",
								"type": "string"
							},
							{
								"name": "lastChance",
								"type": "boolean"
							}
						]
					}
				],
				"events": [
					{
						"name": "workerRegistrationUpdated",
						"parameters": [
							{
								"name": "registrations",
								"type": "array",
								"items": {
									"$ref": "ServiceWorkerRegistration"
								}
							}
						]
					},
					{
						"name": "workerVersionUpdated",
						"parameters": [
							{
								"name": "versions",
								"type": "array",
								"items": {
									"$ref": "ServiceWorkerVersion"
								}
							}
						]
					},
					{
						"name": "workerErrorReported",
						"parameters": [
							{
								"name": "errorMessage",
								"$ref": "ServiceWorkerErrorMessage"
							}
						]
					}
				]
			},
			{
				"domain": "Input",
				"types": [
					{
						"id": "TouchPoint",
						"type": "object",
						"experimental": true,
						"properties": [
							{
								"name": "state",
								"type": "string",
								"enum": [
									"touchPressed",
									"touchReleased",
									"touchMoved",
									"touchStationary",
									"touchCancelled"
								],
								"description": "State of the touch point."
							},
							{
								"name": "x",
								"type": "integer",
								"description": "X coordinate of the event relative to the main frame's viewport."
							},
							{
								"name": "y",
								"type": "integer",
								"description": "Y coordinate of the event relative to the main frame's viewport. 0 refers to the top of the viewport and Y increases as it proceeds towards the bottom of the viewport."
							},
							{
								"name": "radiusX",
								"type": "integer",
								"optional": true,
								"description": "X radius of the touch area (default: 1)."
							},
							{
								"name": "radiusY",
								"type": "integer",
								"optional": true,
								"description": "Y radius of the touch area (default: 1)."
							},
							{
								"name": "rotationAngle",
								"type": "number",
								"optional": true,
								"description": "Rotation angle (default: 0.0)."
							},
							{
								"name": "force",
								"type": "number",
								"optional": true,
								"description": "Force (default: 1.0)."
							},
							{
								"name": "id",
								"type": "number",
								"optional": true,
								"description": "Identifier used to track touch sources between events, must be unique within an event."
							}
						]
					},
					{
						"id": "GestureSourceType",
						"type": "string",
						"experimental": true,
						"enum": [
							"default",
							"touch",
							"mouse"
						]
					}
				],
				"commands": [
					{
						"name": "dispatchKeyEvent",
						"parameters": [
							{
								"name": "type",
								"type": "string",
								"enum": [
									"keyDown",
									"keyUp",
									"rawKeyDown",
									"char"
								],
								"description": "Type of the key event."
							},
							{
								"name": "modifiers",
								"type": "integer",
								"optional": true,
								"description": "Bit field representing pressed modifier keys. Alt=1, Ctrl=2, Meta/Command=4, Shift=8 (default: 0)."
							},
							{
								"name": "timestamp",
								"type": "number",
								"optional": true,
								"description": "Time at which the event occurred. Measured in UTC time in seconds since January 1, 1970 (default: current time)."
							},
							{
								"name": "text",
								"type": "string",
								"optional": true,
								"description": "Text as generated by processing a virtual key code with a keyboard layout. Not needed for for <code>keyUp</code> and <code>rawKeyDown</code> events (default: \"\")"
							},
							{
								"name": "unmodifiedText",
								"type": "string",
								"optional": true,
								"description": "Text that would have been generated by the keyboard if no modifiers were pressed (except for shift). Useful for shortcut (accelerator) key handling (default: \"\")."
							},
							{
								"name": "keyIdentifier",
								"type": "string",
								"optional": true,
								"description": "Unique key identifier (e.g., 'U+0041') (default: \"\")."
							},
							{
								"name": "code",
								"type": "string",
								"optional": true,
								"description": "Unique DOM defined string value for each physical key (e.g., 'KeyA') (default: \"\")."
							},
							{
								"name": "key",
								"type": "string",
								"optional": true,
								"description": "Unique DOM defined string value describing the meaning of the key in the context of active modifiers, keyboard layout, etc (e.g., 'AltGr') (default: \"\")."
							},
							{
								"name": "windowsVirtualKeyCode",
								"type": "integer",
								"optional": true,
								"description": "Windows virtual key code (default: 0)."
							},
							{
								"name": "nativeVirtualKeyCode",
								"type": "integer",
								"optional": true,
								"description": "Native virtual key code (default: 0)."
							},
							{
								"name": "autoRepeat",
								"type": "boolean",
								"optional": true,
								"description": "Whether the event was generated from auto repeat (default: false)."
							},
							{
								"name": "isKeypad",
								"type": "boolean",
								"optional": true,
								"description": "Whether the event was generated from the keypad (default: false)."
							},
							{
								"name": "isSystemKey",
								"type": "boolean",
								"optional": true,
								"description": "Whether the event was a system key event (default: false)."
							}
						],
						"description": "Dispatches a key event to the page."
					},
					{
						"name": "dispatchMouseEvent",
						"parameters": [
							{
								"name": "type",
								"type": "string",
								"enum": [
									"mousePressed",
									"mouseReleased",
									"mouseMoved"
								],
								"description": "Type of the mouse event."
							},
							{
								"name": "x",
								"type": "integer",
								"description": "X coordinate of the event relative to the main frame's viewport."
							},
							{
								"name": "y",
								"type": "integer",
								"description": "Y coordinate of the event relative to the main frame's viewport. 0 refers to the top of the viewport and Y increases as it proceeds towards the bottom of the viewport."
							},
							{
								"name": "modifiers",
								"type": "integer",
								"optional": true,
								"description": "Bit field representing pressed modifier keys. Alt=1, Ctrl=2, Meta/Command=4, Shift=8 (default: 0)."
							},
							{
								"name": "timestamp",
								"type": "number",
								"optional": true,
								"description": "Time at which the event occurred. Measured in UTC time in seconds since January 1, 1970 (default: current time)."
							},
							{
								"name": "button",
								"type": "string",
								"enum": [
									"none",
									"left",
									"middle",
									"right"
								],
								"optional": true,
								"description": "Mouse button (default: \"none\")."
							},
							{
								"name": "clickCount",
								"type": "integer",
								"optional": true,
								"description": "Number of times the mouse button was clicked (default: 0)."
							}
						],
						"description": "Dispatches a mouse event to the page."
					},
					{
						"name": "dispatchTouchEvent",
						"experimental": true,
						"parameters": [
							{
								"name": "type",
								"type": "string",
								"enum": [
									"touchStart",
									"touchEnd",
									"touchMove"
								],
								"description": "Type of the touch event."
							},
							{
								"name": "touchPoints",
								"type": "array",
								"items": {
									"$ref": "TouchPoint"
								},
								"description": "Touch points."
							},
							{
								"name": "modifiers",
								"type": "integer",
								"optional": true,
								"description": "Bit field representing pressed modifier keys. Alt=1, Ctrl=2, Meta/Command=4, Shift=8 (default: 0)."
							},
							{
								"name": "timestamp",
								"type": "number",
								"optional": true,
								"description": "Time at which the event occurred. Measured in UTC time in seconds since January 1, 1970 (default: current time)."
							}
						],
						"description": "Dispatches a touch event to the page."
					},
					{
						"name": "emulateTouchFromMouseEvent",
						"experimental": true,
						"parameters": [
							{
								"name": "type",
								"type": "string",
								"enum": [
									"mousePressed",
									"mouseReleased",
									"mouseMoved",
									"mouseWheel"
								],
								"description": "Type of the mouse event."
							},
							{
								"name": "x",
								"type": "integer",
								"description": "X coordinate of the mouse pointer in DIP."
							},
							{
								"name": "y",
								"type": "integer",
								"description": "Y coordinate of the mouse pointer in DIP."
							},
							{
								"name": "timestamp",
								"type": "number",
								"description": "Time at which the event occurred. Measured in UTC time in seconds since January 1, 1970."
							},
							{
								"name": "button",
								"type": "string",
								"enum": [
									"none",
									"left",
									"middle",
									"right"
								],
								"description": "Mouse button."
							},
							{
								"name": "deltaX",
								"type": "number",
								"optional": true,
								"description": "X delta in DIP for mouse wheel event (default: 0)."
							},
							{
								"name": "deltaY",
								"type": "number",
								"optional": true,
								"description": "Y delta in DIP for mouse wheel event (default: 0)."
							},
							{
								"name": "modifiers",
								"type": "integer",
								"optional": true,
								"description": "Bit field representing pressed modifier keys. Alt=1, Ctrl=2, Meta/Command=4, Shift=8 (default: 0)."
							},
							{
								"name": "clickCount",
								"type": "integer",
								"optional": true,
								"description": "Number of times the mouse button was clicked (default: 0)."
							}
						],
						"description": "Emulates touch event from the mouse event parameters."
					},
					{
						"name": "synthesizePinchGesture",
						"parameters": [
							{
								"name": "x",
								"type": "integer",
								"description": "X coordinate of the start of the gesture in CSS pixels."
							},
							{
								"name": "y",
								"type": "integer",
								"description": "Y coordinate of the start of the gesture in CSS pixels."
							},
							{
								"name": "scaleFactor",
								"type": "number",
								"description": "Relative scale factor after zooming (>1.0 zooms in, <1.0 zooms out)."
							},
							{
								"name": "relativeSpeed",
								"type": "integer",
								"optional": true,
								"description": "Relative pointer speed in pixels per second (default: 800)."
							},
							{
								"name": "gestureSourceType",
								"$ref": "GestureSourceType",
								"optional": true,
								"description": "Which type of input events to be generated (default: 'default', which queries the platform for the preferred input type)."
							}
						],
						"description": "Synthesizes a pinch gesture over a time period by issuing appropriate touch events.",
						"experimental": true
					},
					{
						"name": "synthesizeScrollGesture",
						"parameters": [
							{
								"name": "x",
								"type": "integer",
								"description": "X coordinate of the start of the gesture in CSS pixels."
							},
							{
								"name": "y",
								"type": "integer",
								"description": "Y coordinate of the start of the gesture in CSS pixels."
							},
							{
								"name": "xDistance",
								"type": "integer",
								"optional": true,
								"description": "The distance to scroll along the X axis (positive to scroll left)."
							},
							{
								"name": "yDistance",
								"type": "integer",
								"optional": true,
								"description": "The distance to scroll along the Y axis (positive to scroll up)."
							},
							{
								"name": "xOverscroll",
								"type": "integer",
								"optional": true,
								"description": "The number of additional pixels to scroll back along the X axis, in addition to the given distance."
							},
							{
								"name": "yOverscroll",
								"type": "integer",
								"optional": true,
								"description": "The number of additional pixels to scroll back along the Y axis, in addition to the given distance."
							},
							{
								"name": "preventFling",
								"type": "boolean",
								"optional": true,
								"description": "Prevent fling (default: true)."
							},
							{
								"name": "speed",
								"type": "integer",
								"optional": true,
								"description": "Swipe speed in pixels per second (default: 800)."
							},
							{
								"name": "gestureSourceType",
								"$ref": "GestureSourceType",
								"optional": true,
								"description": "Which type of input events to be generated (default: 'default', which queries the platform for the preferred input type)."
							},
							{
								"name": "repeatCount",
								"type": "integer",
								"optional": true,
								"description": "The number of times to repeat the gesture (default: 0)."
							},
							{
								"name": "repeatDelayMs",
								"type": "integer",
								"optional": true,
								"description": "The number of milliseconds delay between each repeat. (default: 250)."
							},
							{
								"name": "interactionMarkerName",
								"type": "string",
								"optional": true,
								"description": "The name of the interaction markers to generate, if not empty (default: \"\")."
							}
						],
						"description": "Synthesizes a scroll gesture over a time period by issuing appropriate touch events.",
						"experimental": true
					},
					{
						"name": "synthesizeTapGesture",
						"parameters": [
							{
								"name": "x",
								"type": "integer",
								"description": "X coordinate of the start of the gesture in CSS pixels."
							},
							{
								"name": "y",
								"type": "integer",
								"description": "Y coordinate of the start of the gesture in CSS pixels."
							},
							{
								"name": "duration",
								"type": "integer",
								"optional": true,
								"description": "Duration between touchdown and touchup events in ms (default: 50)."
							},
							{
								"name": "tapCount",
								"type": "integer",
								"optional": true,
								"description": "Number of times to perform the tap (e.g. 2 for double tap, default: 1)."
							},
							{
								"name": "gestureSourceType",
								"$ref": "GestureSourceType",
								"optional": true,
								"description": "Which type of input events to be generated (default: 'default', which queries the platform for the preferred input type)."
							}
						],
						"description": "Synthesizes a tap gesture over a time period by issuing appropriate touch events.",
						"experimental": true
					}
				],
				"events": []
			},
			{
				"domain": "LayerTree",
				"experimental": true,
				"dependencies": [
					"DOM"
				],
				"types": [
					{
						"id": "LayerId",
						"type": "string",
						"description": "Unique Layer identifier."
					},
					{
						"id": "SnapshotId",
						"type": "string",
						"description": "Unique snapshot identifier."
					},
					{
						"id": "ScrollRect",
						"type": "object",
						"description": "Rectangle where scrolling happens on the main thread.",
						"properties": [
							{
								"name": "rect",
								"$ref": "DOM.Rect",
								"description": "Rectangle itself."
							},
							{
								"name": "type",
								"type": "string",
								"enum": [
									"RepaintsOnScroll",
									"TouchEventHandler",
									"WheelEventHandler"
								],
								"description": "Reason for rectangle to force scrolling on the main thread"
							}
						]
					},
					{
						"id": "PictureTile",
						"type": "object",
						"description": "Serialized fragment of layer picture along with its offset within the layer.",
						"properties": [
							{
								"name": "x",
								"type": "number",
								"description": "Offset from owning layer left boundary"
							},
							{
								"name": "y",
								"type": "number",
								"description": "Offset from owning layer top boundary"
							},
							{
								"name": "picture",
								"type": "string",
								"description": "Base64-encoded snapshot data."
							}
						]
					},
					{
						"id": "Layer",
						"type": "object",
						"description": "Information about a compositing layer.",
						"properties": [
							{
								"name": "layerId",
								"$ref": "LayerId",
								"description": "The unique id for this layer."
							},
							{
								"name": "parentLayerId",
								"$ref": "LayerId",
								"optional": true,
								"description": "The id of parent (not present for root)."
							},
							{
								"name": "backendNodeId",
								"$ref": "DOM.BackendNodeId",
								"optional": true,
								"description": "The backend id for the node associated with this layer."
							},
							{
								"name": "offsetX",
								"type": "number",
								"description": "Offset from parent layer, X coordinate."
							},
							{
								"name": "offsetY",
								"type": "number",
								"description": "Offset from parent layer, Y coordinate."
							},
							{
								"name": "width",
								"type": "number",
								"description": "Layer width."
							},
							{
								"name": "height",
								"type": "number",
								"description": "Layer height."
							},
							{
								"name": "transform",
								"type": "array",
								"items": {
									"type": "number"
								},
								"minItems": 16,
								"maxItems": 16,
								"optional": true,
								"description": "Transformation matrix for layer, default is identity matrix"
							},
							{
								"name": "anchorX",
								"type": "number",
								"optional": true,
								"description": "Transform anchor point X, absent if no transform specified"
							},
							{
								"name": "anchorY",
								"type": "number",
								"optional": true,
								"description": "Transform anchor point Y, absent if no transform specified"
							},
							{
								"name": "anchorZ",
								"type": "number",
								"optional": true,
								"description": "Transform anchor point Z, absent if no transform specified"
							},
							{
								"name": "paintCount",
								"type": "integer",
								"description": "Indicates how many time this layer has painted."
							},
							{
								"name": "drawsContent",
								"type": "boolean",
								"description": "Indicates whether this layer hosts any content, rather than being used for transform/scrolling purposes only."
							},
							{
								"name": "invisible",
								"type": "boolean",
								"optional": true,
								"description": "Set if layer is not visible."
							},
							{
								"name": "scrollRects",
								"type": "array",
								"items": {
									"$ref": "ScrollRect"
								},
								"optional": true,
								"description": "Rectangles scrolling on main thread only."
							}
						]
					},
					{
						"id": "PaintProfile",
						"type": "array",
						"description": "Array of timings, one per paint step.",
						"items": {
							"type": "number",
							"description": "A time in seconds since the end of previous step (for the first step, time since painting started)"
						}
					}
				],
				"commands": [
					{
						"name": "enable",
						"description": "Enables compositing tree inspection."
					},
					{
						"name": "disable",
						"description": "Disables compositing tree inspection."
					},
					{
						"name": "compositingReasons",
						"parameters": [
							{
								"name": "layerId",
								"$ref": "LayerId",
								"description": "The id of the layer for which we want to get the reasons it was composited."
							}
						],
						"description": "Provides the reasons why the given layer was composited.",
						"returns": [
							{
								"name": "compositingReasons",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "A list of strings specifying reasons for the given layer to become composited."
							}
						]
					},
					{
						"name": "makeSnapshot",
						"parameters": [
							{
								"name": "layerId",
								"$ref": "LayerId",
								"description": "The id of the layer."
							}
						],
						"description": "Returns the layer snapshot identifier.",
						"returns": [
							{
								"name": "snapshotId",
								"$ref": "SnapshotId",
								"description": "The id of the layer snapshot."
							}
						]
					},
					{
						"name": "loadSnapshot",
						"parameters": [
							{
								"name": "tiles",
								"type": "array",
								"items": {
									"$ref": "PictureTile"
								},
								"minItems": 1,
								"description": "An array of tiles composing the snapshot."
							}
						],
						"description": "Returns the snapshot identifier.",
						"returns": [
							{
								"name": "snapshotId",
								"$ref": "SnapshotId",
								"description": "The id of the snapshot."
							}
						]
					},
					{
						"name": "releaseSnapshot",
						"parameters": [
							{
								"name": "snapshotId",
								"$ref": "SnapshotId",
								"description": "The id of the layer snapshot."
							}
						],
						"description": "Releases layer snapshot captured by the back-end."
					},
					{
						"name": "profileSnapshot",
						"parameters": [
							{
								"name": "snapshotId",
								"$ref": "SnapshotId",
								"description": "The id of the layer snapshot."
							},
							{
								"name": "minRepeatCount",
								"type": "integer",
								"optional": true,
								"description": "The maximum number of times to replay the snapshot (1, if not specified)."
							},
							{
								"name": "minDuration",
								"type": "number",
								"optional": true,
								"description": "The minimum duration (in seconds) to replay the snapshot."
							},
							{
								"name": "clipRect",
								"$ref": "DOM.Rect",
								"optional": true,
								"description": "The clip rectangle to apply when replaying the snapshot."
							}
						],
						"returns": [
							{
								"name": "timings",
								"type": "array",
								"items": {
									"$ref": "PaintProfile"
								},
								"description": "The array of paint profiles, one per run."
							}
						]
					},
					{
						"name": "replaySnapshot",
						"parameters": [
							{
								"name": "snapshotId",
								"$ref": "SnapshotId",
								"description": "The id of the layer snapshot."
							},
							{
								"name": "fromStep",
								"type": "integer",
								"optional": true,
								"description": "The first step to replay from (replay from the very start if not specified)."
							},
							{
								"name": "toStep",
								"type": "integer",
								"optional": true,
								"description": "The last step to replay to (replay till the end if not specified)."
							},
							{
								"name": "scale",
								"type": "number",
								"optional": true,
								"description": "The scale to apply while replaying (defaults to 1)."
							}
						],
						"description": "Replays the layer snapshot and returns the resulting bitmap.",
						"returns": [
							{
								"name": "dataURL",
								"type": "string",
								"description": "A data: URL for resulting image."
							}
						]
					},
					{
						"name": "snapshotCommandLog",
						"parameters": [
							{
								"name": "snapshotId",
								"$ref": "SnapshotId",
								"description": "The id of the layer snapshot."
							}
						],
						"description": "Replays the layer snapshot and returns canvas log.",
						"returns": [
							{
								"name": "commandLog",
								"type": "array",
								"items": {
									"type": "object"
								},
								"description": "The array of canvas function calls."
							}
						]
					}
				],
				"events": [
					{
						"name": "layerTreeDidChange",
						"parameters": [
							{
								"name": "layers",
								"type": "array",
								"items": {
									"$ref": "Layer"
								},
								"optional": true,
								"description": "Layer tree, absent if not in the comspositing mode."
							}
						]
					},
					{
						"name": "layerPainted",
						"parameters": [
							{
								"name": "layerId",
								"$ref": "LayerId",
								"description": "The id of the painted layer."
							},
							{
								"name": "clip",
								"$ref": "DOM.Rect",
								"description": "Clip rectangle."
							}
						]
					}
				]
			},
			{
				"domain": "DeviceOrientation",
				"experimental": true,
				"commands": [
					{
						"name": "setDeviceOrientationOverride",
						"description": "Overrides the Device Orientation.",
						"parameters": [
							{
								"name": "alpha",
								"type": "number",
								"description": "Mock alpha"
							},
							{
								"name": "beta",
								"type": "number",
								"description": "Mock beta"
							},
							{
								"name": "gamma",
								"type": "number",
								"description": "Mock gamma"
							}
						]
					},
					{
						"name": "clearDeviceOrientationOverride",
						"description": "Clears the overridden Device Orientation."
					}
				]
			},
			{
				"domain": "Tracing",
				"dependencies": [
					"IO"
				],
				"experimental": true,
				"types": [
					{
						"id": "MemoryDumpConfig",
						"type": "object",
						"description": "Configuration for memory dump. Used only when \"memory-infra\" category is enabled."
					},
					{
						"id": "TraceConfig",
						"type": "object",
						"properties": [
							{
								"name": "recordMode",
								"type": "string",
								"optional": true,
								"enum": [
									"recordUntilFull",
									"recordContinuously",
									"recordAsMuchAsPossible",
									"echoToConsole"
								],
								"description": "Controls how the trace buffer stores data."
							},
							{
								"name": "enableSampling",
								"type": "boolean",
								"optional": true,
								"description": "Turns on JavaScript stack sampling."
							},
							{
								"name": "enableSystrace",
								"type": "boolean",
								"optional": true,
								"description": "Turns on system tracing."
							},
							{
								"name": "enableArgumentFilter",
								"type": "boolean",
								"optional": true,
								"description": "Turns on argument filter."
							},
							{
								"name": "includedCategories",
								"type": "array",
								"items": {
									"type": "string"
								},
								"optional": true,
								"description": "Included category filters."
							},
							{
								"name": "excludedCategories",
								"type": "array",
								"items": {
									"type": "string"
								},
								"optional": true,
								"description": "Excluded category filters."
							},
							{
								"name": "syntheticDelays",
								"type": "array",
								"items": {
									"type": "string"
								},
								"optional": true,
								"description": "Configuration to synthesize the delays in tracing."
							},
							{
								"name": "memoryDumpConfig",
								"$ref": "MemoryDumpConfig",
								"optional": true,
								"description": "Configuration for memory dump triggers. Used only when \"memory-infra\" category is enabled."
							}
						]
					}
				],
				"commands": [
					{
						"name": "start",
						"description": "Start trace events collection.",
						"parameters": [
							{
								"name": "categories",
								"type": "string",
								"optional": true,
								"deprecated": true,
								"description": "Category/tag filter"
							},
							{
								"name": "options",
								"type": "string",
								"optional": true,
								"deprecated": true,
								"description": "Tracing options"
							},
							{
								"name": "bufferUsageReportingInterval",
								"type": "number",
								"optional": true,
								"description": "If set, the agent will issue bufferUsage events at this interval, specified in milliseconds"
							},
							{
								"name": "transferMode",
								"type": "string",
								"enum": [
									"ReportEvents",
									"ReturnAsStream"
								],
								"optional": true,
								"description": "Whether to report trace events as series of dataCollected events or to save trace to a stream (defaults to <code>ReportEvents</code>)."
							},
							{
								"name": "traceConfig",
								"$ref": "TraceConfig",
								"optional": true,
								"description": ""
							}
						]
					},
					{
						"name": "end",
						"description": "Stop trace events collection."
					},
					{
						"name": "getCategories",
						"description": "Gets supported tracing categories.",
						"returns": [
							{
								"name": "categories",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "A list of supported tracing categories."
							}
						]
					},
					{
						"name": "requestMemoryDump",
						"description": "Request a global memory dump.",
						"returns": [
							{
								"name": "dumpGuid",
								"type": "string",
								"description": "GUID of the resulting global memory dump."
							},
							{
								"name": "success",
								"type": "boolean",
								"description": "True iff the global memory dump succeeded."
							}
						]
					},
					{
						"name": "recordClockSyncMarker",
						"description": "Record a clock sync marker in the trace.",
						"parameters": [
							{
								"name": "syncId",
								"type": "string",
								"description": "The ID of this clock sync marker"
							}
						]
					}
				],
				"events": [
					{
						"name": "dataCollected",
						"parameters": [
							{
								"name": "value",
								"type": "array",
								"items": {
									"type": "object"
								}
							}
						],
						"description": "Contains an bucket of collected trace events. When tracing is stopped collected events will be send as a sequence of dataCollected events followed by tracingComplete event."
					},
					{
						"name": "tracingComplete",
						"description": "Signals that tracing is stopped and there is no trace buffers pending flush, all data were delivered via dataCollected events.",
						"parameters": [
							{
								"name": "stream",
								"$ref": "IO.StreamHandle",
								"optional": true,
								"description": "A handle of the stream that holds resulting trace data."
							}
						]
					},
					{
						"name": "bufferUsage",
						"parameters": [
							{
								"name": "percentFull",
								"type": "number",
								"optional": true,
								"description": "A number in range [0..1] that indicates the used size of event buffer as a fraction of its total size."
							},
							{
								"name": "eventCount",
								"type": "number",
								"optional": true,
								"description": "An approximate number of events in the trace log."
							},
							{
								"name": "value",
								"type": "number",
								"optional": true,
								"description": "A number in range [0..1] that indicates the used size of event buffer as a fraction of its total size."
							}
						]
					}
				]
			},
			{
				"domain": "Animation",
				"experimental": true,
				"dependencies": [
					"Runtime",
					"DOM"
				],
				"types": [
					{
						"id": "Animation",
						"type": "object",
						"experimental": true,
						"properties": [
							{
								"name": "id",
								"type": "string",
								"description": "<code>Animation</code>'s id."
							},
							{
								"name": "name",
								"type": "string",
								"description": "<code>Animation</code>'s name."
							},
							{
								"name": "pausedState",
								"type": "boolean",
								"experimental": true,
								"description": "<code>Animation</code>'s internal paused state."
							},
							{
								"name": "playState",
								"type": "string",
								"description": "<code>Animation</code>'s play state."
							},
							{
								"name": "playbackRate",
								"type": "number",
								"description": "<code>Animation</code>'s playback rate."
							},
							{
								"name": "startTime",
								"type": "number",
								"description": "<code>Animation</code>'s start time."
							},
							{
								"name": "currentTime",
								"type": "number",
								"description": "<code>Animation</code>'s current time."
							},
							{
								"name": "source",
								"$ref": "AnimationEffect",
								"description": "<code>Animation</code>'s source animation node."
							},
							{
								"name": "type",
								"type": "string",
								"enum": [
									"CSSTransition",
									"CSSAnimation",
									"WebAnimation"
								],
								"description": "Animation type of <code>Animation</code>."
							},
							{
								"name": "cssId",
								"type": "string",
								"optional": true,
								"description": "A unique ID for <code>Animation</code> representing the sources that triggered this CSS animation/transition."
							}
						],
						"description": "Animation instance."
					},
					{
						"id": "AnimationEffect",
						"type": "object",
						"experimental": true,
						"properties": [
							{
								"name": "delay",
								"type": "number",
								"description": "<code>AnimationEffect</code>'s delay."
							},
							{
								"name": "endDelay",
								"type": "number",
								"description": "<code>AnimationEffect</code>'s end delay."
							},
							{
								"name": "iterationStart",
								"type": "number",
								"description": "<code>AnimationEffect</code>'s iteration start."
							},
							{
								"name": "iterations",
								"type": "number",
								"description": "<code>AnimationEffect</code>'s iterations."
							},
							{
								"name": "duration",
								"type": "number",
								"description": "<code>AnimationEffect</code>'s iteration duration."
							},
							{
								"name": "direction",
								"type": "string",
								"description": "<code>AnimationEffect</code>'s playback direction."
							},
							{
								"name": "fill",
								"type": "string",
								"description": "<code>AnimationEffect</code>'s fill mode."
							},
							{
								"name": "backendNodeId",
								"$ref": "DOM.BackendNodeId",
								"description": "<code>AnimationEffect</code>'s target node."
							},
							{
								"name": "keyframesRule",
								"$ref": "KeyframesRule",
								"optional": true,
								"description": "<code>AnimationEffect</code>'s keyframes."
							},
							{
								"name": "easing",
								"type": "string",
								"description": "<code>AnimationEffect</code>'s timing function."
							}
						],
						"description": "AnimationEffect instance"
					},
					{
						"id": "KeyframesRule",
						"type": "object",
						"properties": [
							{
								"name": "name",
								"type": "string",
								"optional": true,
								"description": "CSS keyframed animation's name."
							},
							{
								"name": "keyframes",
								"type": "array",
								"items": {
									"$ref": "KeyframeStyle"
								},
								"description": "List of animation keyframes."
							}
						],
						"description": "Keyframes Rule"
					},
					{
						"id": "KeyframeStyle",
						"type": "object",
						"properties": [
							{
								"name": "offset",
								"type": "string",
								"description": "Keyframe's time offset."
							},
							{
								"name": "easing",
								"type": "string",
								"description": "<code>AnimationEffect</code>'s timing function."
							}
						],
						"description": "Keyframe Style"
					}
				],
				"commands": [
					{
						"name": "enable",
						"description": "Enables animation domain notifications."
					},
					{
						"name": "disable",
						"description": "Disables animation domain notifications."
					},
					{
						"name": "getPlaybackRate",
						"returns": [
							{
								"name": "playbackRate",
								"type": "number",
								"description": "Playback rate for animations on page."
							}
						],
						"description": "Gets the playback rate of the document timeline."
					},
					{
						"name": "setPlaybackRate",
						"parameters": [
							{
								"name": "playbackRate",
								"type": "number",
								"description": "Playback rate for animations on page"
							}
						],
						"description": "Sets the playback rate of the document timeline."
					},
					{
						"name": "getCurrentTime",
						"parameters": [
							{
								"name": "id",
								"type": "string",
								"description": "Id of animation."
							}
						],
						"returns": [
							{
								"name": "currentTime",
								"type": "number",
								"description": "Current time of the page."
							}
						],
						"description": "Returns the current time of the an animation."
					},
					{
						"name": "setPaused",
						"parameters": [
							{
								"name": "animations",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "Animations to set the pause state of."
							},
							{
								"name": "paused",
								"type": "boolean",
								"description": "Paused state to set to."
							}
						],
						"description": "Sets the paused state of a set of animations."
					},
					{
						"name": "setTiming",
						"parameters": [
							{
								"name": "animationId",
								"type": "string",
								"description": "Animation id."
							},
							{
								"name": "duration",
								"type": "number",
								"description": "Duration of the animation."
							},
							{
								"name": "delay",
								"type": "number",
								"description": "Delay of the animation."
							}
						],
						"description": "Sets the timing of an animation node."
					},
					{
						"name": "seekAnimations",
						"parameters": [
							{
								"name": "animations",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "List of animation ids to seek."
							},
							{
								"name": "currentTime",
								"type": "number",
								"description": "Set the current time of each animation."
							}
						],
						"description": "Seek a set of animations to a particular time within each animation."
					},
					{
						"name": "releaseAnimations",
						"parameters": [
							{
								"name": "animations",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "List of animation ids to seek."
							}
						],
						"description": "Releases a set of animations to no longer be manipulated."
					},
					{
						"name": "resolveAnimation",
						"parameters": [
							{
								"name": "animationId",
								"type": "string",
								"description": "Animation id."
							}
						],
						"returns": [
							{
								"name": "remoteObject",
								"$ref": "Runtime.RemoteObject",
								"description": "Corresponding remote object."
							}
						],
						"description": "Gets the remote object of the Animation."
					}
				],
				"events": [
					{
						"name": "animationCreated",
						"parameters": [
							{
								"name": "id",
								"type": "string",
								"description": "Id of the animation that was created."
							}
						],
						"description": "Event for each animation that has been created."
					},
					{
						"name": "animationStarted",
						"parameters": [
							{
								"name": "animation",
								"$ref": "Animation",
								"description": "Animation that was started."
							}
						],
						"description": "Event for animation that has been started."
					},
					{
						"name": "animationCanceled",
						"parameters": [
							{
								"name": "id",
								"type": "string",
								"description": "Id of the animation that was cancelled."
							}
						],
						"description": "Event for when an animation has been cancelled."
					}
				]
			},
			{
				"domain": "Accessibility",
				"experimental": true,
				"dependencies": [
					"DOM"
				],
				"types": [
					{
						"id": "AXNodeId",
						"type": "string",
						"description": "Unique accessibility node identifier."
					},
					{
						"id": "AXValueType",
						"type": "string",
						"enum": [
							"boolean",
							"tristate",
							"booleanOrUndefined",
							"idref",
							"idrefList",
							"integer",
							"node",
							"nodeList",
							"number",
							"string",
							"computedString",
							"token",
							"tokenList",
							"domRelation",
							"role",
							"internalRole",
							"valueUndefined"
						],
						"description": "Enum of possible property types."
					},
					{
						"id": "AXValueSourceType",
						"type": "string",
						"enum": [
							"attribute",
							"implicit",
							"style",
							"contents",
							"placeholder",
							"relatedElement"
						],
						"description": "Enum of possible property sources."
					},
					{
						"id": "AXValueNativeSourceType",
						"type": "string",
						"enum": [
							"figcaption",
							"label",
							"labelfor",
							"labelwrapped",
							"legend",
							"tablecaption",
							"title",
							"other"
						],
						"description": "Enum of possible native property sources (as a subtype of a particular AXValueSourceType)."
					},
					{
						"id": "AXValueSource",
						"type": "object",
						"properties": [
							{
								"name": "type",
								"$ref": "AXValueSourceType",
								"description": "What type of source this is."
							},
							{
								"name": "value",
								"$ref": "AXValue",
								"description": "The value of this property source.",
								"optional": true
							},
							{
								"name": "attribute",
								"type": "string",
								"description": "The name of the relevant attribute, if any.",
								"optional": true
							},
							{
								"name": "attributeValue",
								"$ref": "AXValue",
								"description": "The value of the relevant attribute, if any.",
								"optional": true
							},
							{
								"name": "superseded",
								"type": "boolean",
								"description": "Whether this source is superseded by a higher priority source.",
								"optional": true
							},
							{
								"name": "nativeSource",
								"$ref": "AXValueNativeSourceType",
								"description": "The native markup source for this value, e.g. a <label> element.",
								"optional": true
							},
							{
								"name": "nativeSourceValue",
								"$ref": "AXValue",
								"description": "The value, such as a node or node list, of the native source.",
								"optional": true
							},
							{
								"name": "invalid",
								"type": "boolean",
								"description": "Whether the value for this property is invalid.",
								"optional": true
							},
							{
								"name": "invalidReason",
								"type": "string",
								"description": "Reason for the value being invalid, if it is.",
								"optional": true
							}
						],
						"description": "A single source for a computed AX property."
					},
					{
						"id": "AXRelatedNode",
						"type": "object",
						"properties": [
							{
								"name": "backendDOMNodeId",
								"$ref": "DOM.BackendNodeId",
								"description": "The BackendNodeId of the related DOM node."
							},
							{
								"name": "idref",
								"type": "string",
								"description": "The IDRef value provided, if any.",
								"optional": true
							},
							{
								"name": "text",
								"type": "string",
								"description": "The text alternative of this node in the current context.",
								"optional": true
							}
						]
					},
					{
						"id": "AXProperty",
						"type": "object",
						"properties": [
							{
								"name": "name",
								"type": "string",
								"description": "The name of this property."
							},
							{
								"name": "value",
								"$ref": "AXValue",
								"description": "The value of this property."
							}
						]
					},
					{
						"id": "AXValue",
						"type": "object",
						"properties": [
							{
								"name": "type",
								"$ref": "AXValueType",
								"description": "The type of this value."
							},
							{
								"name": "value",
								"type": "any",
								"description": "The computed value of this property.",
								"optional": true
							},
							{
								"name": "relatedNodes",
								"type": "array",
								"items": {
									"$ref": "AXRelatedNode"
								},
								"description": "One or more related nodes, if applicable.",
								"optional": true
							},
							{
								"name": "sources",
								"type": "array",
								"items": {
									"$ref": "AXValueSource"
								},
								"description": "The sources which contributed to the computation of this property.",
								"optional": true
							}
						],
						"description": "A single computed AX property."
					},
					{
						"id": "AXGlobalStates",
						"type": "string",
						"enum": [
							"disabled",
							"hidden",
							"hiddenRoot",
							"invalid"
						],
						"description": "States which apply to every AX node."
					},
					{
						"id": "AXLiveRegionAttributes",
						"type": "string",
						"enum": [
							"live",
							"atomic",
							"relevant",
							"busy",
							"root"
						],
						"description": "Attributes which apply to nodes in live regions."
					},
					{
						"id": "AXWidgetAttributes",
						"type": "string",
						"enum": [
							"autocomplete",
							"haspopup",
							"level",
							"multiselectable",
							"orientation",
							"multiline",
							"readonly",
							"required",
							"valuemin",
							"valuemax",
							"valuetext"
						],
						"description": "Attributes which apply to widgets."
					},
					{
						"id": "AXWidgetStates",
						"type": "string",
						"enum": [
							"checked",
							"expanded",
							"pressed",
							"selected"
						],
						"description": "States which apply to widgets."
					},
					{
						"id": "AXRelationshipAttributes",
						"type": "string",
						"enum": [
							"activedescendant",
							"flowto",
							"controls",
							"describedby",
							"labelledby",
							"owns"
						],
						"description": "Relationships between elements other than parent/child/sibling."
					},
					{
						"id": "AXNode",
						"type": "object",
						"properties": [
							{
								"name": "nodeId",
								"$ref": "AXNodeId",
								"description": "Unique identifier for this node."
							},
							{
								"name": "ignored",
								"type": "boolean",
								"description": "Whether this node is ignored for accessibility"
							},
							{
								"name": "ignoredReasons",
								"type": "array",
								"items": {
									"$ref": "AXProperty"
								},
								"description": "Collection of reasons why this node is hidden.",
								"optional": true
							},
							{
								"name": "role",
								"$ref": "AXValue",
								"description": "This <code>Node</code>'s role, whether explicit or implicit.",
								"optional": true
							},
							{
								"name": "name",
								"$ref": "AXValue",
								"description": "The accessible name for this <code>Node</code>.",
								"optional": true
							},
							{
								"name": "description",
								"$ref": "AXValue",
								"description": "The accessible description for this <code>Node</code>.",
								"optional": true
							},
							{
								"name": "value",
								"$ref": "AXValue",
								"description": "The value for this <code>Node</code>.",
								"optional": true
							},
							{
								"name": "properties",
								"type": "array",
								"items": {
									"$ref": "AXProperty"
								},
								"description": "All other properties",
								"optional": true
							},
							{
								"name": "childIds",
								"type": "array",
								"items": {
									"$ref": "AXNodeId"
								},
								"description": "IDs for each of this node's child nodes.",
								"optional": true
							},
							{
								"name": "backendDOMNodeId",
								"$ref": "DOM.BackendNodeId",
								"description": "The backend ID for the associated DOM node, if any.",
								"optional": true
							}
						],
						"description": "A node in the accessibility tree."
					}
				],
				"commands": [
					{
						"name": "getPartialAXTree",
						"parameters": [
							{
								"name": "nodeId",
								"$ref": "DOM.NodeId",
								"description": "ID of node to get the partial accessibility tree for."
							},
							{
								"name": "fetchRelatives",
								"type": "boolean",
								"description": "Whether to fetch this nodes ancestors, siblings and children. Defaults to true.",
								"optional": true
							}
						],
						"returns": [
							{
								"name": "nodes",
								"type": "array",
								"items": {
									"$ref": "AXNode"
								},
								"description": "The <code>Accessibility.AXNode</code> for this DOM node, if it exists, plus its ancestors, siblings and children, if requested."
							}
						],
						"description": "Fetches the accessibility node and partial accessibility tree for this DOM node, if it exists.",
						"experimental": true
					}
				]
			},
			{
				"domain": "Storage",
				"experimental": true,
				"types": [
					{
						"id": "StorageType",
						"type": "string",
						"enum": [
							"appcache",
							"cookies",
							"file_systems",
							"indexeddb",
							"local_storage",
							"shader_cache",
							"websql",
							"service_workers",
							"cache_storage",
							"all"
						],
						"description": "Enum of possible storage types."
					}
				],
				"commands": [
					{
						"name": "clearDataForOrigin",
						"parameters": [
							{
								"name": "origin",
								"type": "string",
								"description": "Security origin."
							},
							{
								"name": "storageTypes",
								"type": "string",
								"description": "Comma separated origin names."
							}
						],
						"description": "Clears storage for origin."
					}
				]
			},
			{
				"domain": "Log",
				"description": "Provides access to log entries.",
				"dependencies": [
					"Runtime",
					"Network"
				],
				"experimental": true,
				"types": [
					{
						"id": "LogEntry",
						"type": "object",
						"description": "Log entry.",
						"properties": [
							{
								"name": "source",
								"type": "string",
								"enum": [
									"xml",
									"javascript",
									"network",
									"storage",
									"appcache",
									"rendering",
									"security",
									"deprecation",
									"worker",
									"violation",
									"intervention",
									"other"
								],
								"description": "Log entry source."
							},
							{
								"name": "level",
								"type": "string",
								"enum": [
									"log",
									"warning",
									"error",
									"debug",
									"info"
								],
								"description": "Log entry severity."
							},
							{
								"name": "text",
								"type": "string",
								"description": "Logged text."
							},
							{
								"name": "timestamp",
								"$ref": "Runtime.Timestamp",
								"description": "Timestamp when this entry was added."
							},
							{
								"name": "url",
								"type": "string",
								"optional": true,
								"description": "URL of the resource if known."
							},
							{
								"name": "lineNumber",
								"type": "integer",
								"optional": true,
								"description": "Line number in the resource."
							},
							{
								"name": "stackTrace",
								"$ref": "Runtime.StackTrace",
								"optional": true,
								"description": "JavaScript stack trace."
							},
							{
								"name": "networkRequestId",
								"$ref": "Network.RequestId",
								"optional": true,
								"description": "Identifier of the network request associated with this entry."
							},
							{
								"name": "workerId",
								"type": "string",
								"optional": true,
								"description": "Identifier of the worker associated with this entry."
							}
						]
					},
					{
						"id": "ViolationSetting",
						"type": "object",
						"description": "Violation configuration setting.",
						"properties": [
							{
								"name": "name",
								"type": "string",
								"enum": [
									"longTask",
									"longLayout",
									"blockedEvent",
									"blockedParser",
									"handler",
									"recurringHandler"
								],
								"description": "Violation type."
							},
							{
								"name": "threshold",
								"type": "number",
								"description": "Time threshold to trigger upon."
							}
						]
					}
				],
				"commands": [
					{
						"name": "enable",
						"description": "Enables log domain, sends the entries collected so far to the client by means of the <code>entryAdded</code> notification."
					},
					{
						"name": "disable",
						"description": "Disables log domain, prevents further log entries from being reported to the client."
					},
					{
						"name": "clear",
						"description": "Clears the log."
					},
					{
						"name": "startViolationsReport",
						"parameters": [
							{
								"name": "config",
								"type": "array",
								"items": {
									"$ref": "ViolationSetting"
								},
								"description": "Configuration for violations."
							}
						],
						"description": "start violation reporting."
					},
					{
						"name": "stopViolationsReport",
						"description": "Stop violation reporting."
					}
				],
				"events": [
					{
						"name": "entryAdded",
						"parameters": [
							{
								"name": "entry",
								"$ref": "LogEntry",
								"description": "The entry."
							}
						],
						"description": "Issued when new message was logged."
					}
				]
			},
			{
				"domain": "SystemInfo",
				"description": "The SystemInfo domain defines methods and events for querying low-level system information.",
				"experimental": true,
				"types": [
					{
						"id": "GPUDevice",
						"type": "object",
						"properties": [
							{
								"name": "vendorId",
								"type": "number",
								"description": "PCI ID of the GPU vendor, if available; 0 otherwise."
							},
							{
								"name": "deviceId",
								"type": "number",
								"description": "PCI ID of the GPU device, if available; 0 otherwise."
							},
							{
								"name": "vendorString",
								"type": "string",
								"description": "String description of the GPU vendor, if the PCI ID is not available."
							},
							{
								"name": "deviceString",
								"type": "string",
								"description": "String description of the GPU device, if the PCI ID is not available."
							}
						],
						"description": "Describes a single graphics processor (GPU)."
					},
					{
						"id": "GPUInfo",
						"type": "object",
						"properties": [
							{
								"name": "devices",
								"type": "array",
								"items": {
									"$ref": "GPUDevice"
								},
								"description": "The graphics devices on the system. Element 0 is the primary GPU."
							},
							{
								"name": "auxAttributes",
								"type": "object",
								"optional": true,
								"description": "An optional dictionary of additional GPU related attributes."
							},
							{
								"name": "featureStatus",
								"type": "object",
								"optional": true,
								"description": "An optional dictionary of graphics features and their status."
							},
							{
								"name": "driverBugWorkarounds",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "An optional array of GPU driver bug workarounds."
							}
						],
						"description": "Provides information about the GPU(s) on the system."
					}
				],
				"commands": [
					{
						"name": "getInfo",
						"description": "Returns information about the system.",
						"returns": [
							{
								"name": "gpu",
								"$ref": "GPUInfo",
								"description": "Information about the GPUs on the system."
							},
							{
								"name": "modelName",
								"type": "string",
								"description": "A platform-dependent description of the model of the machine. On Mac OS, this is, for example, 'MacBookPro'. Will be the empty string if not supported."
							},
							{
								"name": "modelVersion",
								"type": "string",
								"description": "A platform-dependent description of the version of the machine. On Mac OS, this is, for example, '10.1'. Will be the empty string if not supported."
							}
						]
					}
				]
			},
			{
				"domain": "Tethering",
				"description": "The Tethering domain defines methods and events for browser port binding.",
				"experimental": true,
				"commands": [
					{
						"name": "bind",
						"description": "Request browser port binding.",
						"parameters": [
							{
								"name": "port",
								"type": "integer",
								"description": "Port number to bind."
							}
						]
					},
					{
						"name": "unbind",
						"description": "Request browser port unbinding.",
						"parameters": [
							{
								"name": "port",
								"type": "integer",
								"description": "Port number to unbind."
							}
						]
					}
				],
				"events": [
					{
						"name": "accepted",
						"description": "Informs that port was successfully bound and got a specified connection id.",
						"parameters": [
							{
								"name": "port",
								"type": "integer",
								"description": "Port number that was successfully bound."
							},
							{
								"name": "connectionId",
								"type": "string",
								"description": "Connection id to be used."
							}
						]
					}
				]
			},
			{
				"domain": "Schema",
				"description": "Provides information about the protocol schema.",
				"types": [
					{
						"id": "Domain",
						"type": "object",
						"description": "Description of the protocol domain.",
						"properties": [
							{
								"name": "name",
								"type": "string",
								"description": "Domain name."
							},
							{
								"name": "version",
								"type": "string",
								"description": "Domain version."
							}
						]
					}
				],
				"commands": [
					{
						"name": "getDomains",
						"description": "Returns supported domains.",
						"handlers": [
							"browser",
							"renderer"
						],
						"returns": [
							{
								"name": "domains",
								"type": "array",
								"items": {
									"$ref": "Domain"
								},
								"description": "List of supported domains."
							}
						]
					}
				]
			},
			{
				"domain": "Runtime",
				"description": "Runtime domain exposes JavaScript runtime by means of remote evaluation and mirror objects. Evaluation results are returned as mirror object that expose object type, string representation and unique identifier that can be used for further object reference. Original objects are maintained in memory unless they are either explicitly released or are released along with the other objects in their object group.",
				"types": [
					{
						"id": "ScriptId",
						"type": "string",
						"description": "Unique script identifier."
					},
					{
						"id": "RemoteObjectId",
						"type": "string",
						"description": "Unique object identifier."
					},
					{
						"id": "UnserializableValue",
						"type": "string",
						"enum": [
							"Infinity",
							"NaN",
							"-Infinity",
							"-0"
						],
						"description": "Primitive value which cannot be JSON-stringified."
					},
					{
						"id": "RemoteObject",
						"type": "object",
						"description": "Mirror object referencing original JavaScript object.",
						"properties": [
							{
								"name": "type",
								"type": "string",
								"enum": [
									"object",
									"function",
									"undefined",
									"string",
									"number",
									"boolean",
									"symbol"
								],
								"description": "Object type."
							},
							{
								"name": "subtype",
								"type": "string",
								"optional": true,
								"enum": [
									"array",
									"null",
									"node",
									"regexp",
									"date",
									"map",
									"set",
									"iterator",
									"generator",
									"error",
									"proxy",
									"promise",
									"typedarray"
								],
								"description": "Object subtype hint. Specified for <code>object</code> type values only."
							},
							{
								"name": "className",
								"type": "string",
								"optional": true,
								"description": "Object class (constructor) name. Specified for <code>object</code> type values only."
							},
							{
								"name": "value",
								"type": "any",
								"optional": true,
								"description": "Remote object value in case of primitive values or JSON values (if it was requested)."
							},
							{
								"name": "unserializableValue",
								"$ref": "UnserializableValue",
								"optional": true,
								"description": "Primitive value which can not be JSON-stringified does not have <code>value</code>, but gets this property."
							},
							{
								"name": "description",
								"type": "string",
								"optional": true,
								"description": "String representation of the object."
							},
							{
								"name": "objectId",
								"$ref": "RemoteObjectId",
								"optional": true,
								"description": "Unique object identifier (for non-primitive values)."
							},
							{
								"name": "preview",
								"$ref": "ObjectPreview",
								"optional": true,
								"description": "Preview containing abbreviated property values. Specified for <code>object</code> type values only.",
								"experimental": true
							},
							{
								"name": "customPreview",
								"$ref": "CustomPreview",
								"optional": true,
								"experimental": true
							}
						]
					},
					{
						"id": "CustomPreview",
						"type": "object",
						"experimental": true,
						"properties": [
							{
								"name": "header",
								"type": "string"
							},
							{
								"name": "hasBody",
								"type": "boolean"
							},
							{
								"name": "formatterObjectId",
								"$ref": "RemoteObjectId"
							},
							{
								"name": "bindRemoteObjectFunctionId",
								"$ref": "RemoteObjectId"
							},
							{
								"name": "configObjectId",
								"$ref": "RemoteObjectId",
								"optional": true
							}
						]
					},
					{
						"id": "ObjectPreview",
						"type": "object",
						"experimental": true,
						"description": "Object containing abbreviated remote object value.",
						"properties": [
							{
								"name": "type",
								"type": "string",
								"enum": [
									"object",
									"function",
									"undefined",
									"string",
									"number",
									"boolean",
									"symbol"
								],
								"description": "Object type."
							},
							{
								"name": "subtype",
								"type": "string",
								"optional": true,
								"enum": [
									"array",
									"null",
									"node",
									"regexp",
									"date",
									"map",
									"set",
									"iterator",
									"generator",
									"error"
								],
								"description": "Object subtype hint. Specified for <code>object</code> type values only."
							},
							{
								"name": "description",
								"type": "string",
								"optional": true,
								"description": "String representation of the object."
							},
							{
								"name": "overflow",
								"type": "boolean",
								"description": "True iff some of the properties or entries of the original object did not fit."
							},
							{
								"name": "properties",
								"type": "array",
								"items": {
									"$ref": "PropertyPreview"
								},
								"description": "List of the properties."
							},
							{
								"name": "entries",
								"type": "array",
								"items": {
									"$ref": "EntryPreview"
								},
								"optional": true,
								"description": "List of the entries. Specified for <code>map</code> and <code>set</code> subtype values only."
							}
						]
					},
					{
						"id": "PropertyPreview",
						"type": "object",
						"experimental": true,
						"properties": [
							{
								"name": "name",
								"type": "string",
								"description": "Property name."
							},
							{
								"name": "type",
								"type": "string",
								"enum": [
									"object",
									"function",
									"undefined",
									"string",
									"number",
									"boolean",
									"symbol",
									"accessor"
								],
								"description": "Object type. Accessor means that the property itself is an accessor property."
							},
							{
								"name": "value",
								"type": "string",
								"optional": true,
								"description": "User-friendly property value string."
							},
							{
								"name": "valuePreview",
								"$ref": "ObjectPreview",
								"optional": true,
								"description": "Nested value preview."
							},
							{
								"name": "subtype",
								"type": "string",
								"optional": true,
								"enum": [
									"array",
									"null",
									"node",
									"regexp",
									"date",
									"map",
									"set",
									"iterator",
									"generator",
									"error"
								],
								"description": "Object subtype hint. Specified for <code>object</code> type values only."
							}
						]
					},
					{
						"id": "EntryPreview",
						"type": "object",
						"experimental": true,
						"properties": [
							{
								"name": "key",
								"$ref": "ObjectPreview",
								"optional": true,
								"description": "Preview of the key. Specified for map-like collection entries."
							},
							{
								"name": "value",
								"$ref": "ObjectPreview",
								"description": "Preview of the value."
							}
						]
					},
					{
						"id": "PropertyDescriptor",
						"type": "object",
						"description": "Object property descriptor.",
						"properties": [
							{
								"name": "name",
								"type": "string",
								"description": "Property name or symbol description."
							},
							{
								"name": "value",
								"$ref": "RemoteObject",
								"optional": true,
								"description": "The value associated with the property."
							},
							{
								"name": "writable",
								"type": "boolean",
								"optional": true,
								"description": "True if the value associated with the property may be changed (data descriptors only)."
							},
							{
								"name": "get",
								"$ref": "RemoteObject",
								"optional": true,
								"description": "A function which serves as a getter for the property, or <code>undefined</code> if there is no getter (accessor descriptors only)."
							},
							{
								"name": "set",
								"$ref": "RemoteObject",
								"optional": true,
								"description": "A function which serves as a setter for the property, or <code>undefined</code> if there is no setter (accessor descriptors only)."
							},
							{
								"name": "configurable",
								"type": "boolean",
								"description": "True if the type of this property descriptor may be changed and if the property may be deleted from the corresponding object."
							},
							{
								"name": "enumerable",
								"type": "boolean",
								"description": "True if this property shows up during enumeration of the properties on the corresponding object."
							},
							{
								"name": "wasThrown",
								"type": "boolean",
								"optional": true,
								"description": "True if the result was thrown during the evaluation."
							},
							{
								"name": "isOwn",
								"optional": true,
								"type": "boolean",
								"description": "True if the property is owned for the object."
							},
							{
								"name": "symbol",
								"$ref": "RemoteObject",
								"optional": true,
								"description": "Property symbol object, if the property is of the <code>symbol</code> type."
							}
						]
					},
					{
						"id": "InternalPropertyDescriptor",
						"type": "object",
						"description": "Object internal property descriptor. This property isn't normally visible in JavaScript code.",
						"properties": [
							{
								"name": "name",
								"type": "string",
								"description": "Conventional property name."
							},
							{
								"name": "value",
								"$ref": "RemoteObject",
								"optional": true,
								"description": "The value associated with the property."
							}
						]
					},
					{
						"id": "CallArgument",
						"type": "object",
						"description": "Represents function call argument. Either remote object id <code>objectId</code>, primitive <code>value</code>, unserializable primitive value or neither of (for undefined) them should be specified.",
						"properties": [
							{
								"name": "value",
								"type": "any",
								"optional": true,
								"description": "Primitive value."
							},
							{
								"name": "unserializableValue",
								"$ref": "UnserializableValue",
								"optional": true,
								"description": "Primitive value which can not be JSON-stringified."
							},
							{
								"name": "objectId",
								"$ref": "RemoteObjectId",
								"optional": true,
								"description": "Remote object handle."
							}
						]
					},
					{
						"id": "ExecutionContextId",
						"type": "integer",
						"description": "Id of an execution context."
					},
					{
						"id": "ExecutionContextDescription",
						"type": "object",
						"description": "Description of an isolated world.",
						"properties": [
							{
								"name": "id",
								"$ref": "ExecutionContextId",
								"description": "Unique id of the execution context. It can be used to specify in which execution context script evaluation should be performed."
							},
							{
								"name": "origin",
								"type": "string",
								"description": "Execution context origin."
							},
							{
								"name": "name",
								"type": "string",
								"description": "Human readable name describing given context."
							},
							{
								"name": "auxData",
								"type": "object",
								"optional": true,
								"description": "Embedder-specific auxiliary data."
							}
						]
					},
					{
						"id": "ExceptionDetails",
						"type": "object",
						"description": "Detailed information about exception (or error) that was thrown during script compilation or execution.",
						"properties": [
							{
								"name": "exceptionId",
								"type": "integer",
								"description": "Exception id."
							},
							{
								"name": "text",
								"type": "string",
								"description": "Exception text, which should be used together with exception object when available."
							},
							{
								"name": "lineNumber",
								"type": "integer",
								"description": "Line number of the exception location (0-based)."
							},
							{
								"name": "columnNumber",
								"type": "integer",
								"description": "Column number of the exception location (0-based)."
							},
							{
								"name": "scriptId",
								"$ref": "ScriptId",
								"optional": true,
								"description": "Script ID of the exception location."
							},
							{
								"name": "url",
								"type": "string",
								"optional": true,
								"description": "URL of the exception location, to be used when the script was not reported."
							},
							{
								"name": "stackTrace",
								"$ref": "StackTrace",
								"optional": true,
								"description": "JavaScript stack trace if available."
							},
							{
								"name": "exception",
								"$ref": "RemoteObject",
								"optional": true,
								"description": "Exception object if available."
							},
							{
								"name": "executionContextId",
								"$ref": "ExecutionContextId",
								"optional": true,
								"description": "Identifier of the context where exception happened."
							}
						]
					},
					{
						"id": "Timestamp",
						"type": "number",
						"description": "Number of milliseconds since epoch."
					},
					{
						"id": "CallFrame",
						"type": "object",
						"description": "Stack entry for runtime errors and assertions.",
						"properties": [
							{
								"name": "functionName",
								"type": "string",
								"description": "JavaScript function name."
							},
							{
								"name": "scriptId",
								"$ref": "ScriptId",
								"description": "JavaScript script id."
							},
							{
								"name": "url",
								"type": "string",
								"description": "JavaScript script name or url."
							},
							{
								"name": "lineNumber",
								"type": "integer",
								"description": "JavaScript script line number (0-based)."
							},
							{
								"name": "columnNumber",
								"type": "integer",
								"description": "JavaScript script column number (0-based)."
							}
						]
					},
					{
						"id": "StackTrace",
						"type": "object",
						"description": "Call frames for assertions or error messages.",
						"properties": [
							{
								"name": "description",
								"type": "string",
								"optional": true,
								"description": "String label of this stack trace. For async traces this may be a name of the function that initiated the async call."
							},
							{
								"name": "callFrames",
								"type": "array",
								"items": {
									"$ref": "CallFrame"
								},
								"description": "JavaScript function name."
							},
							{
								"name": "parent",
								"$ref": "StackTrace",
								"optional": true,
								"description": "Asynchronous JavaScript stack trace that preceded this stack, if available."
							}
						]
					}
				],
				"commands": [
					{
						"name": "evaluate",
						"parameters": [
							{
								"name": "expression",
								"type": "string",
								"description": "Expression to evaluate."
							},
							{
								"name": "objectGroup",
								"type": "string",
								"optional": true,
								"description": "Symbolic group name that can be used to release multiple objects."
							},
							{
								"name": "includeCommandLineAPI",
								"type": "boolean",
								"optional": true,
								"description": "Determines whether Command Line API should be available during the evaluation."
							},
							{
								"name": "silent",
								"type": "boolean",
								"optional": true,
								"description": "In silent mode exceptions thrown during evaluation are not reported and do not pause execution. Overrides <code>setPauseOnException</code> state."
							},
							{
								"name": "contextId",
								"$ref": "ExecutionContextId",
								"optional": true,
								"description": "Specifies in which execution context to perform evaluation. If the parameter is omitted the evaluation will be performed in the context of the inspected page."
							},
							{
								"name": "returnByValue",
								"type": "boolean",
								"optional": true,
								"description": "Whether the result is expected to be a JSON object that should be sent by value."
							},
							{
								"name": "generatePreview",
								"type": "boolean",
								"optional": true,
								"experimental": true,
								"description": "Whether preview should be generated for the result."
							},
							{
								"name": "userGesture",
								"type": "boolean",
								"optional": true,
								"experimental": true,
								"description": "Whether execution should be treated as initiated by user in the UI."
							},
							{
								"name": "awaitPromise",
								"type": "boolean",
								"optional": true,
								"description": "Whether execution should wait for promise to be resolved. If the result of evaluation is not a Promise, it's considered to be an error."
							}
						],
						"returns": [
							{
								"name": "result",
								"$ref": "RemoteObject",
								"description": "Evaluation result."
							},
							{
								"name": "exceptionDetails",
								"$ref": "ExceptionDetails",
								"optional": true,
								"description": "Exception details."
							}
						],
						"description": "Evaluates expression on global object."
					},
					{
						"name": "awaitPromise",
						"parameters": [
							{
								"name": "promiseObjectId",
								"$ref": "RemoteObjectId",
								"description": "Identifier of the promise."
							},
							{
								"name": "returnByValue",
								"type": "boolean",
								"optional": true,
								"description": "Whether the result is expected to be a JSON object that should be sent by value."
							},
							{
								"name": "generatePreview",
								"type": "boolean",
								"optional": true,
								"description": "Whether preview should be generated for the result."
							}
						],
						"returns": [
							{
								"name": "result",
								"$ref": "RemoteObject",
								"description": "Promise result. Will contain rejected value if promise was rejected."
							},
							{
								"name": "exceptionDetails",
								"$ref": "ExceptionDetails",
								"optional": true,
								"description": "Exception details if stack strace is available."
							}
						],
						"description": "Add handler to promise with given promise object id."
					},
					{
						"name": "callFunctionOn",
						"parameters": [
							{
								"name": "objectId",
								"$ref": "RemoteObjectId",
								"description": "Identifier of the object to call function on."
							},
							{
								"name": "functionDeclaration",
								"type": "string",
								"description": "Declaration of the function to call."
							},
							{
								"name": "arguments",
								"type": "array",
								"items": {
									"$ref": "CallArgument",
									"description": "Call argument."
								},
								"optional": true,
								"description": "Call arguments. All call arguments must belong to the same JavaScript world as the target object."
							},
							{
								"name": "silent",
								"type": "boolean",
								"optional": true,
								"description": "In silent mode exceptions thrown during evaluation are not reported and do not pause execution. Overrides <code>setPauseOnException</code> state."
							},
							{
								"name": "returnByValue",
								"type": "boolean",
								"optional": true,
								"description": "Whether the result is expected to be a JSON object which should be sent by value."
							},
							{
								"name": "generatePreview",
								"type": "boolean",
								"optional": true,
								"experimental": true,
								"description": "Whether preview should be generated for the result."
							},
							{
								"name": "userGesture",
								"type": "boolean",
								"optional": true,
								"experimental": true,
								"description": "Whether execution should be treated as initiated by user in the UI."
							},
							{
								"name": "awaitPromise",
								"type": "boolean",
								"optional": true,
								"description": "Whether execution should wait for promise to be resolved. If the result of evaluation is not a Promise, it's considered to be an error."
							}
						],
						"returns": [
							{
								"name": "result",
								"$ref": "RemoteObject",
								"description": "Call result."
							},
							{
								"name": "exceptionDetails",
								"$ref": "ExceptionDetails",
								"optional": true,
								"description": "Exception details."
							}
						],
						"description": "Calls function with given declaration on the given object. Object group of the result is inherited from the target object."
					},
					{
						"name": "getProperties",
						"parameters": [
							{
								"name": "objectId",
								"$ref": "RemoteObjectId",
								"description": "Identifier of the object to return properties for."
							},
							{
								"name": "ownProperties",
								"optional": true,
								"type": "boolean",
								"description": "If true, returns properties belonging only to the element itself, not to its prototype chain."
							},
							{
								"name": "accessorPropertiesOnly",
								"optional": true,
								"type": "boolean",
								"description": "If true, returns accessor properties (with getter/setter) only; internal properties are not returned either.",
								"experimental": true
							},
							{
								"name": "generatePreview",
								"type": "boolean",
								"optional": true,
								"experimental": true,
								"description": "Whether preview should be generated for the results."
							}
						],
						"returns": [
							{
								"name": "result",
								"type": "array",
								"items": {
									"$ref": "PropertyDescriptor"
								},
								"description": "Object properties."
							},
							{
								"name": "internalProperties",
								"optional": true,
								"type": "array",
								"items": {
									"$ref": "InternalPropertyDescriptor"
								},
								"description": "Internal object properties (only of the element itself)."
							},
							{
								"name": "exceptionDetails",
								"$ref": "ExceptionDetails",
								"optional": true,
								"description": "Exception details."
							}
						],
						"description": "Returns properties of a given object. Object group of the result is inherited from the target object."
					},
					{
						"name": "releaseObject",
						"parameters": [
							{
								"name": "objectId",
								"$ref": "RemoteObjectId",
								"description": "Identifier of the object to release."
							}
						],
						"description": "Releases remote object with given id."
					},
					{
						"name": "releaseObjectGroup",
						"parameters": [
							{
								"name": "objectGroup",
								"type": "string",
								"description": "Symbolic object group name."
							}
						],
						"description": "Releases all remote objects that belong to a given group."
					},
					{
						"name": "runIfWaitingForDebugger",
						"description": "Tells inspected instance to run if it was waiting for debugger to attach."
					},
					{
						"name": "enable",
						"description": "Enables reporting of execution contexts creation by means of <code>executionContextCreated</code> event. When the reporting gets enabled the event will be sent immediately for each existing execution context."
					},
					{
						"name": "disable",
						"description": "Disables reporting of execution contexts creation."
					},
					{
						"name": "discardConsoleEntries",
						"description": "Discards collected exceptions and console API calls."
					},
					{
						"name": "setCustomObjectFormatterEnabled",
						"parameters": [
							{
								"name": "enabled",
								"type": "boolean"
							}
						],
						"experimental": true
					},
					{
						"name": "compileScript",
						"parameters": [
							{
								"name": "expression",
								"type": "string",
								"description": "Expression to compile."
							},
							{
								"name": "sourceURL",
								"type": "string",
								"description": "Source url to be set for the script."
							},
							{
								"name": "persistScript",
								"type": "boolean",
								"description": "Specifies whether the compiled script should be persisted."
							},
							{
								"name": "executionContextId",
								"$ref": "ExecutionContextId",
								"optional": true,
								"description": "Specifies in which execution context to perform script run. If the parameter is omitted the evaluation will be performed in the context of the inspected page."
							}
						],
						"returns": [
							{
								"name": "scriptId",
								"$ref": "ScriptId",
								"optional": true,
								"description": "Id of the script."
							},
							{
								"name": "exceptionDetails",
								"$ref": "ExceptionDetails",
								"optional": true,
								"description": "Exception details."
							}
						],
						"description": "Compiles expression."
					},
					{
						"name": "runScript",
						"parameters": [
							{
								"name": "scriptId",
								"$ref": "ScriptId",
								"description": "Id of the script to run."
							},
							{
								"name": "executionContextId",
								"$ref": "ExecutionContextId",
								"optional": true,
								"description": "Specifies in which execution context to perform script run. If the parameter is omitted the evaluation will be performed in the context of the inspected page."
							},
							{
								"name": "objectGroup",
								"type": "string",
								"optional": true,
								"description": "Symbolic group name that can be used to release multiple objects."
							},
							{
								"name": "silent",
								"type": "boolean",
								"optional": true,
								"description": "In silent mode exceptions thrown during evaluation are not reported and do not pause execution. Overrides <code>setPauseOnException</code> state."
							},
							{
								"name": "includeCommandLineAPI",
								"type": "boolean",
								"optional": true,
								"description": "Determines whether Command Line API should be available during the evaluation."
							},
							{
								"name": "returnByValue",
								"type": "boolean",
								"optional": true,
								"description": "Whether the result is expected to be a JSON object which should be sent by value."
							},
							{
								"name": "generatePreview",
								"type": "boolean",
								"optional": true,
								"description": "Whether preview should be generated for the result."
							},
							{
								"name": "awaitPromise",
								"type": "boolean",
								"optional": true,
								"description": "Whether execution should wait for promise to be resolved. If the result of evaluation is not a Promise, it's considered to be an error."
							}
						],
						"returns": [
							{
								"name": "result",
								"$ref": "RemoteObject",
								"description": "Run result."
							},
							{
								"name": "exceptionDetails",
								"$ref": "ExceptionDetails",
								"optional": true,
								"description": "Exception details."
							}
						],
						"description": "Runs script with given id in a given context."
					}
				],
				"events": [
					{
						"name": "executionContextCreated",
						"parameters": [
							{
								"name": "context",
								"$ref": "ExecutionContextDescription",
								"description": "A newly created execution contex."
							}
						],
						"description": "Issued when new execution context is created."
					},
					{
						"name": "executionContextDestroyed",
						"parameters": [
							{
								"name": "executionContextId",
								"$ref": "ExecutionContextId",
								"description": "Id of the destroyed context"
							}
						],
						"description": "Issued when execution context is destroyed."
					},
					{
						"name": "executionContextsCleared",
						"description": "Issued when all executionContexts were cleared in browser"
					},
					{
						"name": "exceptionThrown",
						"description": "Issued when exception was thrown and unhandled.",
						"parameters": [
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Timestamp of the exception."
							},
							{
								"name": "exceptionDetails",
								"$ref": "ExceptionDetails"
							}
						]
					},
					{
						"name": "exceptionRevoked",
						"description": "Issued when unhandled exception was revoked.",
						"parameters": [
							{
								"name": "reason",
								"type": "string",
								"description": "Reason describing why exception was revoked."
							},
							{
								"name": "exceptionId",
								"type": "integer",
								"description": "The id of revoked exception, as reported in <code>exceptionUnhandled</code>."
							}
						]
					},
					{
						"name": "consoleAPICalled",
						"description": "Issued when console API was called.",
						"parameters": [
							{
								"name": "type",
								"type": "string",
								"enum": [
									"log",
									"debug",
									"info",
									"error",
									"warning",
									"dir",
									"dirxml",
									"table",
									"trace",
									"clear",
									"startGroup",
									"startGroupCollapsed",
									"endGroup",
									"assert",
									"profile",
									"profileEnd"
								],
								"description": "Type of the call."
							},
							{
								"name": "args",
								"type": "array",
								"items": {
									"$ref": "RemoteObject"
								},
								"description": "Call arguments."
							},
							{
								"name": "executionContextId",
								"$ref": "ExecutionContextId",
								"description": "Identifier of the context where the call was made."
							},
							{
								"name": "timestamp",
								"$ref": "Timestamp",
								"description": "Call timestamp."
							},
							{
								"name": "stackTrace",
								"$ref": "StackTrace",
								"optional": true,
								"description": "Stack trace captured when the call was made."
							}
						]
					},
					{
						"name": "inspectRequested",
						"description": "Issued when object should be inspected (for example, as a result of inspect() command line API call).",
						"parameters": [
							{
								"name": "object",
								"$ref": "RemoteObject"
							},
							{
								"name": "hints",
								"type": "object"
							}
						]
					}
				]
			},
			{
				"domain": "Debugger",
				"description": "Debugger domain exposes JavaScript debugging capabilities. It allows setting and removing breakpoints, stepping through execution, exploring stack traces, etc.",
				"dependencies": [
					"Runtime"
				],
				"types": [
					{
						"id": "BreakpointId",
						"type": "string",
						"description": "Breakpoint identifier."
					},
					{
						"id": "CallFrameId",
						"type": "string",
						"description": "Call frame identifier."
					},
					{
						"id": "Location",
						"type": "object",
						"properties": [
							{
								"name": "scriptId",
								"$ref": "Runtime.ScriptId",
								"description": "Script identifier as reported in the <code>Debugger.scriptParsed</code>."
							},
							{
								"name": "lineNumber",
								"type": "integer",
								"description": "Line number in the script (0-based)."
							},
							{
								"name": "columnNumber",
								"type": "integer",
								"optional": true,
								"description": "Column number in the script (0-based)."
							}
						],
						"description": "Location in the source code."
					},
					{
						"id": "ScriptPosition",
						"experimental": true,
						"type": "object",
						"properties": [
							{
								"name": "lineNumber",
								"type": "integer"
							},
							{
								"name": "columnNumber",
								"type": "integer"
							}
						],
						"description": "Location in the source code."
					},
					{
						"id": "CallFrame",
						"type": "object",
						"properties": [
							{
								"name": "callFrameId",
								"$ref": "CallFrameId",
								"description": "Call frame identifier. This identifier is only valid while the virtual machine is paused."
							},
							{
								"name": "functionName",
								"type": "string",
								"description": "Name of the JavaScript function called on this call frame."
							},
							{
								"name": "functionLocation",
								"$ref": "Location",
								"optional": true,
								"experimental": true,
								"description": "Location in the source code."
							},
							{
								"name": "location",
								"$ref": "Location",
								"description": "Location in the source code."
							},
							{
								"name": "scopeChain",
								"type": "array",
								"items": {
									"$ref": "Scope"
								},
								"description": "Scope chain for this call frame."
							},
							{
								"name": "this",
								"$ref": "Runtime.RemoteObject",
								"description": "<code>this</code> object for this call frame."
							},
							{
								"name": "returnValue",
								"$ref": "Runtime.RemoteObject",
								"optional": true,
								"description": "The value being returned, if the function is at return point."
							}
						],
						"description": "JavaScript call frame. Array of call frames form the call stack."
					},
					{
						"id": "Scope",
						"type": "object",
						"properties": [
							{
								"name": "type",
								"type": "string",
								"enum": [
									"global",
									"local",
									"with",
									"closure",
									"catch",
									"block",
									"script",
									"eval",
									"module"
								],
								"description": "Scope type."
							},
							{
								"name": "object",
								"$ref": "Runtime.RemoteObject",
								"description": "Object representing the scope. For <code>global</code> and <code>with</code> scopes it represents the actual object; for the rest of the scopes, it is artificial transient object enumerating scope variables as its properties."
							},
							{
								"name": "name",
								"type": "string",
								"optional": true
							},
							{
								"name": "startLocation",
								"$ref": "Location",
								"optional": true,
								"description": "Location in the source code where scope starts"
							},
							{
								"name": "endLocation",
								"$ref": "Location",
								"optional": true,
								"description": "Location in the source code where scope ends"
							}
						],
						"description": "Scope description."
					},
					{
						"id": "SearchMatch",
						"type": "object",
						"description": "Search match for resource.",
						"properties": [
							{
								"name": "lineNumber",
								"type": "number",
								"description": "Line number in resource content."
							},
							{
								"name": "lineContent",
								"type": "string",
								"description": "Line with match content."
							}
						],
						"experimental": true
					}
				],
				"commands": [
					{
						"name": "enable",
						"description": "Enables debugger for the given page. Clients should not assume that the debugging has been enabled until the result for this command is received."
					},
					{
						"name": "disable",
						"description": "Disables debugger for given page."
					},
					{
						"name": "setBreakpointsActive",
						"parameters": [
							{
								"name": "active",
								"type": "boolean",
								"description": "New value for breakpoints active state."
							}
						],
						"description": "Activates / deactivates all breakpoints on the page."
					},
					{
						"name": "setSkipAllPauses",
						"parameters": [
							{
								"name": "skip",
								"type": "boolean",
								"description": "New value for skip pauses state."
							}
						],
						"description": "Makes page not interrupt on any pauses (breakpoint, exception, dom exception etc)."
					},
					{
						"name": "setBreakpointByUrl",
						"parameters": [
							{
								"name": "lineNumber",
								"type": "integer",
								"description": "Line number to set breakpoint at."
							},
							{
								"name": "url",
								"type": "string",
								"optional": true,
								"description": "URL of the resources to set breakpoint on."
							},
							{
								"name": "urlRegex",
								"type": "string",
								"optional": true,
								"description": "Regex pattern for the URLs of the resources to set breakpoints on. Either <code>url</code> or <code>urlRegex</code> must be specified."
							},
							{
								"name": "columnNumber",
								"type": "integer",
								"optional": true,
								"description": "Offset in the line to set breakpoint at."
							},
							{
								"name": "condition",
								"type": "string",
								"optional": true,
								"description": "Expression to use as a breakpoint condition. When specified, debugger will only stop on the breakpoint if this expression evaluates to true."
							}
						],
						"returns": [
							{
								"name": "breakpointId",
								"$ref": "BreakpointId",
								"description": "Id of the created breakpoint for further reference."
							},
							{
								"name": "locations",
								"type": "array",
								"items": {
									"$ref": "Location"
								},
								"description": "List of the locations this breakpoint resolved into upon addition."
							}
						],
						"description": "Sets JavaScript breakpoint at given location specified either by URL or URL regex. Once this command is issued, all existing parsed scripts will have breakpoints resolved and returned in <code>locations</code> property. Further matching script parsing will result in subsequent <code>breakpointResolved</code> events issued. This logical breakpoint will survive page reloads."
					},
					{
						"name": "setBreakpoint",
						"parameters": [
							{
								"name": "location",
								"$ref": "Location",
								"description": "Location to set breakpoint in."
							},
							{
								"name": "condition",
								"type": "string",
								"optional": true,
								"description": "Expression to use as a breakpoint condition. When specified, debugger will only stop on the breakpoint if this expression evaluates to true."
							}
						],
						"returns": [
							{
								"name": "breakpointId",
								"$ref": "BreakpointId",
								"description": "Id of the created breakpoint for further reference."
							},
							{
								"name": "actualLocation",
								"$ref": "Location",
								"description": "Location this breakpoint resolved into."
							}
						],
						"description": "Sets JavaScript breakpoint at a given location."
					},
					{
						"name": "removeBreakpoint",
						"parameters": [
							{
								"name": "breakpointId",
								"$ref": "BreakpointId"
							}
						],
						"description": "Removes JavaScript breakpoint."
					},
					{
						"name": "getPossibleBreakpoints",
						"parameters": [
							{
								"name": "start",
								"$ref": "Location",
								"description": "Start of range to search possible breakpoint locations in."
							},
							{
								"name": "end",
								"$ref": "Location",
								"optional": true,
								"description": "End of range to search possible breakpoint locations in (excluding). When not specifed, end of scripts is used as end of range."
							}
						],
						"returns": [
							{
								"name": "locations",
								"type": "array",
								"items": {
									"$ref": "Location"
								},
								"description": "List of the possible breakpoint locations."
							}
						],
						"description": "Returns possible locations for breakpoint. scriptId in start and end range locations should be the same.",
						"experimental": true
					},
					{
						"name": "continueToLocation",
						"parameters": [
							{
								"name": "location",
								"$ref": "Location",
								"description": "Location to continue to."
							}
						],
						"description": "Continues execution until specific location is reached."
					},
					{
						"name": "stepOver",
						"description": "Steps over the statement."
					},
					{
						"name": "stepInto",
						"description": "Steps into the function call."
					},
					{
						"name": "stepOut",
						"description": "Steps out of the function call."
					},
					{
						"name": "pause",
						"description": "Stops on the next JavaScript statement."
					},
					{
						"name": "resume",
						"description": "Resumes JavaScript execution."
					},
					{
						"name": "searchInContent",
						"parameters": [
							{
								"name": "scriptId",
								"$ref": "Runtime.ScriptId",
								"description": "Id of the script to search in."
							},
							{
								"name": "query",
								"type": "string",
								"description": "String to search for."
							},
							{
								"name": "caseSensitive",
								"type": "boolean",
								"optional": true,
								"description": "If true, search is case sensitive."
							},
							{
								"name": "isRegex",
								"type": "boolean",
								"optional": true,
								"description": "If true, treats string parameter as regex."
							}
						],
						"returns": [
							{
								"name": "result",
								"type": "array",
								"items": {
									"$ref": "SearchMatch"
								},
								"description": "List of search matches."
							}
						],
						"experimental": true,
						"description": "Searches for given string in script content."
					},
					{
						"name": "setScriptSource",
						"parameters": [
							{
								"name": "scriptId",
								"$ref": "Runtime.ScriptId",
								"description": "Id of the script to edit."
							},
							{
								"name": "scriptSource",
								"type": "string",
								"description": "New content of the script."
							},
							{
								"name": "dryRun",
								"type": "boolean",
								"optional": true,
								"description": " If true the change will not actually be applied. Dry run may be used to get result description without actually modifying the code."
							}
						],
						"returns": [
							{
								"name": "callFrames",
								"type": "array",
								"optional": true,
								"items": {
									"$ref": "CallFrame"
								},
								"description": "New stack trace in case editing has happened while VM was stopped."
							},
							{
								"name": "stackChanged",
								"type": "boolean",
								"optional": true,
								"description": "Whether current call stack  was modified after applying the changes."
							},
							{
								"name": "asyncStackTrace",
								"$ref": "Runtime.StackTrace",
								"optional": true,
								"description": "Async stack trace, if any."
							},
							{
								"name": "exceptionDetails",
								"optional": true,
								"$ref": "Runtime.ExceptionDetails",
								"description": "Exception details if any."
							}
						],
						"description": "Edits JavaScript source live."
					},
					{
						"name": "restartFrame",
						"parameters": [
							{
								"name": "callFrameId",
								"$ref": "CallFrameId",
								"description": "Call frame identifier to evaluate on."
							}
						],
						"returns": [
							{
								"name": "callFrames",
								"type": "array",
								"items": {
									"$ref": "CallFrame"
								},
								"description": "New stack trace."
							},
							{
								"name": "asyncStackTrace",
								"$ref": "Runtime.StackTrace",
								"optional": true,
								"description": "Async stack trace, if any."
							}
						],
						"description": "Restarts particular call frame from the beginning."
					},
					{
						"name": "getScriptSource",
						"parameters": [
							{
								"name": "scriptId",
								"$ref": "Runtime.ScriptId",
								"description": "Id of the script to get source for."
							}
						],
						"returns": [
							{
								"name": "scriptSource",
								"type": "string",
								"description": "Script source."
							}
						],
						"description": "Returns source for the script with given id."
					},
					{
						"name": "setPauseOnExceptions",
						"parameters": [
							{
								"name": "state",
								"type": "string",
								"enum": [
									"none",
									"uncaught",
									"all"
								],
								"description": "Pause on exceptions mode."
							}
						],
						"description": "Defines pause on exceptions state. Can be set to stop on all exceptions, uncaught exceptions or no exceptions. Initial pause on exceptions state is <code>none</code>."
					},
					{
						"name": "evaluateOnCallFrame",
						"parameters": [
							{
								"name": "callFrameId",
								"$ref": "CallFrameId",
								"description": "Call frame identifier to evaluate on."
							},
							{
								"name": "expression",
								"type": "string",
								"description": "Expression to evaluate."
							},
							{
								"name": "objectGroup",
								"type": "string",
								"optional": true,
								"description": "String object group name to put result into (allows rapid releasing resulting object handles using <code>releaseObjectGroup</code>)."
							},
							{
								"name": "includeCommandLineAPI",
								"type": "boolean",
								"optional": true,
								"description": "Specifies whether command line API should be available to the evaluated expression, defaults to false."
							},
							{
								"name": "silent",
								"type": "boolean",
								"optional": true,
								"description": "In silent mode exceptions thrown during evaluation are not reported and do not pause execution. Overrides <code>setPauseOnException</code> state."
							},
							{
								"name": "returnByValue",
								"type": "boolean",
								"optional": true,
								"description": "Whether the result is expected to be a JSON object that should be sent by value."
							},
							{
								"name": "generatePreview",
								"type": "boolean",
								"optional": true,
								"experimental": true,
								"description": "Whether preview should be generated for the result."
							}
						],
						"returns": [
							{
								"name": "result",
								"$ref": "Runtime.RemoteObject",
								"description": "Object wrapper for the evaluation result."
							},
							{
								"name": "exceptionDetails",
								"$ref": "Runtime.ExceptionDetails",
								"optional": true,
								"description": "Exception details."
							}
						],
						"description": "Evaluates expression on a given call frame."
					},
					{
						"name": "setVariableValue",
						"parameters": [
							{
								"name": "scopeNumber",
								"type": "integer",
								"description": "0-based number of scope as was listed in scope chain. Only 'local', 'closure' and 'catch' scope types are allowed. Other scopes could be manipulated manually."
							},
							{
								"name": "variableName",
								"type": "string",
								"description": "Variable name."
							},
							{
								"name": "newValue",
								"$ref": "Runtime.CallArgument",
								"description": "New variable value."
							},
							{
								"name": "callFrameId",
								"$ref": "CallFrameId",
								"description": "Id of callframe that holds variable."
							}
						],
						"description": "Changes value of variable in a callframe. Object-based scopes are not supported and must be mutated manually."
					},
					{
						"name": "setAsyncCallStackDepth",
						"parameters": [
							{
								"name": "maxDepth",
								"type": "integer",
								"description": "Maximum depth of async call stacks. Setting to <code>0</code> will effectively disable collecting async call stacks (default)."
							}
						],
						"description": "Enables or disables async call stacks tracking."
					},
					{
						"name": "setBlackboxPatterns",
						"parameters": [
							{
								"name": "patterns",
								"type": "array",
								"items": {
									"type": "string"
								},
								"description": "Array of regexps that will be used to check script url for blackbox state."
							}
						],
						"experimental": true,
						"description": "Replace previous blackbox patterns with passed ones. Forces backend to skip stepping/pausing in scripts with url matching one of the patterns. VM will try to leave blackboxed script by performing 'step in' several times, finally resorting to 'step out' if unsuccessful."
					},
					{
						"name": "setBlackboxedRanges",
						"parameters": [
							{
								"name": "scriptId",
								"$ref": "Runtime.ScriptId",
								"description": "Id of the script."
							},
							{
								"name": "positions",
								"type": "array",
								"items": {
									"$ref": "ScriptPosition"
								}
							}
						],
						"experimental": true,
						"description": "Makes backend skip steps in the script in blackboxed ranges. VM will try leave blacklisted scripts by performing 'step in' several times, finally resorting to 'step out' if unsuccessful. Positions array contains positions where blackbox state is changed. First interval isn't blackboxed. Array should be sorted."
					}
				],
				"events": [
					{
						"name": "scriptParsed",
						"parameters": [
							{
								"name": "scriptId",
								"$ref": "Runtime.ScriptId",
								"description": "Identifier of the script parsed."
							},
							{
								"name": "url",
								"type": "string",
								"description": "URL or name of the script parsed (if any)."
							},
							{
								"name": "startLine",
								"type": "integer",
								"description": "Line offset of the script within the resource with given URL (for script tags)."
							},
							{
								"name": "startColumn",
								"type": "integer",
								"description": "Column offset of the script within the resource with given URL."
							},
							{
								"name": "endLine",
								"type": "integer",
								"description": "Last line of the script."
							},
							{
								"name": "endColumn",
								"type": "integer",
								"description": "Length of the last line of the script."
							},
							{
								"name": "executionContextId",
								"$ref": "Runtime.ExecutionContextId",
								"description": "Specifies script creation context."
							},
							{
								"name": "hash",
								"type": "string",
								"description": "Content hash of the script."
							},
							{
								"name": "executionContextAuxData",
								"type": "object",
								"optional": true,
								"description": "Embedder-specific auxiliary data."
							},
							{
								"name": "isLiveEdit",
								"type": "boolean",
								"optional": true,
								"description": "True, if this script is generated as a result of the live edit operation.",
								"experimental": true
							},
							{
								"name": "sourceMapURL",
								"type": "string",
								"optional": true,
								"description": "URL of source map associated with script (if any)."
							},
							{
								"name": "hasSourceURL",
								"type": "boolean",
								"optional": true,
								"description": "True, if this script has sourceURL.",
								"experimental": true
							}
						],
						"description": "Fired when virtual machine parses script. This event is also fired for all known and uncollected scripts upon enabling debugger."
					},
					{
						"name": "scriptFailedToParse",
						"parameters": [
							{
								"name": "scriptId",
								"$ref": "Runtime.ScriptId",
								"description": "Identifier of the script parsed."
							},
							{
								"name": "url",
								"type": "string",
								"description": "URL or name of the script parsed (if any)."
							},
							{
								"name": "startLine",
								"type": "integer",
								"description": "Line offset of the script within the resource with given URL (for script tags)."
							},
							{
								"name": "startColumn",
								"type": "integer",
								"description": "Column offset of the script within the resource with given URL."
							},
							{
								"name": "endLine",
								"type": "integer",
								"description": "Last line of the script."
							},
							{
								"name": "endColumn",
								"type": "integer",
								"description": "Length of the last line of the script."
							},
							{
								"name": "executionContextId",
								"$ref": "Runtime.ExecutionContextId",
								"description": "Specifies script creation context."
							},
							{
								"name": "hash",
								"type": "string",
								"description": "Content hash of the script."
							},
							{
								"name": "executionContextAuxData",
								"type": "object",
								"optional": true,
								"description": "Embedder-specific auxiliary data."
							},
							{
								"name": "sourceMapURL",
								"type": "string",
								"optional": true,
								"description": "URL of source map associated with script (if any)."
							},
							{
								"name": "hasSourceURL",
								"type": "boolean",
								"optional": true,
								"description": "True, if this script has sourceURL.",
								"experimental": true
							}
						],
						"description": "Fired when virtual machine fails to parse the script."
					},
					{
						"name": "breakpointResolved",
						"parameters": [
							{
								"name": "breakpointId",
								"$ref": "BreakpointId",
								"description": "Breakpoint unique identifier."
							},
							{
								"name": "location",
								"$ref": "Location",
								"description": "Actual breakpoint location."
							}
						],
						"description": "Fired when breakpoint is resolved to an actual script and location."
					},
					{
						"name": "paused",
						"parameters": [
							{
								"name": "callFrames",
								"type": "array",
								"items": {
									"$ref": "CallFrame"
								},
								"description": "Call stack the virtual machine stopped on."
							},
							{
								"name": "reason",
								"type": "string",
								"enum": [
									"XHR",
									"DOM",
									"EventListener",
									"exception",
									"assert",
									"debugCommand",
									"promiseRejection",
									"other"
								],
								"description": "Pause reason."
							},
							{
								"name": "data",
								"type": "object",
								"optional": true,
								"description": "Object containing break-specific auxiliary properties."
							},
							{
								"name": "hitBreakpoints",
								"type": "array",
								"optional": true,
								"items": {
									"type": "string"
								},
								"description": "Hit breakpoints IDs"
							},
							{
								"name": "asyncStackTrace",
								"$ref": "Runtime.StackTrace",
								"optional": true,
								"description": "Async stack trace, if any."
							}
						],
						"description": "Fired when the virtual machine stopped on breakpoint or exception or any other stop criteria."
					},
					{
						"name": "resumed",
						"description": "Fired when the virtual machine resumed execution."
					}
				]
			},
			{
				"domain": "Console",
				"description": "This domain is deprecated - use Runtime or Log instead.",
				"dependencies": [
					"Runtime"
				],
				"deprecated": true,
				"types": [
					{
						"id": "ConsoleMessage",
						"type": "object",
						"description": "Console message.",
						"properties": [
							{
								"name": "source",
								"type": "string",
								"enum": [
									"xml",
									"javascript",
									"network",
									"console-api",
									"storage",
									"appcache",
									"rendering",
									"security",
									"other",
									"deprecation",
									"worker"
								],
								"description": "Message source."
							},
							{
								"name": "level",
								"type": "string",
								"enum": [
									"log",
									"warning",
									"error",
									"debug",
									"info"
								],
								"description": "Message severity."
							},
							{
								"name": "text",
								"type": "string",
								"description": "Message text."
							},
							{
								"name": "url",
								"type": "string",
								"optional": true,
								"description": "URL of the message origin."
							},
							{
								"name": "line",
								"type": "integer",
								"optional": true,
								"description": "Line number in the resource that generated this message (1-based)."
							},
							{
								"name": "column",
								"type": "integer",
								"optional": true,
								"description": "Column number in the resource that generated this message (1-based)."
							}
						]
					}
				],
				"commands": [
					{
						"name": "enable",
						"description": "Enables console domain, sends the messages collected so far to the client by means of the <code>messageAdded</code> notification."
					},
					{
						"name": "disable",
						"description": "Disables console domain, prevents further console messages from being reported to the client."
					},
					{
						"name": "clearMessages",
						"description": "Does nothing."
					}
				],
				"events": [
					{
						"name": "messageAdded",
						"parameters": [
							{
								"name": "message",
								"$ref": "ConsoleMessage",
								"description": "Console message that has been added."
							}
						],
						"description": "Issued when new console message is added."
					}
				]
			},
			{
				"domain": "Profiler",
				"dependencies": [
					"Runtime",
					"Debugger"
				],
				"types": [
					{
						"id": "ProfileNode",
						"type": "object",
						"description": "Profile node. Holds callsite information, execution statistics and child nodes.",
						"properties": [
							{
								"name": "id",
								"type": "integer",
								"description": "Unique id of the node."
							},
							{
								"name": "callFrame",
								"$ref": "Runtime.CallFrame",
								"description": "Function location."
							},
							{
								"name": "hitCount",
								"type": "integer",
								"optional": true,
								"experimental": true,
								"description": "Number of samples where this node was on top of the call stack."
							},
							{
								"name": "children",
								"type": "array",
								"items": {
									"type": "integer"
								},
								"optional": true,
								"description": "Child node ids."
							},
							{
								"name": "deoptReason",
								"type": "string",
								"optional": true,
								"description": "The reason of being not optimized. The function may be deoptimized or marked as don't optimize."
							},
							{
								"name": "positionTicks",
								"type": "array",
								"items": {
									"$ref": "PositionTickInfo"
								},
								"optional": true,
								"experimental": true,
								"description": "An array of source position ticks."
							}
						]
					},
					{
						"id": "Profile",
						"type": "object",
						"description": "Profile.",
						"properties": [
							{
								"name": "nodes",
								"type": "array",
								"items": {
									"$ref": "ProfileNode"
								},
								"description": "The list of profile nodes. First item is the root node."
							},
							{
								"name": "startTime",
								"type": "number",
								"description": "Profiling start timestamp in microseconds."
							},
							{
								"name": "endTime",
								"type": "number",
								"description": "Profiling end timestamp in microseconds."
							},
							{
								"name": "samples",
								"optional": true,
								"type": "array",
								"items": {
									"type": "integer"
								},
								"description": "Ids of samples top nodes."
							},
							{
								"name": "timeDeltas",
								"optional": true,
								"type": "array",
								"items": {
									"type": "integer"
								},
								"description": "Time intervals between adjacent samples in microseconds. The first delta is relative to the profile startTime."
							}
						]
					},
					{
						"id": "PositionTickInfo",
						"type": "object",
						"experimental": true,
						"description": "Specifies a number of samples attributed to a certain source position.",
						"properties": [
							{
								"name": "line",
								"type": "integer",
								"description": "Source line number (1-based)."
							},
							{
								"name": "ticks",
								"type": "integer",
								"description": "Number of samples attributed to the source line."
							}
						]
					}
				],
				"commands": [
					{
						"name": "enable"
					},
					{
						"name": "disable"
					},
					{
						"name": "setSamplingInterval",
						"parameters": [
							{
								"name": "interval",
								"type": "integer",
								"description": "New sampling interval in microseconds."
							}
						],
						"description": "Changes CPU profiler sampling interval. Must be called before CPU profiles recording started."
					},
					{
						"name": "start"
					},
					{
						"name": "stop",
						"returns": [
							{
								"name": "profile",
								"$ref": "Profile",
								"description": "Recorded profile."
							}
						]
					}
				],
				"events": [
					{
						"name": "consoleProfileStarted",
						"parameters": [
							{
								"name": "id",
								"type": "string"
							},
							{
								"name": "location",
								"$ref": "Debugger.Location",
								"description": "Location of console.profile()."
							},
							{
								"name": "title",
								"type": "string",
								"optional": true,
								"description": "Profile title passed as an argument to console.profile()."
							}
						],
						"description": "Sent when new profile recodring is started using console.profile() call."
					},
					{
						"name": "consoleProfileFinished",
						"parameters": [
							{
								"name": "id",
								"type": "string"
							},
							{
								"name": "location",
								"$ref": "Debugger.Location",
								"description": "Location of console.profileEnd()."
							},
							{
								"name": "profile",
								"$ref": "Profile"
							},
							{
								"name": "title",
								"type": "string",
								"optional": true,
								"description": "Profile title passed as an argument to console.profile()."
							}
						]
					}
				]
			},
			{
				"domain": "HeapProfiler",
				"dependencies": [
					"Runtime"
				],
				"experimental": true,
				"types": [
					{
						"id": "HeapSnapshotObjectId",
						"type": "string",
						"description": "Heap snapshot object id."
					},
					{
						"id": "SamplingHeapProfileNode",
						"type": "object",
						"description": "Sampling Heap Profile node. Holds callsite information, allocation statistics and child nodes.",
						"properties": [
							{
								"name": "callFrame",
								"$ref": "Runtime.CallFrame",
								"description": "Function location."
							},
							{
								"name": "selfSize",
								"type": "number",
								"description": "Allocations size in bytes for the node excluding children."
							},
							{
								"name": "children",
								"type": "array",
								"items": {
									"$ref": "SamplingHeapProfileNode"
								},
								"description": "Child nodes."
							}
						]
					},
					{
						"id": "SamplingHeapProfile",
						"type": "object",
						"description": "Profile.",
						"properties": [
							{
								"name": "head",
								"$ref": "SamplingHeapProfileNode"
							}
						]
					}
				],
				"commands": [
					{
						"name": "enable"
					},
					{
						"name": "disable"
					},
					{
						"name": "startTrackingHeapObjects",
						"parameters": [
							{
								"name": "trackAllocations",
								"type": "boolean",
								"optional": true
							}
						]
					},
					{
						"name": "stopTrackingHeapObjects",
						"parameters": [
							{
								"name": "reportProgress",
								"type": "boolean",
								"optional": true,
								"description": "If true 'reportHeapSnapshotProgress' events will be generated while snapshot is being taken when the tracking is stopped."
							}
						]
					},
					{
						"name": "takeHeapSnapshot",
						"parameters": [
							{
								"name": "reportProgress",
								"type": "boolean",
								"optional": true,
								"description": "If true 'reportHeapSnapshotProgress' events will be generated while snapshot is being taken."
							}
						]
					},
					{
						"name": "collectGarbage"
					},
					{
						"name": "getObjectByHeapObjectId",
						"parameters": [
							{
								"name": "objectId",
								"$ref": "HeapSnapshotObjectId"
							},
							{
								"name": "objectGroup",
								"type": "string",
								"optional": true,
								"description": "Symbolic group name that can be used to release multiple objects."
							}
						],
						"returns": [
							{
								"name": "result",
								"$ref": "Runtime.RemoteObject",
								"description": "Evaluation result."
							}
						]
					},
					{
						"name": "addInspectedHeapObject",
						"parameters": [
							{
								"name": "heapObjectId",
								"$ref": "HeapSnapshotObjectId",
								"description": "Heap snapshot object id to be accessible by means of $x command line API."
							}
						],
						"description": "Enables console to refer to the node with given id via $x (see Command Line API for more details $x functions)."
					},
					{
						"name": "getHeapObjectId",
						"parameters": [
							{
								"name": "objectId",
								"$ref": "Runtime.RemoteObjectId",
								"description": "Identifier of the object to get heap object id for."
							}
						],
						"returns": [
							{
								"name": "heapSnapshotObjectId",
								"$ref": "HeapSnapshotObjectId",
								"description": "Id of the heap snapshot object corresponding to the passed remote object id."
							}
						]
					},
					{
						"name": "startSampling",
						"parameters": [
							{
								"name": "samplingInterval",
								"type": "number",
								"optional": true,
								"description": "Average sample interval in bytes. Poisson distribution is used for the intervals. The default value is 32768 bytes."
							}
						]
					},
					{
						"name": "stopSampling",
						"returns": [
							{
								"name": "profile",
								"$ref": "SamplingHeapProfile",
								"description": "Recorded sampling heap profile."
							}
						]
					}
				],
				"events": [
					{
						"name": "addHeapSnapshotChunk",
						"parameters": [
							{
								"name": "chunk",
								"type": "string"
							}
						]
					},
					{
						"name": "resetProfiles"
					},
					{
						"name": "reportHeapSnapshotProgress",
						"parameters": [
							{
								"name": "done",
								"type": "integer"
							},
							{
								"name": "total",
								"type": "integer"
							},
							{
								"name": "finished",
								"type": "boolean",
								"optional": true
							}
						]
					},
					{
						"name": "lastSeenObjectId",
						"description": "If heap objects tracking has been started then backend regulary sends a current value for last seen object id and corresponding timestamp. If the were changes in the heap since last event then one or more heapStatsUpdate events will be sent before a new lastSeenObjectId event.",
						"parameters": [
							{
								"name": "lastSeenObjectId",
								"type": "integer"
							},
							{
								"name": "timestamp",
								"type": "number"
							}
						]
					},
					{
						"name": "heapStatsUpdate",
						"description": "If heap objects tracking has been started then backend may send update for one or more fragments",
						"parameters": [
							{
								"name": "statsUpdate",
								"type": "array",
								"items": {
									"type": "integer"
								},
								"description": "An array of triplets. Each triplet describes a fragment. The first integer is the fragment index, the second integer is a total count of objects for the fragment, the third integer is a total size of the objects for the fragment."
							}
						]
					}
				]
			}
		]
	};

/***/ },
/* 50 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var EventEmitter = __webpack_require__(2);
	var util = __webpack_require__(51);

	var WebSocket = __webpack_require__(54);

	var api = __webpack_require__(55);
	var defaults = __webpack_require__(47);
	var devtools = __webpack_require__(3);
	var ProtocolError = __webpack_require__(56);

	var Chrome = function (_EventEmitter) {
	    _inherits(Chrome, _EventEmitter);

	    function Chrome(options, notifier) {
	        _classCallCheck(this, Chrome);

	        // options
	        var _this = _possibleConstructorReturn(this, (Chrome.__proto__ || Object.getPrototypeOf(Chrome)).call(this));

	        var defaultChooseTab = function defaultChooseTab(tabs) {
	            return tabs.findIndex(function (tab) {
	                return !!tab.webSocketDebuggerUrl;
	            });
	        };
	        options = options || {};
	        _this.host = options.host || defaults.HOST;
	        _this.port = options.port || defaults.PORT;
	        _this.protocol = options.protocol;
	        _this.remote = !!options.remote;
	        _this.tab = options.tab || options.chooseTab || defaultChooseTab;
	        // locals
	        EventEmitter.call(_this);
	        _this._notifier = notifier;
	        _this._callbacks = {};
	        _this._nextCommandId = 1;
	        // operations
	        start.call(_this);
	        return _this;
	    }

	    return Chrome;
	}(EventEmitter);

	// avoid misinterpreting protocol's members as custom util.inspect functions


	Chrome.prototype.inspect = function (depth, options) {
	    options.customInspect = false;
	    return util.inspect(this, options);
	};

	Chrome.prototype.send = function (method, params, callback) {
	    var chrome = this;
	    if (typeof params === 'function') {
	        callback = params;
	        params = undefined;
	    }
	    // return a promise when a callback is not provided
	    if (typeof callback === 'function') {
	        enqueueCommand.call(chrome, method, params, callback);
	    } else {
	        return new Promise(function (fulfill, reject) {
	            enqueueCommand.call(chrome, method, params, function (error, response) {
	                if (error) {
	                    reject(new ProtocolError(response));
	                } else {
	                    fulfill(response);
	                }
	            });
	        });
	    }
	};

	Chrome.prototype.close = function (callback) {
	    var chrome = this;
	    function closeWebSocket(callback) {
	        // don't notify on user-initiated shutdown ('disconnect' event)
	        chrome._ws.removeAllListeners('close');
	        chrome._ws.close();
	        chrome._ws.once('close', function () {
	            chrome._ws.removeAllListeners();
	            callback();
	        });
	    }
	    if (typeof callback === 'function') {
	        closeWebSocket(callback);
	    } else {
	        return new Promise(function (fulfill, reject) {
	            closeWebSocket(fulfill);
	        });
	    }
	};

	// send a command to the remote endpoint and register a callback for the reply
	function enqueueCommand(method, params, callback) {
	    var chrome = this;
	    var id = chrome._nextCommandId++;
	    var message = { 'id': id, 'method': method, 'params': params || {} };
	    chrome._ws.send(JSON.stringify(message));
	    chrome._callbacks[id] = callback;
	}

	// initiate the connection process
	function start() {
	    var chrome = this;
	    var options = { 'host': chrome.host, 'port': chrome.port };
	    Promise.all([
	    // fetch the protocol and prepare the API
	    fetchProtocol.call(chrome, options).then(api.prepare.bind(chrome)),
	    // in the meanwhile fetch the WebSocket debugger URL
	    fetchDebuggerURL.call(chrome, options)]).then(function (values) {
	        // finally connect to the WebSocket
	        var url = values[1];
	        return connectToWebSocket.call(chrome, url);
	    }).then(function () {
	        // since the handler is executed synchronously, the emit() must be
	        // performed in the next tick so that uncaught errors in the client code
	        // are not intercepted by the Promise mechanism and therefore reported
	        // via the 'error' event
	        process.nextTick(function () {
	            chrome._notifier.emit('connect', chrome);
	        });
	    }).catch(function (err) {
	        chrome._notifier.emit('error', err);
	    });
	}

	// fetch the protocol according to 'protocol' and 'remote'
	function fetchProtocol(options) {
	    var chrome = this;
	    return new Promise(function (fulfill, reject) {
	        // if a protocol has been provided then use it
	        if (chrome.protocol) {
	            fulfill(chrome.protocol);
	        }
	        // otherwise user either the local or the remote version
	        else {
	                options.remote = chrome.remote;
	                devtools.Protocol(options).then(function (protocol) {
	                    fulfill(protocol.descriptor);
	                }).catch(reject);
	            }
	    });
	}

	// fetch the WebSocket URL according to 'tab'
	function fetchDebuggerURL(options) {
	    var chrome = this;
	    return new Promise(function (fulfill, reject) {
	        // when DevTools are open or another WebSocket is connected to a given
	        // tab the 'webSocketDebuggerUrl' field is not available
	        var busyTabError = new Error('Tab does not support inspection');
	        var url = void 0;
	        switch (_typeof(chrome.tab)) {
	            case 'string':
	                // a WebSocket URL is specified by the user (e.g., node-inspector)
	                fulfill(chrome.tab);
	                break;
	            case 'object':
	                // a tab object is specified by the user
	                url = chrome.tab.webSocketDebuggerUrl;
	                if (url) {
	                    fulfill(url);
	                } else {
	                    reject(busyTabError);
	                }
	                break;
	            case 'function':
	                // a function is specified by the user (get tab by index)
	                devtools.List(options).then(function (tabs) {
	                    // the index is used to fetch the proper tab from the list
	                    var tab = tabs[chrome.tab(tabs)];
	                    if (tab) {
	                        url = tab.webSocketDebuggerUrl;
	                        if (url) {
	                            fulfill(url);
	                        } else {
	                            reject(busyTabError);
	                        }
	                    } else {
	                        reject(new Error('Invalid tab index'));
	                    }
	                }).catch(reject);
	                break;
	            default:
	                reject(new Error('Invalid requested tab'));
	        }
	    });
	}

	// establish the WebSocket connection and start processing user commands
	function connectToWebSocket(url) {
	    var chrome = this;
	    return new Promise(function (fulfill, reject) {
	        // create the WebSocket
	        try {
	            chrome._ws = new WebSocket(url);
	        } catch (err) {
	            // handles bad URLs
	            reject(err);
	            return;
	        }
	        // set up event handlers
	        chrome._ws.on('open', function () {
	            fulfill();
	        });
	        chrome._ws.on('message', function (data) {
	            var message = JSON.parse(data);
	            handleMessage.call(chrome, message);
	        });
	        chrome._ws.on('close', function () {
	            chrome._notifier.emit('disconnect');
	        });
	        chrome._ws.on('error', function (err) {
	            reject(err);
	        });
	    });
	}

	// handle the messages read from the WebSocket
	function handleMessage(message) {
	    var chrome = this;
	    // command response
	    if (message.id) {
	        var callback = chrome._callbacks[message.id];
	        if (!callback) {
	            return;
	        }
	        // interpret the lack of both 'error' and 'result' as success
	        // (this may happen with node-inspector)
	        if (message.error) {
	            callback(true, message.error);
	        } else {
	            callback(false, message.result || {});
	        }
	        // unregister command response callback
	        delete chrome._callbacks[message.id];
	        // notify when there are no more pending commands
	        if (Object.keys(chrome._callbacks).length === 0) {
	            chrome.emit('ready');
	        }
	    }
	    // event
	    else if (message.method) {
	            chrome.emit('event', message);
	            chrome.emit(message.method, message.params);
	        }
	}

	module.exports = Chrome;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var formatRegExp = /%[sdj%]/g;
	exports.format = function(f) {
	  if (!isString(f)) {
	    var objects = [];
	    for (var i = 0; i < arguments.length; i++) {
	      objects.push(inspect(arguments[i]));
	    }
	    return objects.join(' ');
	  }

	  var i = 1;
	  var args = arguments;
	  var len = args.length;
	  var str = String(f).replace(formatRegExp, function(x) {
	    if (x === '%%') return '%';
	    if (i >= len) return x;
	    switch (x) {
	      case '%s': return String(args[i++]);
	      case '%d': return Number(args[i++]);
	      case '%j':
	        try {
	          return JSON.stringify(args[i++]);
	        } catch (_) {
	          return '[Circular]';
	        }
	      default:
	        return x;
	    }
	  });
	  for (var x = args[i]; i < len; x = args[++i]) {
	    if (isNull(x) || !isObject(x)) {
	      str += ' ' + x;
	    } else {
	      str += ' ' + inspect(x);
	    }
	  }
	  return str;
	};


	// Mark that a method should not be used.
	// Returns a modified function which warns once by default.
	// If --no-deprecation is set, then it is a no-op.
	exports.deprecate = function(fn, msg) {
	  // Allow for deprecating things in the process of starting up.
	  if (isUndefined(global.process)) {
	    return function() {
	      return exports.deprecate(fn, msg).apply(this, arguments);
	    };
	  }

	  if (process.noDeprecation === true) {
	    return fn;
	  }

	  var warned = false;
	  function deprecated() {
	    if (!warned) {
	      if (process.throwDeprecation) {
	        throw new Error(msg);
	      } else if (process.traceDeprecation) {
	        console.trace(msg);
	      } else {
	        console.error(msg);
	      }
	      warned = true;
	    }
	    return fn.apply(this, arguments);
	  }

	  return deprecated;
	};


	var debugs = {};
	var debugEnviron;
	exports.debuglog = function(set) {
	  if (isUndefined(debugEnviron))
	    debugEnviron = process.env.NODE_DEBUG || '';
	  set = set.toUpperCase();
	  if (!debugs[set]) {
	    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
	      var pid = process.pid;
	      debugs[set] = function() {
	        var msg = exports.format.apply(exports, arguments);
	        console.error('%s %d: %s', set, pid, msg);
	      };
	    } else {
	      debugs[set] = function() {};
	    }
	  }
	  return debugs[set];
	};


	/**
	 * Echos the value of a value. Trys to print the value out
	 * in the best way possible given the different types.
	 *
	 * @param {Object} obj The object to print out.
	 * @param {Object} opts Optional options object that alters the output.
	 */
	/* legacy: obj, showHidden, depth, colors*/
	function inspect(obj, opts) {
	  // default options
	  var ctx = {
	    seen: [],
	    stylize: stylizeNoColor
	  };
	  // legacy...
	  if (arguments.length >= 3) ctx.depth = arguments[2];
	  if (arguments.length >= 4) ctx.colors = arguments[3];
	  if (isBoolean(opts)) {
	    // legacy...
	    ctx.showHidden = opts;
	  } else if (opts) {
	    // got an "options" object
	    exports._extend(ctx, opts);
	  }
	  // set default options
	  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
	  if (isUndefined(ctx.depth)) ctx.depth = 2;
	  if (isUndefined(ctx.colors)) ctx.colors = false;
	  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
	  if (ctx.colors) ctx.stylize = stylizeWithColor;
	  return formatValue(ctx, obj, ctx.depth);
	}
	exports.inspect = inspect;


	// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
	inspect.colors = {
	  'bold' : [1, 22],
	  'italic' : [3, 23],
	  'underline' : [4, 24],
	  'inverse' : [7, 27],
	  'white' : [37, 39],
	  'grey' : [90, 39],
	  'black' : [30, 39],
	  'blue' : [34, 39],
	  'cyan' : [36, 39],
	  'green' : [32, 39],
	  'magenta' : [35, 39],
	  'red' : [31, 39],
	  'yellow' : [33, 39]
	};

	// Don't use 'blue' not visible on cmd.exe
	inspect.styles = {
	  'special': 'cyan',
	  'number': 'yellow',
	  'boolean': 'yellow',
	  'undefined': 'grey',
	  'null': 'bold',
	  'string': 'green',
	  'date': 'magenta',
	  // "name": intentionally not styling
	  'regexp': 'red'
	};


	function stylizeWithColor(str, styleType) {
	  var style = inspect.styles[styleType];

	  if (style) {
	    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
	           '\u001b[' + inspect.colors[style][1] + 'm';
	  } else {
	    return str;
	  }
	}


	function stylizeNoColor(str, styleType) {
	  return str;
	}


	function arrayToHash(array) {
	  var hash = {};

	  array.forEach(function(val, idx) {
	    hash[val] = true;
	  });

	  return hash;
	}


	function formatValue(ctx, value, recurseTimes) {
	  // Provide a hook for user-specified inspect functions.
	  // Check that value is an object with an inspect function on it
	  if (ctx.customInspect &&
	      value &&
	      isFunction(value.inspect) &&
	      // Filter out the util module, it's inspect function is special
	      value.inspect !== exports.inspect &&
	      // Also filter out any prototype objects using the circular check.
	      !(value.constructor && value.constructor.prototype === value)) {
	    var ret = value.inspect(recurseTimes, ctx);
	    if (!isString(ret)) {
	      ret = formatValue(ctx, ret, recurseTimes);
	    }
	    return ret;
	  }

	  // Primitive types cannot have properties
	  var primitive = formatPrimitive(ctx, value);
	  if (primitive) {
	    return primitive;
	  }

	  // Look up the keys of the object.
	  var keys = Object.keys(value);
	  var visibleKeys = arrayToHash(keys);

	  if (ctx.showHidden) {
	    keys = Object.getOwnPropertyNames(value);
	  }

	  // IE doesn't make error fields non-enumerable
	  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
	  if (isError(value)
	      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
	    return formatError(value);
	  }

	  // Some type of object without properties can be shortcutted.
	  if (keys.length === 0) {
	    if (isFunction(value)) {
	      var name = value.name ? ': ' + value.name : '';
	      return ctx.stylize('[Function' + name + ']', 'special');
	    }
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    }
	    if (isDate(value)) {
	      return ctx.stylize(Date.prototype.toString.call(value), 'date');
	    }
	    if (isError(value)) {
	      return formatError(value);
	    }
	  }

	  var base = '', array = false, braces = ['{', '}'];

	  // Make Array say that they are Array
	  if (isArray(value)) {
	    array = true;
	    braces = ['[', ']'];
	  }

	  // Make functions say that they are functions
	  if (isFunction(value)) {
	    var n = value.name ? ': ' + value.name : '';
	    base = ' [Function' + n + ']';
	  }

	  // Make RegExps say that they are RegExps
	  if (isRegExp(value)) {
	    base = ' ' + RegExp.prototype.toString.call(value);
	  }

	  // Make dates with properties first say the date
	  if (isDate(value)) {
	    base = ' ' + Date.prototype.toUTCString.call(value);
	  }

	  // Make error with message first say the error
	  if (isError(value)) {
	    base = ' ' + formatError(value);
	  }

	  if (keys.length === 0 && (!array || value.length == 0)) {
	    return braces[0] + base + braces[1];
	  }

	  if (recurseTimes < 0) {
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    } else {
	      return ctx.stylize('[Object]', 'special');
	    }
	  }

	  ctx.seen.push(value);

	  var output;
	  if (array) {
	    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
	  } else {
	    output = keys.map(function(key) {
	      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
	    });
	  }

	  ctx.seen.pop();

	  return reduceToSingleString(output, base, braces);
	}


	function formatPrimitive(ctx, value) {
	  if (isUndefined(value))
	    return ctx.stylize('undefined', 'undefined');
	  if (isString(value)) {
	    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
	                                             .replace(/'/g, "\\'")
	                                             .replace(/\\"/g, '"') + '\'';
	    return ctx.stylize(simple, 'string');
	  }
	  if (isNumber(value))
	    return ctx.stylize('' + value, 'number');
	  if (isBoolean(value))
	    return ctx.stylize('' + value, 'boolean');
	  // For some reason typeof null is "object", so special case here.
	  if (isNull(value))
	    return ctx.stylize('null', 'null');
	}


	function formatError(value) {
	  return '[' + Error.prototype.toString.call(value) + ']';
	}


	function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
	  var output = [];
	  for (var i = 0, l = value.length; i < l; ++i) {
	    if (hasOwnProperty(value, String(i))) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          String(i), true));
	    } else {
	      output.push('');
	    }
	  }
	  keys.forEach(function(key) {
	    if (!key.match(/^\d+$/)) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          key, true));
	    }
	  });
	  return output;
	}


	function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
	  var name, str, desc;
	  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
	  if (desc.get) {
	    if (desc.set) {
	      str = ctx.stylize('[Getter/Setter]', 'special');
	    } else {
	      str = ctx.stylize('[Getter]', 'special');
	    }
	  } else {
	    if (desc.set) {
	      str = ctx.stylize('[Setter]', 'special');
	    }
	  }
	  if (!hasOwnProperty(visibleKeys, key)) {
	    name = '[' + key + ']';
	  }
	  if (!str) {
	    if (ctx.seen.indexOf(desc.value) < 0) {
	      if (isNull(recurseTimes)) {
	        str = formatValue(ctx, desc.value, null);
	      } else {
	        str = formatValue(ctx, desc.value, recurseTimes - 1);
	      }
	      if (str.indexOf('\n') > -1) {
	        if (array) {
	          str = str.split('\n').map(function(line) {
	            return '  ' + line;
	          }).join('\n').substr(2);
	        } else {
	          str = '\n' + str.split('\n').map(function(line) {
	            return '   ' + line;
	          }).join('\n');
	        }
	      }
	    } else {
	      str = ctx.stylize('[Circular]', 'special');
	    }
	  }
	  if (isUndefined(name)) {
	    if (array && key.match(/^\d+$/)) {
	      return str;
	    }
	    name = JSON.stringify('' + key);
	    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
	      name = name.substr(1, name.length - 2);
	      name = ctx.stylize(name, 'name');
	    } else {
	      name = name.replace(/'/g, "\\'")
	                 .replace(/\\"/g, '"')
	                 .replace(/(^"|"$)/g, "'");
	      name = ctx.stylize(name, 'string');
	    }
	  }

	  return name + ': ' + str;
	}


	function reduceToSingleString(output, base, braces) {
	  var numLinesEst = 0;
	  var length = output.reduce(function(prev, cur) {
	    numLinesEst++;
	    if (cur.indexOf('\n') >= 0) numLinesEst++;
	    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
	  }, 0);

	  if (length > 60) {
	    return braces[0] +
	           (base === '' ? '' : base + '\n ') +
	           ' ' +
	           output.join(',\n  ') +
	           ' ' +
	           braces[1];
	  }

	  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
	}


	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
	  return Array.isArray(ar);
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	exports.isBuffer = __webpack_require__(52);

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}


	function pad(n) {
	  return n < 10 ? '0' + n.toString(10) : n.toString(10);
	}


	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
	              'Oct', 'Nov', 'Dec'];

	// 26 Feb 16:19:34
	function timestamp() {
	  var d = new Date();
	  var time = [pad(d.getHours()),
	              pad(d.getMinutes()),
	              pad(d.getSeconds())].join(':');
	  return [d.getDate(), months[d.getMonth()], time].join(' ');
	}


	// log is just a thin wrapper to console.log that prepends a timestamp
	exports.log = function() {
	  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
	};


	/**
	 * Inherit the prototype methods from one constructor into another.
	 *
	 * The Function.prototype.inherits from lang.js rewritten as a standalone
	 * function (not on Function.prototype). NOTE: If this file is to be loaded
	 * during bootstrapping this function needs to be rewritten using some native
	 * functions as prototype setup using normal JavaScript does not work as
	 * expected during bootstrapping (see mirror.js in r114903).
	 *
	 * @param {function} ctor Constructor function which needs to inherit the
	 *     prototype.
	 * @param {function} superCtor Constructor function to inherit prototype from.
	 */
	exports.inherits = __webpack_require__(53);

	exports._extend = function(origin, add) {
	  // Don't do anything if add isn't an object
	  if (!add || !isObject(add)) return origin;

	  var keys = Object.keys(add);
	  var i = keys.length;
	  while (i--) {
	    origin[keys[i]] = add[keys[i]];
	  }
	  return origin;
	};

	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(1)))

/***/ },
/* 52 */
/***/ function(module, exports) {

	module.exports = function isBuffer(arg) {
	  return arg && typeof arg === 'object'
	    && typeof arg.copy === 'function'
	    && typeof arg.fill === 'function'
	    && typeof arg.readUInt8 === 'function';
	}

/***/ },
/* 53 */
/***/ function(module, exports) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var EventEmitter = __webpack_require__(2);

	// wrapper around the Node.js ws module
	// for use in browsers

	var WebSocketWrapper = function (_EventEmitter) {
	    _inherits(WebSocketWrapper, _EventEmitter);

	    function WebSocketWrapper(url) {
	        _classCallCheck(this, WebSocketWrapper);

	        var _this = _possibleConstructorReturn(this, (WebSocketWrapper.__proto__ || Object.getPrototypeOf(WebSocketWrapper)).call(this));

	        _this._ws = new WebSocket(url);
	        _this._ws.onopen = function () {
	            _this.emit('open');
	        };
	        _this._ws.onclose = function () {
	            _this.emit('close');
	        };
	        _this._ws.onmessage = function (event) {
	            _this.emit('message', event.data);
	        };
	        _this._ws.onerror = function () {
	            _this.emit('error', new Error('WebSocket error'));
	        };
	        return _this;
	    }

	    _createClass(WebSocketWrapper, [{
	        key: 'close',
	        value: function close() {
	            this._ws.close();
	        }
	    }, {
	        key: 'send',
	        value: function send(data) {
	            this._ws.send(data);
	        }
	    }]);

	    return WebSocketWrapper;
	}(EventEmitter);

	module.exports = WebSocketWrapper;

/***/ },
/* 55 */
/***/ function(module, exports) {

	'use strict';

	function arrayToObject(parameters) {
	    var keyValue = {};
	    parameters.forEach(function (parameter) {
	        var name = parameter.name;
	        delete parameter.name;
	        keyValue[name] = parameter;
	    });
	    return keyValue;
	}

	function decorate(to, category, object) {
	    to.category = category;
	    Object.keys(object).forEach(function (field) {
	        // skip the 'name' field as it is part of the function prototype
	        if (field === 'name') {
	            return;
	        }
	        // commands and events have parameters whereas types have properties
	        if (category === 'type' && field === 'properties' || field === 'parameters') {
	            to[field] = arrayToObject(object[field]);
	        } else {
	            to[field] = object[field];
	        }
	    });
	}

	function addCommand(chrome, domainName, command) {
	    var handler = function handler(params, callback) {
	        return chrome.send(domainName + '.' + command.name, params, callback);
	    };
	    decorate(handler, 'command', command);
	    chrome[domainName][command.name] = handler;
	}

	function addEvent(chrome, domainName, event) {
	    var handler = function handler(_handler) {
	        chrome.on(domainName + '.' + event.name, _handler);
	    };
	    decorate(handler, 'event', event);
	    chrome[domainName][event.name] = handler;
	}

	function addType(chrome, domainName, type) {
	    var help = {};
	    decorate(help, 'type', type);
	    chrome[domainName][type.id] = help;
	}

	function prepare(protocol) {
	    var chrome = this;
	    return new Promise(function (fulfill, reject) {
	        // assign the protocol and generate the shorthands
	        chrome.protocol = protocol;
	        protocol.domains.forEach(function (domain) {
	            var domainName = domain.domain;
	            chrome[domainName] = {};
	            // add commands
	            (domain.commands || []).forEach(function (command) {
	                addCommand(chrome, domainName, command);
	            });
	            // add events
	            (domain.events || []).forEach(function (event) {
	                addEvent(chrome, domainName, event);
	            });
	            // add types
	            (domain.types || []).forEach(function (type) {
	                addType(chrome, domainName, type);
	            });
	        });
	        fulfill();
	    });
	}

	module.exports.prepare = prepare;

/***/ },
/* 56 */
/***/ function(module, exports) {

	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var ProtocolError = function (_Error) {
	    _inherits(ProtocolError, _Error);

	    function ProtocolError(response) {
	        _classCallCheck(this, ProtocolError);

	        var _this = _possibleConstructorReturn(this, (ProtocolError.__proto__ || Object.getPrototypeOf(ProtocolError)).call(this, response.message));

	        Object.assign(_this, response);
	        return _this;
	    }

	    return ProtocolError;
	}(Error);

	module.exports = ProtocolError;

/***/ }
/******/ ]);