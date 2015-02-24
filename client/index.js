var Rx = require("rx");

var E = require("../src/common").events;
var DiaporamaRecorder = require("../src/DiaporamaRecorder");

var videoOptionsFromRecorder = "width height frameFormat fps".split(" ");
var videoOnlyOptions = "videoFormat videoBitrate".split(" ");

function bind (network) {

  return {

    generateVideo: function generateVideo (diaporama, options) {
      if (!options) options = {};

      var subject = new Rx.Subject();
      var recorder = DiaporamaRecorder(diaporama, options);

      var videoOptions = {};

      videoOptionsFromRecorder.forEach(function (k) {
        videoOptions[k] = recorder[k];
      });
      videoOnlyOptions.forEach(function (k) {
        if (k in options)
          videoOptions[k] = options[k];
      });

      network.emit(E.client.begin, recorder.nbFrames, videoOptions);

      network.once(E.server.error, function (msg) {
        recorder.abort(new Error(msg));
      });

      network.on(E.server.processing, function (frameId) {
        subject.onNext({ type: "server-processing" });
      });
      network.on(E.server.received, function (frameId) {
        subject.onNext({ type: "server-received", i: frameId, percent: (frameId+1) / recorder.nbFrames });
      });
      network.on(E.server.progress, function (frames) {
        subject.onNext({ type: "server-progress", frames: frames, percent: frames / recorder.nbFrames });
      });
      network.once(E.server.error, subject.onError.bind(subject));
      network.once(E.server.success, subject.onCompleted.bind(subject));

      recorder
        .record()
        .subscribe(function (o) {
          network.emit(E.client.frame, o.id, o.data);
          subject.onNext({ type: "frame-computed", i: o.id, percent: (o.id+1) / recorder.nbFrames });
          // (o.id / recorder.nbFrames);
        }, function (error) {
          network.emit(E.client.abort, { message: error.message });
          subject.onError(error);
        }, function () {
          network.emit(E.client.end);
        });

      return subject.asObservable();
    }

  };

}


module.exports = bind;
