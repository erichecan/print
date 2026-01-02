const { ValidationError } = require('../utils/errors');

/**
 * Validates request data against specific Zod schema
 * @param {Object} schema - Zod schema object
 * @param {string} source - 'body', 'query', or 'params' (default: 'body')
 */
const validate = (schema, source = 'body') => (req, res, next) => {
    try {
        const data = req[source];
        const validatedData = schema.parse(data);

        // Replace request data with verified/typed data
        req[source] = validatedData;

        next();
    } catch (error) {
        if (error.name === 'ZodError') {
            const details = error.errors.reduce((acc, curr) => {
                const field = curr.path.join('.');
                acc[field] = curr.message;
                return acc;
            }, {});

            next(new ValidationError('Validation failed', details));
        } else {
            next(error);
        }
    }
};

module.exports = validate;
