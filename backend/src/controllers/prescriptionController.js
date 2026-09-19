const db = require('../db');
const {
  BadRequestError,
  NotFoundError,
  InternalServerError,
  AppError,
} = require('../utils/errors');
const { logActivity } = require('./activityLogController');

const addPrescription = async (req, res) => {
  const { patientName, patientDob, patientId, drugName, dosage, instructions, endDate } = req.body;

  if (!patientName || !patientDob || !patientId || !drugName || !dosage) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const userId = req.user.userId;
  const role = req.user.role;

  try {
    const dr = await db.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    const doctor_id = dr.rows[0]?.id;
    if (!doctor_id) {
      return res.status(400).json({ message: 'Doctor not found' });
    }

    const dg = await db.query('SELECT id FROM drugs WHERE name ILIKE $1', [drugName]);
    const drug_id = dg.rows[0]?.id;
    if (!drug_id) {
      return res.status(404).json({ message: 'Drug not found' });
    }

    const pt = await db.query(
      `SELECT id
         FROM patients
        WHERE (government_id = $1 OR CAST(id AS TEXT) = $1 OR CAST(user_id AS TEXT) = $1)
          AND CONCAT(first_name, ' ', last_name) = $2
          AND birth_date = $3`,
      [patientId, patientName, patientDob]
    );
    const patient = pt.rows[0];
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    await db.query(
      `INSERT INTO prescriptions
         (patient_id, doctor_id, drug_id, dosage, instructions, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [patient.id, doctor_id, drug_id, dosage, instructions, endDate || null]
    );

    await logActivity(userId, role, `Prescribed ${drugName} to ${patientName}`);

    return res.status(201).json({ message: 'Prescription added successfully' });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('Error in addPrescription:', err);
    return res.status(500).json({ message: 'Error adding prescription' });
  }
};

const endPrescription = async (req, res) => {
  const id = req.params.id;
  const userId = req.user.userId;

  try {
    // Verify the requesting user is the prescribing doctor
    const dr = await db.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    if (dr.rows.length === 0) {
      return res.status(403).json({ message: 'Only doctors can end prescriptions' });
    }
    const doctorId = dr.rows[0].id;

    const result = await db.query(
      `UPDATE prescriptions
          SET end_date = CURRENT_DATE
        WHERE id = $1 AND doctor_id = $2`,
      [id, doctorId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Prescription not found or you are not the prescribing doctor' });
    }
    return res.json({ message: 'Prescription marked as ended' });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('Error in endPrescription:', err);
    return res.status(500).json({ message: 'Internal server error while ending prescription' });
  }
};

const getPrescriptionsByDoctor = async (req, res) => {
  const userId = req.user.userId;
  try {
    const dr = await db.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    const doctor_id = dr.rows[0]?.id;
    if (!doctor_id) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const result = await db.query(
      `
      SELECT p.id,
             d.name AS drug_name,
             pat.first_name || ' ' || pat.last_name AS patient_name,
             p.dosage,
             p.instructions,
             p.prescribed_at,
             p.end_date
        FROM prescriptions p
        JOIN drugs d    ON p.drug_id    = d.id
        JOIN patients pat ON p.patient_id = pat.id
       WHERE p.doctor_id = $1
    ORDER BY p.prescribed_at DESC
      `,
      [doctor_id]
    );
    return res.json(result.rows);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('Error in getPrescriptionsByDoctor:', err);
    return res.status(500).json({ message: 'Doctor Prescription Fetch Error' });
  }
};

const getPrescriptionsForPatient = async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await db.query(
      `
      SELECT p.id,
             d.name  AS name,
             doc.first_name || ' ' || doc.last_name AS doctor,
             p.dosage,
             p.instructions,
             p.prescribed_at,
             p.end_date
        FROM prescriptions p
        JOIN drugs d    ON p.drug_id    = d.id
        JOIN doctors doc ON p.doctor_id  = doc.id
        JOIN patients pat ON p.patient_id = pat.id
       WHERE pat.user_id = $1
    ORDER BY p.prescribed_at DESC
      `,
      [userId]
    );

    const now = new Date();
    const active = result.rows.filter(p => !p.end_date || new Date(p.end_date) > now);
    const history = result.rows.filter(p => p.end_date && new Date(p.end_date) <= now);
    return res.json({ active, history });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('Error in getPrescriptionsForPatient:', err);
    return res.status(500).json({ message: 'Fetch Prescription Error' });
  }
};

module.exports = {
  addPrescription,
  endPrescription,
  getPrescriptionsByDoctor,
  getPrescriptionsForPatient,
};
