const log4js = require('log4js');

function getLogger(loggerName) {
    const logger = log4js.getLogger(loggerName);
    // Set default log level to info
    logger.level = process.env.LOG_LEVEL || "info";
    return logger;
}

module.exports = getLogger;
