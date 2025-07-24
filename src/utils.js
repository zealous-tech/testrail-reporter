const constants = require("./constants");

class Utils {
  _formatTime(ms) {
    const milsecond = 1000;
    const second = 60;
    const minute = 60;
    if (ms >= minute * second * milsecond) {
      const h = Math.floor(ms / (minute * second * milsecond));
      const m = Math.floor(ms / (second * milsecond)) - h * minute;
      const s = Math.round(ms / milsecond) - m * second;
      return `${h}h ${m}m ${s}s`;
    }
    if (ms >= second * milsecond) {
      const m = Math.floor(ms / (second * milsecond));
      const s = Math.round(ms / milsecond) - m * second;
      return `${m}m ${s}s`;
    }
    if (ms === 0) return false;
    let s = Math.round(ms / milsecond);
    s = !!s ? s : 1;
    return `${s}s`;
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
