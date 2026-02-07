const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/generate-intervention', aiController.generateIntervention);

module.exports = router;
