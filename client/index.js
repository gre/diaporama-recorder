var Rx = require("rx");

var E = require("../src/common").events;
var DiaporamaRecorder = require("../src/DiaporamaRecorder");

var videoOptionsFromRecorder = "width height frameFormat fps".split(" ");
var videoOnlyOptions = "videoFormat videoBitrate".split(" ");

function bind (network) {

  return {

    getFormats: function () {
      network.emit(E.client.getFormats);
      return Rx.Observable.fromEvent(network, E.server.formats).first();
    },

    generateVideo: function generateVideo (diaporama, options) {
      if (!options) options = {};

      var termination = new Rx.Subject();

      var recorder = DiaporamaRecorder(diaporama, options);

      var videoOptions = {};

      videoOptionsFromRecorder.forEach(function (k) {
        videoOptions[k] = recorder[k];
      });
      videoOnlyOptions.forEach(function (k) {
        if (k in options)
          videoOptions[k] = options[k];
      });

      network.once(E.server.error, function (msg) {
        recorder.abort(new Error(msg));
      });

      var processing = Rx.Observable.fromEvent(network, E.server.processing)
        .first()
        .takeUntil(termination);

      var received = Rx.Observable.fromEvent(network, E.server.received)
        .takeUntil(processing);

      var progress = Rx.Observable.fromEvent(network, E.server.progress)
        .takeUntil(termination);

      var frameComputations = new Rx.Subject();

      network.once(E.server.error, termination.onError.bind(termination));
      network.once(E.server.success, termination.onCompleted.bind(termination));

      network.emit(E.client.begin, recorder.nbFrames, videoOptions);

      recorder
        .record(received)
        .subscribe(function (o) {
          network.emit(E.client.frame, o.id, o.data);
          frameComputations.onNext(o.id);
          // (o.id / recorder.nbFrames);
        }, function (error) {
          console.log(error);
          network.emit(E.client.abort, error.message);
          termination.onError(error);
        }, function () {
          network.emit(E.client.end);
        });

      return {
        nbFrames: recorder.nbFrames,
        frameComputations: frameComputations,
        termination: termination,
        received: received,
        progress: progress

      };
    }

  };

}


module.exports = bind;
