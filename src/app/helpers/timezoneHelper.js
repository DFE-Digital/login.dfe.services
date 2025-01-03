const moment = require("moment");

const datetimeFormats = {
  shortDateFormat: "DD MMM YYYY",
  longDateFormat: "DD MMM YYYY hh:mma",
};

const numberOfHours = 24;

/**
 * Returns a formatted time string for a given timestamp or date in the 'Europe/London' timezone.
 * @param {number|Date} [value] - The timestamp (in ms) or Date object to format.
 * @param {string} [format] - The date format string to use.
 * @returns {string} Time formatted Eg. 'HH:mm:ss' in the 'Europe/London' timezone.
 * @throws {TypeError} If the provided value is not a valid date or timestamp.
 */
function getFormattedMomentForTz(value, format) {
  const dateValue = new Date(value);

  // Ensure the value is a valid date
  if (Number.isNaN(dateValue.getTime())) {
    throw new TypeError("Invalid date or timestamp");
  }

  return moment(dateValue).format(format);
}
/**
 * Checks if the difference between two login times is greater than 24 hours.
 * @param {string} last_login - The last login time in 'YYYY-MM-DD HH:mm:ss.SSS' format.
 * @param {string} prev_login - The previous login time in 'YYYY-MM-DD HH:mm:ss.SSS' format.
 * @returns {boolean} True if the difference is greater than 24 hours, otherwise false.
 */
const isLoginOver24 = (last_login, prev_login) => {
  let a = moment(last_login, "YYYY-MM-DD HH:mm:ss.SSS");
  let b = moment(prev_login, "YYYY-MM-DD HH:mm:ss.SSS");
  // not working as it does not recognize date so is never going to be more than 23h
  // let a = moment(last_login, 'HH:mm');
  // let b = moment(prev_login, 'HH:mm');
  let checkfor24 = a.diff(b, "hours");
  if (checkfor24 > numberOfHours) {
    return true;
  }
  return false;
};

function dateFormat(date, formatKey) {
  return getFormattedMomentForTz(date, datetimeFormats[formatKey]);
}

module.exports = {
  getFormattedMomentForTz,
  isLoginOver24,
  dateFormat,
};
