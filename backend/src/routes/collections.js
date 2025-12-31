/**
 * Collection Routes
 */
const express = require('express');
const router = express.Router();
const { getCollections, getCollectionBySlug } = require('../controllers/collectionController');

// GET /api/collections - List all collections
router.get('/', getCollections);

// GET /api/collections/:slug - Get collection by slug
router.get('/:slug', getCollectionBySlug);

module.exports = router;
