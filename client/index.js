var Rx = require("rx");

var E = require("../src/common").events;
var DiaporamaRecorder = require("../src/DiaporamaRecorder");

function bind (network) {

  return function generateVideo (diaporama, options) {

    var recorder = DiaporamaRecorder(diaporama, options);

    var tl = diaporama.timeline;
    var duration = 0;
    var lastTransitionDuration = 0;
    for (var i=0; i < tl.length; ++i) {
      var el = tl[i];
      duration += el.duration + (lastTransitionDuration = el.transitionNext.duration);
    }
    duration -= lastTransitionDuration;

    network.emit(E.client.begin, recorder.nbFrames, options);

    network.once(E.server.error, function (msg) {
      recorder.abort(new Error(msg));
    });

    recorder
      .record()
      .subscribe(function (o) {
        network.emit(E.client.frame, o.id, o.data);
        // (o.id / recorder.nbFrames);
      }, function (error) {
        network.emit(E.client.abort, { message: error.message });
      }, function () {
        network.emit(E.client.end);
      });

  };

}


module.exports = bind;
