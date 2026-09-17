const aiService = require('../services/aiService');
const db = require('../db');
const securityLogger = require('../utils/securityLogger');

/**
 * POST /api/ai/symptom-check
 * Patient submits symptoms → AI assesses → backend authorizes → audit log
 * Architecture: User → AI → Structured Response → Backend Authorization → Audit Log
 */
const assessSymptoms = async (req, res) => {
  const userId = req.user.userId;
  const userRole = req.user.role;
  const { symptoms, ageGroup, gender } = req.body;

  // Authorization: Only patients can use symptom checker
  if (userRole !== 'patient') {
    securityLogger.logAuthzFailure(userId, userRole, 'ai/symptom-check', 'Non-patient attempted AI symptom check');
    return res.status(403).json({ message: 'Only patients can use the symptom checker' });
  }

  // Input validation
  if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length < 3) {
    return res.status(400).json({ message: 'Please describe your symptoms (minimum 3 characters)' });
  }

  if (symptoms.length > 1000) {
    return res.status(400).json({ message: 'Symptom description too long (max 1000 characters)' });
  }

  try {
    // Log AI request (without PHI details — just metadata)
    securityLogger.logAIRequest(userId, 'symptom-check', symptoms.length);

    // Call AI service with patient context
    const assessment = await aiService.assessSymptoms(symptoms, {
      ageGroup: ageGroup || 'unknown',
      gender: gender || 'unknown',
    });

    // Log AI response (severity only, no PHI)
    securityLogger.logAIResponse(userId, 'symptom-check', assessment.severity, true);

    // Store the assessment in activity log (metadata only)
    await db.query(
      'INSERT INTO activity_logs (user_id, role, description) VALUES ($1, $2, $3)',
      [userId, userRole, `AI symptom assessment completed — severity: ${assessment.severity}`]
    );

    return res.json({
      assessment: assessment.assessment,
      severity: assessment.severity,
      recommendations: assessment.recommendations,
      shouldBookAppointment: assessment.shouldBookAppointment,
      specialistType: assessment.specialistType,
      disclaimer: 'This is an AI-powered assessment and NOT a medical diagnosis. Please consult a healthcare professional for proper evaluation.',
    });
  } catch (err) {
    securityLogger.logAIResponse(userId, 'symptom-check', 'error', false);
    console.error('[AI Controller] Error:', err.message);
    return res.status(500).json({ message: 'AI service temporarily unavailable' });
  }
};

module.exports = { assessSymptoms };
