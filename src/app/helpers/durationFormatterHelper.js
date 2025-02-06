const moment = require("moment");

const getMomentFormattedDuration = (minutes) =>
  moment.duration(minutes, "minutes").humanize();

module.exports = {
  getMomentFormattedDuration,
};
