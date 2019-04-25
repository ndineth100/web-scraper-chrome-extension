const redis = require('redis');

const {promisify} = require('util');


// Create Redis Client
let client = redis.createClient();

client.on('connect', function(){
    console.log('Package Queue Initiated a Connection to Redis...');
});

const llenAsync = promisify(client.llen).bind(client);
const lpopAsync = promisify(client.lpop).bind(client);

var Queue = function () {

}

Queue.prototype = {

	/**
	 * Returns false if page is already scraped
	 * @param job
	 * @returns {boolean}
	 */
  add: function (job) {
    console.log('add function started!');
    if (this.canBeAdded(job)) {
        console.log('add function canBeAdded true!')
        console.log('job: '+JSON.stringify(job))
        client.rpush('queue', JSON.stringify(job))
        this._setUrlScraped(job.url)
        console.log('add function returned true')
        return true
      }
    console.log('add function return false!');
    return false
  },

  canBeAdded: function (job) {
    if (this.isScraped(job.url)) {
      return false
    }

		// reject documents
    if (job.url.match(/\.(doc|docx|pdf|ppt|pptx|odt)$/i) !== null) {
      return false
    }
    console.log('canBeAdded function returned true')
    return true
  },

  getQueueSize: function () {
      return llenAsync('queue').then(function(res) {
          console.log(res)
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
    return client.sismember(['scrapedUrl', JSON.stringify(url)], function(err, reply){
        if(err){
            console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
            return false
        }
        if(parseInt(reply) == 1){
            console.log('isScraped function returned true')
            return true
        }
        else{
            console.log('isScraped function returned false')
            return false
        }
    });
  },

  _setUrlScraped: function (url) {
      client.sadd(['scrapedUrl', JSON.stringify(url)], function(err, reply){
          if(err){
              console.log(`scrapedUrl : ${url} did not add properly! error: ${err}`)
          }
          if(!reply){
              console.log(`scrapedUrl : ${url} Already added!`)
          }
      });
      console.log('_setUrlScraped function returned true')
  },

  getNextJob: function () {
		// @TODO test this
      return this.getQueueSize().then(function(result) {
          console.log('getNextJob queue size check!');
          if(result>0){
            console.log('getNextJob queue size ok!');
            return lpopAsync('queue').then(function(res) {
                console.log('getNextJob inside lpop!')
                console.log(JSON.stringify(res))
                return new Promise(function(resolve, reject) {
                    resolve(res)
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
