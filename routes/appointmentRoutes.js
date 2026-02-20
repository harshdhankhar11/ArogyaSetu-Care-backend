const express = require('express')
const {
  createAppointment,
  getAppointments,
  getDoctorStats,
  updateAppointmentStatus,
} = require('../controllers/appointmentController')
const { protect, allowRoles } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/', protect, allowRoles('patient'), createAppointment)
router.get('/', protect, getAppointments)
router.get('/stats/doctor', protect, allowRoles('doctor'), getDoctorStats)
router.put('/:id', protect, allowRoles('doctor'), updateAppointmentStatus)

module.exports = router
