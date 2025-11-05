/**
 * Collection Routes
 * [2025-01-27 00:00:00]
 */
const express = require('express');
const router = express.Router();
const { getCollections, getCollectionBySlug } = require('../controllers/collectionController');

// GET /api/collections - List all collections
router.get('/', getCollections);

// GET /api/collections/:slug - Get collection by slug
router.get('/:slug', getCollectionBySlug);

module.exports = router;
