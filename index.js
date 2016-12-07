var fs = require('fs');
var http = require('http');
var Twit = require('twit');
var wordfilter = require('wordfilter');
var T = new Twit(require('botfiles/config.js'));
var myText = require('botfiles/sample-text.js');

//a nice 'pick' function thanks to Darius Kazemi: https://github.com/dariusk
Array.prototype.pick = function() {
  return this[Math.floor(Math.random()*this.length)];
};

//a nice 'download' function thanks to Vince Yuan: http://stackoverflow.com/users/1028103/vince-yuan
var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};

//functions 
function tweetOK(phrase) {
  if (!wordfilter.blacklisted(phrase) && phrase !== undefined && phrase !== "" && tweetLengthOK(phrase)){
    return true;
  }
  else {
    return false;
  }
}

function tweetLengthOK(phrase) {
  if (phrase.length <= 130){
    return true;
  }
  else {
    return false;
  }
}

function pickTweet(){
  var tweetText = myText.pick();
  if (tweetOK(tweetText)) {
    return tweetText;
  }
  else {
    tweetText = pickTweet();
  }
}

exports.handler = function myBot(event, context) {
  var textToTweet = pickTweet();
	T.post('statuses/update', { status: textToTweet }, function(err, reply) {
    if (err) {
      console.log('error:', err);
      context.fail();
    }
    else {
      console.log('tweet:', reply);
      context.succeed();
    }
  });
};
