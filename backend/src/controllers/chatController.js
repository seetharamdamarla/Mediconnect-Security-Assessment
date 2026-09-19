const db = require('../db');
const {
  InternalServerError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  AppError,
} = require('../utils/errors');

const generateRoomId = (a, b) => {
  const [x, y] = [Number(a), Number(b)].sort((u, v) => u - v);
  return `${x}-${y}`;
};

async function getDoctorsForPatient(req, res) {
  try {
    const result = await db.query(`
      SELECT 
        d.id        AS doctor_id,
        u.id        AS user_id,
        d.first_name, d.last_name,
        d.specialization, d.address
      FROM doctors d
      JOIN users u ON d.user_id = u.id
    `);
    res.json(result.rows);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new InternalServerError('Server error upon fetching doctors');
  }
}

async function getChattedDoctorUserIds(req, res) {
  const patientUserId = req.user.userId;
  try {
    const result = await db.query(
      `
      SELECT DISTINCT receiver_id AS doctor_user_id
      FROM chat_messages
      WHERE sender_id = $1 AND sender_role = 'patient'
    `,
      [patientUserId]
    );
    res.json(result.rows.map(r => r.doctor_user_id));
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new InternalServerError();
  }
}

async function getPatientsForDoctor(req, res) {
  const doctorUserId = req.user.userId;

  try {
    const d = await db.query(`SELECT id AS doctor_id FROM doctors WHERE user_id = $1`, [
      doctorUserId,
    ]);
    if (!d.rows.length) {
      throw new NotFoundError('Doctor not found');
    }
    const doctorId = d.rows[0].doctor_id;

    const result = await db.query(
      `
      SELECT DISTINCT
        p.id AS patient_id,
        p.user_id AS user_id,
        p.first_name || ' ' || p.last_name AS patient_name
      FROM patients p
      JOIN users u ON u.id = p.user_id
      ORDER BY patient_name;
      `
    );

    res.json(result.rows);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new InternalServerError();
  }
}

async function getChattedPatientUserIds(req, res) {
  const doctorUserId = req.user.userId;
  try {
    const result = await db.query(
      `
      SELECT DISTINCT
        CASE WHEN sender_role='doctor' THEN receiver_id
             ELSE sender_id
        END AS patient_user_id
      FROM chat_messages
      WHERE sender_id = $1 OR receiver_id = $1
    `,
      [doctorUserId]
    );
    res.json(result.rows.map(r => r.patient_user_id));
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new InternalServerError();
  }
}

async function getChatMessages(req, res) {
  const { roomId } = req.params;
  const userId = req.user.userId;

  // Verify the requesting user is a participant in this room
  // Room ID format is "smallerId-largerId"
  const parts = roomId.split('-');
  if (parts.length !== 2) {
    return res.status(400).json({ message: 'Invalid room ID format' });
  }
  const [idA, idB] = parts.map(Number);
  if (userId !== idA && userId !== idB) {
    return res.status(403).json({ message: 'Access denied: you are not a participant in this chat' });
  }

  try {
    const result = await db.query(
      `SELECT sender_id, receiver_id, sender_role, message, timestamp
       FROM chat_messages
       WHERE room_id = $1
       ORDER BY timestamp ASC`,
      [roomId]
    );
    res.json(result.rows);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new InternalServerError();
  }
}

async function getUnreadMessages(req, res) {
  const userId = req.user.userId;

  try {
    const result = await db.query(
      `SELECT room_id, COUNT(*) AS unread_count
       FROM chat_messages
       WHERE receiver_id = $1 AND is_read = false
       GROUP BY room_id`,
      [userId]
    );
    const map = {};
    result.rows.forEach(r => (map[r.room_id] = Number(r.unread_count)));
    res.json(map);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new InternalServerError();
  }
}

module.exports = {
  getDoctorsForPatient,
  getChattedDoctorUserIds,
  getPatientsForDoctor,
  getChattedPatientUserIds,
  getChatMessages,
  getUnreadMessages,
  generateRoomId,
};
