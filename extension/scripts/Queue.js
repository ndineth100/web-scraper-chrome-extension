const redis = require('redis')
const {promisify} = require('util')
var Job = require('./Job')

// Create Redis Client
let client = redis.createClient()
// var llenAsync
// var lpopAsync
// var sismemberAsync
// var saddAsync
// var rpushAsync

async function fun1(){
    let response = await client.on('connect', function(){
        console.log('Package Queue Initiated a Connection to Redis...')
        // llenAsync = promisify(client.llen).bind(client)
        // lpopAsync = promisify(client.lpop).bind(client)
        // sismemberAsync = promisify(client.sismember).bind(client)
        // saddAsync = promisify(client.sadd).bind(client)
        // rpushAsync = promisify(client.rpush).bind(client)
    })
}
fun1()

// client.on('connect', function(){
//     console.log('Package Queue Initiated a Connection to Redis...')
// });

const llenAsync = promisify(client.llen).bind(client);
const lpopAsync = promisify(client.lpop).bind(client);
const sismemberAsync = promisify(client.sismember).bind(client);
const saddAsync = promisify(client.sadd).bind(client);
const rpushAsync = promisify(client.rpush).bind(client);


var Queue = function () {

}

Queue.prototype = {

	/**
	 * Returns false if page is already scraped
	 * @param job
	 * @returns {boolean}
	 */
  add: function (job) {
    console.log('add function started!')
    let _this = this
    return this.canBeAdded(job).then(function(result) {
        if(result){
            //console.log('add function canBeAdded true!')
            //console.log('job: '+JSON.stringify(job))
            return rpushAsync(['queue',JSON.stringify(job)]).then(function(result) {
                //console.log('rpush function success! : '+JSON.stringify(result))
                return _this._setUrlScraped(job.url).then(function(result){
                    //console.log('add function returned true')
                    return new Promise(function(resolve, reject) {
                        resolve(true)
                    })
                }).catch(function(err){
                    console.log("Error occured in : this._setUrlScraped(job.url) function! Err: "+JSON.stringify(err))
                    return new Promise(function(resolve, reject) {
                        resolve(false)
                    })
                })

            }).catch(function(err){
                console.log("Error occured in : rpush function! Err: "+JSON.stringify(err))
                return new Promise(function(resolve, reject) {
                    resolve(false)
                })
            })

        }else{
            //console.log('add function return false!');
            return new Promise(function(resolve, reject) {
                resolve(false)
            })
        }
    }).catch(function(err){
        console.log("Error occured in : add function! Err: "+JSON.stringify(err))
        return new Promise(function(resolve, reject) {
            resolve(false)
        })
    })
  },

  canBeAdded: function (job) {
    return this.isScraped(job.url).then(function(result) {
        if(result || job.url.match(/\.(doc|docx|pdf|ppt|pptx|odt)$/i) !== null){
            //console.log('canBeAdded function returned false 1')
            return new Promise(function(resolve, reject) {
                resolve(false)
            })
        }
        return new Promise(function(resolve, reject) {
            resolve(true)
        })
    }).catch(function(err){
        console.log("Error occured in : canBeAdded function! Err: "+JSON.stringify(err))
    })
  },

  getQueueSize: function () {
      return llenAsync(['queue']).then(function(res) {
          console.log('queue size: '+res)
          return new Promise(function(resolve, reject) {
              resolve(res)
          })
      }).catch(function(err){
          console.log("Error occured in : getQueueSize function! Err: "+JSON.stringify(err))
      })
      //client.llen('queue', (err, reply) =>
      //{
      //    if(err){
      //        console.log(`Getting queue size - error: ${err}`)
      //        return 0
      //    }
      //    else{
      //        console.log('getQueueSize function returned ' + reply)
      //        return parseInt(reply)
      //    }
      //});
  },

  isScraped: function (url) {
    return sismemberAsync(['scrapedUrl',url]).then(function(res) {
        //console.log('isScraped function returned : '+JSON.stringify(res))
        return new Promise(function(resolve, reject) {
            resolve(res)
        })
    }).catch(function(err){
        console.log("Error occured in : isScraped function! Err: "+JSON.stringify(err))
    })
    //return client.sismember(['scrapedUrl', url], function(err, reply){
    //    if(err){
    //        console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
    //        return false
    //    }
    //    if(parseInt(reply) == 1){
    //        console.log('isScraped function returned true')
    //        return true
    //    }
    //    else{
    //        console.log('isScraped function returned false')
    //        return false
    //    }
    //});
  },

  _setUrlScraped: function (url) {
      return saddAsync(['scrapedUrl',url]).then(function(res) {
          //console.log('_setUrlScraped function returned : '+JSON.stringify(res))
          return new Promise(function(resolve, reject) {
              resolve(res)
          })
      }).catch(function(err){
          console.log("Error occured in : _setUrlScraped function! Err: "+JSON.stringify(err))
      })
      // client.sadd(['scrapedUrl', url], function(err, reply){
      //     if(err){
      //         console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
      //     }
      //     if(!reply){
      //         console.log(`scrapedUrl : ${url} Already added!`)
      //     }
      // });
      // console.log('_setUrlScraped function returned true')
  },

  getNextJob: function () {
		// @TODO test this
      return this.getQueueSize().then(function(result) {
          //console.log('getNextJob queue size check!')
          if(result>0){
            //console.log('getNextJob queue size ok!');
            return lpopAsync('queue').then(function(result) {
                let res = JSON.parse(result)
                //console.log('getNextJob inside lpop!')
                //console.log('Parsed result: '+JSON.stringify(res))
                return new Promise(function(resolve, reject) {
                    var job = new Job (res.url, res.parentSelector, res.scraper, res.parentJob, res.baseData)
                    resolve(job)
                })
            }).catch(function(err){
                console.log("Error occured in : lpopAsync function! Err: "+JSON.stringify(err))
            })
          }else{
              return new Promise(function(resolve, reject) {
                  resolve(false)
              })
          }

      }).catch(function(err){
          console.log("Error occured in : getNextJob function! Err: "+JSON.stringify(err))
      })
      //else {
      //    console.log('getNextJob queue size is zero!');
      //    return false
      //}
  }
}

module.exports = Queue
