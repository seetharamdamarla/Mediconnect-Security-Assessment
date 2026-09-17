const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const {
  addPrescription,
  getPrescriptionsForPatient,
  getPrescriptionsByDoctor,
  endPrescription,
} = require('../controllers/prescriptionController');
const router = express.Router();

router.post('/add', authenticateToken, authorizeRoles('doctor'), addPrescription);
router.get('/my', authenticateToken, authorizeRoles('patient'), getPrescriptionsForPatient);
router.get('/by-doctor', authenticateToken, authorizeRoles('doctor'), getPrescriptionsByDoctor);
router.put('/end/:id', authenticateToken, authorizeRoles('doctor'), endPrescription);

module.exports = router;
