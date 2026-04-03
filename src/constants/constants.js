
const months = Object.freeze([
    "Jan", "Feb", "Mar",
    "Apr", "May", "Jun",
    "Jul", "Aug", "Sep",
    "Oct", "Nov", "Dec"
]);

module.exports = Object.freeze({
    CASE_ID_REGEX: /C(\d{1,9})/g,
    MONTH_NAMES: months,
    MAX_CASES_PER_RUN_FETCH : 250 
});
