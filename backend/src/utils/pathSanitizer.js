/**
 * Path Sanitizer Utility
 * Prevents path traversal vulnerabilities and ensures safe filenames.
 */
const path = require('path');

/**
 * Sanitize a filename by removing path separators and suspicious patterns.
 * @param {string} filename - The filename to sanitize
 * @returns {string} - Clean filename
 */
function sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') return '';

    // Remove all path segments to prevent traversal
    const basename = path.basename(filename);

    // Replace anything that isn't a letter, number, dot, dash, or underscore
    return basename.replace(/[^a-z0-9.\-_]/gi, '_');
}

/**
 * Validates that a path is relative and doesn't contain traversal patterns.
 * @param {string} inputPath - The path to validate
 * @returns {boolean} - True if safe
 */
function isSafeRelativePath(inputPath) {
    if (!inputPath || typeof inputPath !== 'string') return false;

    // Check for absolute paths
    if (path.isAbsolute(inputPath)) return false;

    // Check for traversal patterns (.. , \ , etc)
    const normalized = path.normalize(inputPath);
    if (normalized.startsWith('..') || normalized.includes('..')) return false;

    return true;
}

module.exports = {
    sanitizeFilename,
    isSafeRelativePath
};
