const { z } = require('zod');

// Common schemas
const commonSchemas = {
    // UUID validation
    uuidParams: z.object({
        id: z.string().uuid({ message: 'Invalid ID format' }),
    }),

    // Pagination defaults
    paginationQuery: z.object({
        page: z.string().optional().transform(val => {
            const parsed = parseInt(val);
            return (isNaN(parsed) || parsed < 1) ? 1 : Math.min(parsed, 100000); // 限制页码最大 10万
        }),
        limit: z.string().optional().transform(val => {
            const parsed = parseInt(val);
            return (isNaN(parsed) || parsed < 1) ? 20 : Math.min(parsed, 100); // 限制每页最大 100
        }),
        search: z.string().optional().transform(val => val?.trim()),
        sort: z.string().optional(),
    }),

    // Safe integer for Postgres Int4 (standard integer type)
    // Range: -2,147,483,648 to +2,147,483,647
    safeInt: z.string().optional().transform(val => {
        if (val === undefined || val === null || val === '') return undefined;
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) return undefined;
        // Clamp to Int4 range to prevent DB errors
        return Math.min(Math.max(parsed, -2147483648), 2147483647);
    }),

    // Empty object (useful for strict body validation)
    emptyBody: z.object({}),
};

module.exports = commonSchemas;
