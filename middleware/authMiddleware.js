const jwt = require('jsonwebtoken')
const User = require('../models/User')

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    let decoded

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const user = await User.findById(decoded.id).select('-password')
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    req.user = user
    return next()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error' })
  }
}

const allowRoles = (...roles) => (req, res, next) => {
  try {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    return next()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error' })
  }
}

module.exports = { protect, allowRoles }
