var Diaporama = require("diaporama");
var Rx = require("rx");

function extractFromCanvas (canvas, cb, type, quality) {
  // Currently using toDataURL. in the future, might be replaced with toBlob
  if (!canvas.toDataURL) {
    throw new Error("Canvas#toDataURL not available.");
  }
  cb(canvas.toDataURL(type, quality));
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
  width: 800,
  height: 600,
  frameFormat: "image/jpeg",
  frameQuality: 1,

  abort: function (err) {
    this.abortion.onError(err || new Error("user aborted."));
  },

  // Methods
  record: function () {
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

        var child = container.children[0];
        ctx.fillRect(0, 0, width, height);
        if (child) {
          ctx.drawImage(child, 0, 0);
        }

        extractFromCanvas(recordCanvas, function (data) {
          observer.onNext(data);
          observer.onCompleted();
        }, frameFormat, frameQuality);
      });
    }

    var frameStream = this.load.concatMap(function () {
      return Rx.Observable
        .range(0, frames, Rx.Scheduler.timeout)
        .concatMap(captureFrame)
        .takeUntil(abortion);
    });

    return Rx.Observable.create(function (observer) {
      abortion.subscribe(observer);
      frameStream.subscribe(observer);
    });
  }
};

module.exports = DiaporamaRecorder;
