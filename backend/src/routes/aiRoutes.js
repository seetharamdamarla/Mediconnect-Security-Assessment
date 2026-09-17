const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const { assessSymptoms } = require('../controllers/aiController');
const router = express.Router();

// POST /api/ai/symptom-check — Patient-only AI symptom assessment
router.post('/symptom-check', authenticateToken, authorizeRoles('patient'), assessSymptoms);

module.exports = router;
