const { Prisma } = require('@prisma/client');
const { AppError } = require('../utils/errors');

/**
 * Middleware to map dependency-specific errors (Prisma, Axios, Storage)
 * to standardized AppErrors.
 */
module.exports = (err, req, res, next) => {
    // 1. Prisma Errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: Unique constraint failed
        if (err.code === 'P2002') {
            const field = err.meta?.target?.[0] || 'field';
            return next(new AppError(`Duplicate value for ${field}`, 409, 'CONFLICT', { field }));
        }

        // P2025: Record not found (when using findUniqueOrThrow or delete/update/connect)
        if (err.code === 'P2025') {
            return next(new AppError('Record not found', 404, 'NOT_FOUND'));
        }

        // P2003: Foreign key constraint failed
        if (err.code === 'P2003') {
            const field = err.meta?.field_name || 'dependency';
            return next(new AppError(`Invalid reference to ${field}`, 400, 'BAD_REQUEST', { field }));
        }
    }

    // 2. Prisma Validation Errors (e.g., param types)
    if (err instanceof Prisma.PrismaClientValidationError) {
        if (process.env.NODE_ENV === 'production') {
            return next(new AppError('Invalid database query', 400, 'BAD_REQUEST'));
        }
        // In dev, let it fall through for full stack trace, or wrap it
        // return next(new AppError('Database validation error', 400, 'BAD_REQUEST', { details: err.message }));
    }

    // 3. Axios / External API Errors
    if (err.isAxiosError) {
        // Upstream service unavailable or timeout
        if (!err.response) {
            return next(new AppError('External service unavailable', 503, 'SERVICE_UNAVAILABLE', {
                service: err.config?.url,
                code: err.code
            }));
        }

        // Upstream returned an error (4xx/5xx) -> Map to 502 or 424 (Failed Dependency)
        // We generally don't want to blindly return the upstream status code as our own,
        // but we can map 4xx to 400 if it's user-input related, or 502 otherwise.
        return next(new AppError('Upstream service error', 502, 'BAD_GATEWAY', {
            originalStatus: err.response.status,
            service: err.config?.url
        }));
    }

    // 4. Google Cloud Storage Errors (common pattern in nodejs-storage)
    if (err.code === 404 && err.message?.includes('No such object')) {
        return next(new AppError('File not found in storage', 404, 'NOT_FOUND'));
    }

    // Fallback to next error handler
    next(err);
};
