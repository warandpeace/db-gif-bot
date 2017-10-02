var fs = require('fs');
var http = require('http');
var Twit = require('twit');
var wordfilter = require('wordfilter');

# Add a few extra words to the filter
wordfilter.addWords(['9/11','blackface', 'Vegas', 'trump', 'rifle', 'pistol', 'shotgun']);

var T = new Twit(require('botfiles/config.js'));
var sources = ["buzzfeed","clickhole"];
var desertBus = require('botfiles/desert-bus-list.js');
var buzzfeed = require('buzzfeed-headlines');
var clickhole = require('clickhole-headlines');

//a nice 'pick' function thanks to Darius Kazemi: https://github.com/dariusk
Array.prototype.pick = function() {
  return this[Math.floor(Math.random()*this.length)];
};

//a nice 'download' function thanks to Vince Yuan: http://stackoverflow.com/users/1028103/vince-yuan
var download = function(url, dest, cb) {
  console.log("entering download function")
  console.log(url)
  console.log(dest)
  console.log(cb)
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    console.log("inside http.get function")
    response.pipe(file);
    file.on('finish', function() {
      console.log("inside file.on finish function")
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    console.log("inside file.on error function")
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};

//functions 
function tweetOK(phrase) {
  console.log("function tweetOK")
  if (!wordfilter.blacklisted(phrase) && phrase !== undefined && phrase !== "" && tweetLengthOK(phrase)){
    return true;
  }
  else {
    return false;
  }
}

function tweetLengthOK(phrase) {
  console.log("function tweetLengthOK")
  if (phrase.length <= 130){
    return true;
  }
  else {
    return false;
  }
}

function pickTweet(externalHeadlines){
  console.log("function pickTweet")
  var tweetText = externalHeadlines.pick();
  if (tweetOK(tweetText)) {
    return tweetText;
  }
  else {
    tweetText = pickTweet(externalHeadlines);
  }
}

function chooseBus(){
  return desertBus.pick();
}

function chooseSource(){
  return sources.pick();
}

exports.handler = function myBot(event, context) {
  console.log("ENTERING MAIN EXPORT HANDLER HOLY SHIT")
  var textToTweet = ""
  var busToTweet = chooseBus();
  var gifToTweet = chooseGif();
  var sourceToTweet = chooseSource();
  var gifDownloadUrl = writeGifDownloadUrl();
  var gifLocalUrl = writeGifLocalUrl();

  iDontUnderstandCallbacks();

  function iDontUnderstandCallbacks(){
    console.log("function iDontUnderstandCallbacks")
    // download(gifDownloadUrl, gifLocalUrl, tweetDatGif);
    switch(sourceToTweet){
      case "buzzfeed":
        console.log("chose buzzfeed")
        buzzfeed(function(err, headlines){
          console.log("function buzzfeed")
          console.log(headlines)
          textToTweet = pickTweet(headlines);
          console.log("chosen headline: " + textToTweet)
          download(gifDownloadUrl, gifLocalUrl, tweetDatGif);
        });
        break;
      case "clickhole":
        console.log("chose clickhole")
        clickhole(function(err, headlines){
          console.log("function clickhole")
          console.log(headlines)
          textToTweet = pickTweet(headlines);
          console.log("chosen headline: " + textToTweet)
          download(gifDownloadUrl, gifLocalUrl, tweetDatGif);
        }, 1);
        break;
      default:
        console.log("Something fucked up in a different place.")
    }
  }

  // function shitWorked(){
  //   console.log("It actually worked")
  //   console.log(textToTweet)
  //   console.log(gifLocalUrl)
  //   context.succeed();
  // }

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
    console.log("function tweetDatGif")
    // var b64content = fs.readFileSync(gifLocalUrl, { encoding: 'base64' });
    // first we must post the media to Twitter
    T.postMediaChunked({ file_path: gifLocalUrl }, function (err, data, response) {
      console.log("function MEDIA UPLOAD WHOOP WHOOP")
      if (err) {
        console.log('error:', err);
        context.fail();
      }
      else {
        console.log('response:', response);
      }
      // now we can assign alt text to the media, for use by screen readers and
      // other text-based presentations and interpreters
      var mediaIdStr = data.media_id_string;
      var altText = textToTweet;
      var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } };

      T.post('media/metadata/create', meta_params, function (err, data, response) {
        console.log("function TWEET CREATE METADATA")
        if (!err) {
          // now we can reference the media and post a tweet (media will attach to the tweet)
          var params = { status: textToTweet, media_ids: [mediaIdStr] };

          T.post('statuses/update', params, function (err, data, response) {
            console.log("function MAKIN DA TWEET")
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