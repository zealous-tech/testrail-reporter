const constants = require("./constants");

class Utils {

  _formatTime(ms) {
    const msPerSec = 1000;
    const secPerMin = 60;
    const minPerHour = 60;

    if (ms >= minPerHour * secPerMin * msPerSec) {
      const h = Math.floor(ms / (minPerHour * secPerMin * msPerSec));
      const m = Math.floor((ms % (minPerHour * secPerMin * msPerSec)) / (secPerMin * msPerSec));
      const s = Math.round((ms % (secPerMin * msPerSec)) / msPerSec);
      return `${h}h ${m}m ${s}s`;
    }
    if (ms >= secPerMin * msPerSec) {
      const m = Math.floor(ms / (secPerMin * msPerSec));
      const s = Math.round((ms % (secPerMin * msPerSec)) / msPerSec);
      return `${m}m ${s}s`;
    }
    if (ms === 0) return false;
    return `${Math.max(1, Math.round(ms / msPerSec))}s`;
  }


  /**
   * Extracts TestRail case IDs from the test title if they exist
   * @param {*} title
   * @returns
   */
  _extractCaseIdsFromTitle(title) {
    const matches = [];
    let match;
    while ((match = constants.CASE_ID_REGEX.exec(title)) !== null) {
      if (match[1]) {
        matches.push(parseInt(match[1]));
      }
    }
    return matches;
  }

  /**
   * Removes unwanted whitespaces and bracets,
   * and formats the string to a standardized format
   * @param {*} str
   * @returns
   */
  _sanitizeString(str) {
    return str.replace(/[\s'"]/g, "").toLowerCase();
  }

  _padTwoDigits(num) {
    return num.toString().padStart(2, "0");
  }

  _dateInDdMmYyyyHhMmSs() {
    const date = new Date();
    const dateDiveder = "-";
    const month = constants.MONTH_NAMES[date.getMonth()];

    return (
      [
        this._padTwoDigits(date.getDate()),
        month,
        date.getFullYear(),
      ].join(dateDiveder) +
      " " +
      [
        this._padTwoDigits(date.getHours()),
        this._padTwoDigits(date.getMinutes()),
        this._padTwoDigits(date.getSeconds()),
      ].join(":")
    );
  }

}

module.exports = Utils;
