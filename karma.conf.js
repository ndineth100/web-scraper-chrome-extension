const files = ['tests/spec/*.js', 'tests/spec/*/*.js']
module.exports = function (config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['browserify', 'mocha'],

    preprocessors: {
      [files[0]]: ['browserify'],
      [files[1]]: ['browserify']
    },
    // list of files / patterns to load in the browser
    files: [
      'extension/assets/jquery-2.0.3.js',
      'extension/assets/sugar-1.4.1.js',
      'extension/assets/pouchdb-nightly.min.js',
      'tests/ChromeAPI.js',
      'extension/generated/background-scraper.js', // not very nice, we need to load the background script to listen to the messages
      'extension/generated/content-scraper.js',
      'extension/content_script/content_script.js',
      'docs/images/chrome-store-logo.png',
      '/docs/images/chrome-store-logo.png',
      'tests/spec/*.js',
      'tests/spec/*/*.js',
      ...files
    ],
    customLaunchers: {
      ChromeOutOfFocus: {
        base: 'Chrome',
        flags: ['--window-size=300,300']
      }
    },
    browserify: {
      debug: true,
      transform: [
        ['babelify', {plugins: 'babel-plugin-meaningful-logs'}]
      ]
    },

    // list of files to exclude
    exclude: [
    ],
    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['dots'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    browserConsoleLogOptions: {
      terminal: false,
      level: ''
    },
    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,
    watchify: {
      poll: true
    },
    // https://stackoverflow.com/questions/23361550/karma-not-picking-the-changes-have-to-run-tests-twice/26407061
    usePolling: true,
    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeOutOfFocus'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,
    // browserNoActivityTimeout: 50000000,
    plugins: [
      'karma-mocha',
      'karma-browserify',
      'karma-chrome-launcher'
    ]
  })
}
