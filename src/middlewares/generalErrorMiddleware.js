import { logger } from './logMiddleware.js';

export default (err, req, res, next) => {
    logger.error(`Error Status: ${err.status}, Message: ${err.message}`);
    return res.status(err.status || 500).json({
        error: err.message,
    });
};
