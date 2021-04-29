/**
 * A middleware to throttle brute force attempts.
 */
const { db } = require('../utils/database');
const {RateLimiterMySQL} = require('rate-limiter-flexible');
const parse = require('../utils/parse');

const opts = {
    storeClient: db,
    dbName: process.env.DB_NAME,
    tableName: 'rate_limit_protection',
    points: 5,
    duration: 5,
}

const ready = (err) => {

    if (err) {

        console.log('Rate limiter failed to initialize.')
        console.log(err)
    }
};
const rateLimiter = new RateLimiterMySQL(opts, ready);

const rateLimiterMiddleware = (req, res, next) => {

    rateLimiter.consume(parse.getIp(req))
    .then(() => next())
    .catch(() => res.status(429).send('Too Many Requests'));
};

module.exports = rateLimiterMiddleware;
