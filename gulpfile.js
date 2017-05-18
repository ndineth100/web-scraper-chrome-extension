const gulp = require('gulp')
const browserify = require('browserify')
const watchify = require('watchify')
const source = require('vinyl-source-stream')
const notify = require('gulp-notify')
const Server = require('karma').Server
const path = require('path')
const mocha = require('gulp-spawn-mocha')
const babel = require('gulp-babel')
// We do karma in gulp instead of npm because we need to recompute all the generated bundles that are loaded to the browser
const runTests = (function () {
  let timeout
  return function (done = function () {}) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(function () {
      runKarma(done)
      runJSDOMTests()
    }, 100)
  }
})()

function runKarma (done) {
  const server = new Server({
    configFile: path.join(__dirname, 'karma.conf.js'),
    singleRun: true
  }, done)
  server.start()
}

function runJSDOMTests () {
  return gulp.src([
    'tests/jsdomSpec.js',
    'tests/spec/*Spec.js',
    'tests/spec/Selector/*Spec.js'
  ])
    .pipe(mocha({
      compilers: 'js:babel-register'
    }).on('error', console.error))
}

gulp.task('build:watch', () => generateBuilder(true))
gulp.task('build', () => generateBuilder(false))

gulp.task('default', ['build:watch'])

function generateBuilder (isWatch) {
  const wrapper = isWatch ? watchify : (x) => x
  const bundlerBackground = wrapper(browserify({
    standalone: 'backgroundScraper',
    entries: [
      'extension/background_page/background_script.js'
    ],
    debug: true
  }))
  const bundlerScraper = wrapper(browserify({
    standalone: 'contentScraper',
    entries: [
      'extension/content_script/content_scraper_browser.js'
    ],
    debug: true
  }))
  const bundlerDevtools = wrapper(browserify({
    standalone: 'contentScraper',
    entries: [
      'extension/scripts/App.js'
    ],
    debug: true
  }))

  setBundler(bundlerBackground, 'background-scraper.js')
  setBundler(bundlerScraper, 'content-scraper.js')
  setBundler(bundlerDevtools, 'devtools-scraper.js')
  function gulpBundle (bundler, file) {
    bundler.bundle()
      .on('error', function (err) {
        return notify().write(err)
      })
      .pipe(source(file))
      .pipe(gulp.dest('extension/generated/'))
      .on('error', function (e) {
        console.error(e)
      })
      .on('end', function () {
        runTests()
        console.log('finished bundling')
        // TODO launch tests
      })
  }

  function setBundler (bundler, file) {
    bundler
      .on('update', function () {
        gulpBundle(bundler, file)
      })
      .on('error', function (err) {
        return notify().write(err)
      })
      .on('log', function (log) {
        console.log(log)
      })
    return gulpBundle(bundler, file)
  }
}
