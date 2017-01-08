var fs = require('fs');
var http = require('http');
var Twit = require('twit');
var wordfilter = require('wordfilter');

var T = new Twit(require('botfiles/config.js'));
var myText = require('botfiles/sample-text.js');
var desertBus = require('botfiles/desert-bus-list.js');
var buzzfeed = require('buzzfeed-headlines');

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

function pickTweet(buzzfeedHeadlines){
  var tweetText = buzzfeedHeadlines.pick();
  if (tweetOK(tweetText)) {
    return tweetText;
  }
  else {
    tweetText = pickTweet();
  }
}

function chooseBus(){
  return desertBus.pick();
}


exports.handler = function myBot(event, context) {
  var textToTweet = ""
  var busToTweet = chooseBus();
  var gifToTweet = chooseGif();
  var gifDownloadUrl = writeGifDownloadUrl();
  var gifLocalUrl = writeGifLocalUrl();

  buzzfeed(function(err, headlines){
    textToTweet = pickTweet(headlines);
    download(gifDownloadUrl, gifLocalUrl, tweetDatGif);
  });

  function chooseGif(){
    switch(busToTweet){
      case "DesertBus5-6-7":
        var gifList = require('botfiles/db567-gif-list.js');
        break;
      case "DesertBus8":
        var gifList = require('botfiles/db8-gif-list.js');
        break;
      case "DesertBus9":
        var gifList = require('botfiles/db9-gif-list.js');
        break;
      case "DesertBus10":
        var gifList = require('botfiles/db10-gif-list.js');
        break;
      default:
        console.log("Something fucked up.")
    }
    return gifList.pick()
  }

  function writeGifDownloadUrl(){
    var GifUrl = "http://hats.retrosnub.uk/" + busToTweet + "/" + gifToTweet
    return GifUrl
  }

  function writeGifLocalUrl(){
    var GifUrl = "/tmp/" + gifToTweet
    return GifUrl
  }

  function tweetDatGif(){
    var b64content = fs.readFileSync(gifLocalUrl, { encoding: 'base64' });
    // first we must post the media to Twitter
    T.post('media/upload', { media_data: b64content }, function (err, data, response) {
      // now we can assign alt text to the media, for use by screen readers and
      // other text-based presentations and interpreters
      var mediaIdStr = data.media_id_string;
      var altText = textToTweet;
      var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } };

      T.post('media/metadata/create', meta_params, function (err, data, response) {
        if (!err) {
          // now we can reference the media and post a tweet (media will attach to the tweet)
          var params = { status: textToTweet, media_ids: [mediaIdStr] };

          T.post('statuses/update', params, function (err, data, response) {
            if (err) {
              console.log('error:', err);
              context.fail();
            }
            else {
              console.log('tweet:', response);
              context.succeed();
            }
          });
        }
        else {
          console.log(err);
        }
      });
    });
  }
}