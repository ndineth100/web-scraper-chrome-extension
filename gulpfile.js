const gulp = require('gulp')
const browserify = require('browserify')
const watchify = require('watchify')
const source = require('vinyl-source-stream')
const notify = require('gulp-notify')
const Server = require('karma').Server
const path = require('path')

// We do karma in gulp instead of npm because we need to recompute all the generated bundles that are loaded to the browser
const runKarma = (function () {
  let timeout
  return function (done = function () {}) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(function () {
      const server = new Server({
        configFile: path.join(__dirname, 'karma.conf.js'),
        singleRun: true
      }, done)
      server.start()
    }, 100)
  }
})()

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
      'extension/content_script/content_scraper.js'
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
        runKarma()
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
