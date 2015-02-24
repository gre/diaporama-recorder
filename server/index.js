var fs = require("fs");
var Q = require("q");
var tmp = require("tmp");
var Video = require("./Video");

var E = require("../src/common").events;

function values (obj) {
  var v = [];
  for (var k in obj) {
    if (obj.hasOwnProperty(k)) {
      v.push(obj[k]);
    }
  }
  return v;
}

var frameFormats = {
  "image/jpg": { ext: "jpg" },
  "image/png": { ext: "png" }
};

frameFormats["image/jpeg"] = frameFormats["image/jpg"];

function bind (io, logger) {
  if (!logger) {
    logger = {
      debug: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error
    };
  }
  io.sockets.on('connection', function (socket) {

    // Handle Video Submission
    socket.once(E.client.begin, function videoBegin (nbFrames, options) {
      logger.info("Receiving video...");
      var video = new Video(options, logger);

      var frameFormat = frameFormats[options.frameFormat];

      var frames = {};

      var tmpDir = (function(){
        var d = Q.defer();
        tmp.dir(function (err, path) {
          if (err) d.reject(err);
          d.resolve(path);
        });
        return d.promise;
      }());

      function clean () {
      }

      function terminateFailure (error) {
        logger.error("Internal failure: "+error.message);
        socket.emit(E.server.error, error.message);
        clean();
        rebind();
      }

      function terminateSuccess () {
        logger.info('Processing finished !');
        socket.emit(E.server.success);
        rebind();
      }

      function clientFrame (frameId, dataUrl) {
        logger.info("Received "+frameId);
        if (frameId > nbFrames) {
          return terminateFailure(new Error("reach an invalid frameId="+frameId));
        }
        if (frameId in frames) {
          return terminateFailure(new Error("reach an already existing frameId="+frameId));
        }
        var split = dataUrl.split(",");

        var mime;
        try {
          mime = split[0].substring(5).split(";")[0];
        }
        catch (e) {
          return terminateFailure(new Error("invalid data64 format."));
        }

        if (!(mime in frameFormats && frameFormats[mime].ext === frameFormat.ext)) {
          return terminateFailure(new Error("base64 format mimetype '"+mime+"' doesn't match the expected frameFormat '"+options.frameFormat+"'"));
        }
        else {
          var buffer = new Buffer(split[1], 'base64');

          frames[frameId] = tmpDir.then(function (path) {
            var stream = fs.createWriteStream(path+"/"+frameId+"."+frameFormat.ext);
            stream.end(buffer);
            socket.emit(E.server.received, frameId);
          }).fail(terminateFailure);
        }
      }

      function clientAbort (message) {
        logger.warn("Client interrupt: "+message);
        clean();
        rebind();
      }

      function clientEnd () {
        logger.debug("Video received. "+nbFrames+" frames.");
        var promises = values(frames);
        if (promises.length === nbFrames) {
          Q.all(promises)
            .thenResolve(tmpDir)
            .then(function (path) {
              logger.debug("Video processing...");
              video.feed(path+"/%d."+frameFormat.ext)
              .on('start', function (cmd) {
                logger.debug(cmd);
                socket.emit(E.server.processing);
              })
              .on('progress', function (p) {
                socket.emit(E.server.progress, p.frames);
              })
              .on('error', terminateFailure)
              .on('end', terminateSuccess)
              .save("output."+video.extension());
            })
            .fail(terminateFailure);
        }
        else {
          terminateFailure(new Error("frames count doesn't match. expected "+nbFrames+", received "+promises.length));
        }
      }

      function clientDisconnect () {
        logger.warn("Client disconnected.");
        clean();
      }

      function rebind () {
        socket.removeListener("disconnect", clientDisconnect);
        socket.removeListener(E.client.frame, clientFrame);
        socket.removeListener(E.client.abort, clientAbort);
        socket.removeListener(E.client.end, clientEnd);
        socket.once(E.client.begin, videoBegin);
      }

      socket.once("disconnect", clientDisconnect);
      socket.on(E.client.frame, clientFrame);
      socket.once(E.client.abort, clientAbort);
      socket.once(E.client.end, clientEnd);

      tmpDir.fail(terminateFailure);
      if (!frameFormat) {
        terminateFailure(new Error("Frame Format not supported: "+options.frameFormat));
      }

      Video.formatsPromise.then(function (formats) {
        if ( !(video.videoFormat in formats) ) {
          terminateFailure(new Error("requested format is not supported."));
        }
      });


    });


  });

}

module.exports = bind;
