const winston = require('winston');
const morgan = require('morgan');

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

// Add console logging if not in production
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Custom morgan token for response time
morgan.token('response-time', (req, res) => {
    if (!req._startAt || !res._startAt) {
        return '';
    }
    const ms = (res._startAt[0] - req._startAt[0]) * 1e3 +
        (res._startAt[1] - req._startAt[1]) * 1e-6;
    return ms.toFixed(3);
});

// Custom morgan format
const morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

// Request logging middleware
const requestLogger = morgan(morganFormat, {
    stream: {
        write: (message) => logger.info(message.trim())
    }
});

// Error logging middleware
const errorLogger = (err, req, res, next) => {
    logger.error({
        message: err.message,
        stack: err.stack,
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
        timestamp: new Date().toISOString()
    });
    next(err);
};

module.exports = {
    logger,
    requestLogger,
    errorLogger
}; 