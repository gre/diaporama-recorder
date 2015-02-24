
var eventsPrefix = "DR:";

module.exports = {
  defaults: {
    width: 1920,
    height: 1080,
    fps: 30
  },
  events: {
    client: {
      begin: eventsPrefix+"b",
      frame: eventsPrefix+"f",
      abort: eventsPrefix+"a",
      end: eventsPrefix+"e"
    },
    server: {
      error: eventsPrefix+"e",
      success: eventsPrefix+"s",
      received: eventsPrefix+"r",
      processing: eventsPrefix+"c",
      progress: eventsPrefix+"p"
    }
  }
};
