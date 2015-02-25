var Diaporama = require("diaporama");
var Rx = require("rx");
var common = require("./common");

function identity (x) { return x; }

function extractFromCanvas (canvas, cb, type, quality) {
  // Currently using toDataURL. in the future, might be replaced with toBlob
  if (!canvas.toDataURL) {
    throw new Error("Canvas#toDataURL not available.");
  }
  var dataURL = canvas.toDataURL(type, quality);
  /*
  var data = dataURL.substr(dataURL.indexOf('base64') + 7);
  var buffer = new Buffer(data, 'base64');
  cb(buffer);
  */
  cb(dataURL);
}

function DiaporamaRecorder (json, options) {
  if (!(this instanceof DiaporamaRecorder)) return new DiaporamaRecorder(json, options);
  for (var k in options) {
    this[k] = options[k];
  }
  var container = document.createElement("div");
  var diaporama = Diaporama(container, json, {
    width: this.width,
    height: this.height,
    resolution: 1,
    autoplay: false,
    loop: false
  });

  var load = new Rx.BehaviorSubject();
  diaporama.once("load", load.onCompleted.bind(load));

  this.abortion = new Rx.Subject();

  this.container = container;
  this.diaporama = diaporama;
  this.load = load;

  this.nbFrames = Math.floor(diaporama.duration * this.fps / 1000);
}

DiaporamaRecorder.prototype = {
  // Defaults that will be inherited by prototype
  frameFormat: "image/jpeg",
  frameQuality: 1,

  abort: function (err) {
    this.abortion.onError(err || new Error("user aborted."));
  },

  // Methods
  record: function (serverReceives) {
    var computeAhead = 10;

    var container = this.container;
    var diaporama = this.diaporama;
    var fps = this.fps;
    var width = this.width;
    var height = this.height;
    var frameFormat = this.frameFormat;
    var frameQuality = this.frameQuality;
    var frames = this.nbFrames;
    var abortion = this.abortion;

    var recordCanvas = document.createElement("canvas");
    recordCanvas.width = width;
    recordCanvas.height = height;
    var ctx = recordCanvas.getContext("2d");
    ctx.fillStyle = "#000";

    function captureFrame (i) {
      return Rx.Observable.create(function (observer) {

        diaporama.currentTime = i * 1000 / fps;
        diaporama.renderNow();

        // FIXME: there seems to be a bug of channel priority. transition sometimes are not captured.

        var child = container.children[0];
        ctx.fillRect(0, 0, width, height);
        if (child) {
          ctx.drawImage(child, 0, 0);
        }

        extractFromCanvas(recordCanvas, function (data) {
          observer.onNext({ id: i, data: data });
          observer.onCompleted();
        }, frameFormat, frameQuality);
      });
    }

    var frameStream = this.load.concatMap(function () {
      return Rx.Observable
        .range(0, frames)
        .zip(Rx.Observable.range(0, computeAhead).concat(serverReceives), identity)
        .concatMap(captureFrame)
        .takeUntil(abortion);
    });

    return Rx.Observable.create(function (observer) {
      abortion.subscribe(observer);
      frameStream.subscribe(observer);
    });
  }
};

for (var k in common.defaults) {
  DiaporamaRecorder.prototype[k] = common.defaults[k];
}

module.exports = DiaporamaRecorder;
