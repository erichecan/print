/**
 * Chaos Middleware
 * Simulates runtime failures for testing resilience
 * ENABLED ONLY IF NODE_ENV !== 'production'
 */
const { AppError, ServiceUnavailableError, InternalServerError } = require('../utils/errors');
const logger = require('../utils/logger');

const chaosMiddleware = (req, res, next) => {
    // STRICT SAFETY CHECK:
    // Never run in production unless explicitly overridden by a dangerous flag (which we won't implement for now)
    if (process.env.NODE_ENV === 'production') {
        return next();
    }

    const fault = req.headers['x-fault'];

    if (!fault) {
        return next();
    }

    logger.warn(`⚠️  Chaos injected: ${fault}`, { traceId: req.traceId });

    switch (fault) {
        case 'error':
            // Simulate generic 500
            return next(new InternalServerError('Simulated generic 500 error from chaos middleware'));

        case 'timeout':
            // Simulate 504 Gateway Timeout (or just a hung request)
            // We'll delay for 10 seconds, which might trigger client timeouts
            logger.info('Simulating timeout (10s delay)...');
            setTimeout(() => {
                // After timeout, we can either send nothing (hanging) or a 504
                // Let's send a 504 to be "nice" to the test, but strictly speaking a true timeout might just hang
                next(new AppError('Simulated Upstream Timeout', 504, 'GATEWAY_TIMEOUT', 'DEPENDENCY_ERROR'));
            }, 10000);
            break;

        case 'db-down':
            // Simulate Database failure
            return next(new ServiceUnavailableError('Simulated Database Connection Failure', { component: 'database' }));

        case 'slow':
            // Simulate latency
            const latency = Math.floor(Math.random() * 2000) + 100; // 100ms - 2100ms
            logger.info(`Simulating latency: ${latency}ms`);
            setTimeout(next, latency);
            break;

        default:
            // Unknown fault type, ignore
            next();
    }
};

module.exports = chaosMiddleware;
