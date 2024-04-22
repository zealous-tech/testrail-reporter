const regex = /C([?\d]{1,9})/;

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

  _formatTitle(title) {
    let _t = title.match(regex);
    return _t;
  }
}

module.exports = Utils;
