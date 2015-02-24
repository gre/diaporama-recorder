var ffmpeg = require("fluent-ffmpeg");
var Q = require("q");
var common = require("../src/common");

var formatsD = Q.defer();

var InterestingFormats = "m4v matroska webm avi 3gp flv mov mp4".split(" ");

ffmpeg.getAvailableFormats(function(err, all) {
  if (err) return formatsD.reject(err);
  var formats = {};
  for (var i = 0; i < InterestingFormats.length; ++i) {
    var k = InterestingFormats[i];
    if (k in all) {
      formats[k] = all[k];
    }
  }
  formatsD.resolve(formats);
});

var notIdentityExtension = {
  matroska: "mkv"
};
function formatToExtension (format) {
  if (format in notIdentityExtension) return notIdentityExtension[format];
  return format;
}


/*
// I guess ffmpeg don't require this to be pass in, but we could give more power to user.

var codecsD = Q.defer();
var InterestingCodecs = "flv libx264 h264 msmpeg4 theora vp8 vp9".split(" ");
ffmpeg.getAvailableCodecs(function(err, all) {
  for (var k in all) {
    var codec = all[k];
    if (codec.canDecode && codec.type === "video") {
      console.log(k+": "+codec.description);
    }
  }
  if (err) return codecsD.reject(err);
  var codecs = {};
  for (var i = 0; i < InterestingCodecs.length; ++i) {
    var k = InterestingCodecs[i];
    if (k in all) {
      codecs[k] = all[k];
    }
  }
  codecsD.resolve(codecs);
});
Video.codecsPromise = codecsD.promise;
*/

function Video (options, logger) {
  for (var k in options)
    this[k] = options[k];
  this.logger = logger;
}

Video.formatsPromise = formatsD.promise;

Video.prototype = {
  videoFormat: "avi",
  // videoCodec: "libx264",
  videoBitrate: "2000k",

  extension: function () {
    return formatToExtension(this.videoFormat);
  },

  feed: function (imageStream) {
    var cmd = ffmpeg({
      logger: this.logger
    });
    if (typeof imageStream === "string") {
      cmd = cmd.input(imageStream)
        .inputFormat("image2");
    }
    else {
      /*
      // FIXME: match format:
      // image/jp(e)g -> mjpeg
      // image/png -> png
      cmd = cmd.input(imageStream)
      .inputFormat("image2pipe")
      .addInputOption('-vcodec', 'mjpeg');
      */
      throw new Error("DiaporamaRecorder: image stream piep: Not Supported Yet.");
    }
    return cmd
      .size(this.width+"x"+this.height)
      .fps(this.fps)
      .format(this.videoFormat)
      //.videoCodec(this.videoCodec)
      .videoBitrate(this.videoBitrate);
  }
};

for (var k in common.defaults) {
  Video.prototype[k] = common.defaults[k];
}

module.exports = Video;

