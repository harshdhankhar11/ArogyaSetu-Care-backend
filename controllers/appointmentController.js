const Appointment = require('../models/Appointment')
const User = require('../models/User')

const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const shuffleArray = (list) => {
  const copy = [...list]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = current
  }
  return copy
}

const createAppointment = async (req, res) => {
  try {
    const { Department, date, timeSlot } = req.body
    if (!Department || !date || !timeSlot) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    const normalizedDepartment = Department.trim()
    const departmentPattern = new RegExp(`^${escapeRegExp(normalizedDepartment)}$`, 'i')

    const departmentDoctors = await User.find({
      role: 'doctor',
      department: departmentPattern,
    }).select('_id name')

    let availableDoctors = departmentDoctors

    if (!availableDoctors.length) {
      availableDoctors = await User.find({
        role: 'doctor',
        $or: [
          { department: { $exists: false } },
          { department: '' },
          { department: null },
        ],
      }).select('_id name')
    }

    if (!availableDoctors.length) {
      return res.status(404).json({ message: 'No doctor available for this department' })
    }

    const randomDoctors = shuffleArray(availableDoctors)
    let assignedDoctor = null

    for (const doctor of randomDoctors) {
      const isDoctorBusy = await Appointment.findOne({
        date,
        timeSlot,
        status: { $in: ['pending', 'approved'] },
        $or: [{ doctor: doctor._id }, { doctorName: doctor.name }],
      })

      if (!isDoctorBusy) {
        assignedDoctor = doctor
        break
      }
    }

    if (!assignedDoctor) {
      return res
        .status(400)
        .json({ message: 'No doctor available in this department for selected slot' })
    }

    const appointment = await Appointment.create({
      Department: normalizedDepartment,
      doctorName: assignedDoctor.name,
      patientName: req.user.name,
      patient: req.user._id,
      doctor: assignedDoctor._id,
      date,
      timeSlot,
      status: 'pending',
    })

    return res.status(201).json({
      message: 'Appointment created successfully',
      appointment,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error' })
  }
}

const getAppointments = async (req, res) => {
  try {
    let appointments = []

    if (req.user.role === 'patient') {
      appointments = await Appointment.find({ patient: req.user._id }).sort({ createdAt: -1 })
    }

    if (req.user.role === 'doctor') {
      appointments = await Appointment.find({
        $or: [{ doctor: req.user._id }, { doctorName: req.user.name }],
      }).sort({ createdAt: -1 })
    }

    return res.json({ appointments })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error' })
  }
}

const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' })
    }

    const appointment = await Appointment.findById(req.params.id)
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' })
    }

    const sameDoctorById = appointment.doctor && appointment.doctor.toString() === req.user._id.toString()
    const sameDoctorByName = appointment.doctorName === req.user.name

    if (!sameDoctorById && !sameDoctorByName) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    appointment.status = status
    await appointment.save()

    return res.json({
      message: 'Appointment status updated',
      appointment,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error' })
  }
}

const getDoctorStats = async (req, res) => {
  try {
    const doctorFilter = {
      $or: [{ doctor: req.user._id }, { doctorName: req.user.name }],
    }

    const [total, pending, approved, rejected] = await Promise.all([
      Appointment.countDocuments(doctorFilter),
      Appointment.countDocuments({ ...doctorFilter, status: 'pending' }),
      Appointment.countDocuments({ ...doctorFilter, status: 'approved' }),
      Appointment.countDocuments({ ...doctorFilter, status: 'rejected' }),
    ])

    return res.json({
      stats: {
        total,
        pending,
        approved,
        rejected,
      },
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error' })
  }
}

module.exports = {
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
  getDoctorStats,
}
