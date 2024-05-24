const log4js = require('log4js');
const logLevel = process.env.LOG_LEVEL || 'info';

log4js.configure({
    appenders: {
        out: {
            type: 'stdout',
            layout: {
                type: 'pattern',
                pattern: '%[%d{dd-MM-yy hh:mm:ss} | %p | %f{1}:%l%] - %m',
            }
        }
    },
    categories: {
        default: {
            appenders: ['out'],
            useCallStack: true,
            enableCallStack: true,
            level: logLevel
        }
    }
});


function getLogger() {
    return log4js.getLogger();
}

module.exports = getLogger;
