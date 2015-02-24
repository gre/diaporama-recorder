var ffmpeg = require("fluent-ffmpeg");

/*
ffmpeg.getAvailableFormats(function(err, formats) {
  console.log('Available formats:');
  console.dir(formats);
});

ffmpeg.getAvailableCodecs(function(err, codecs) {
  console.log('Available codecs:');
  console.dir(codecs);
});
*/

function Video (options, logger) {
  for (var k in options)
    this[k] = options[k];
  this.logger = logger;
}

Video.prototype = {
  width: 800,
  height: 600,
  fps: 25,
  format: "avi",
  videoCodec: "libx264",
  videoBitrate: "2000k",

  extension: function () {
    return "avi";
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
      // FIXME: match format:
      // image/jp(e)g -> mjpeg
      // image/png -> png
      cmd = cmd.input(imageStream)
      .inputFormat("image2pipe")
      .addInputOption('-vcodec', 'mjpeg');
    }
    return cmd
      .size(this.width+"x"+this.height)
      .fps(this.fps)
      .format(this.format)
      .videoCodec(this.videoCodec)
      .videoBitrate(this.videoBitrate);
  }
};


module.exports = Video;

