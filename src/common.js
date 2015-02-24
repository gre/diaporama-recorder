
var eventsPrefix = "DR:";

module.exports = {
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
