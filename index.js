const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const connectDB = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const appointmentRoutes = require('./routes/appointmentRoutes')

dotenv.config()
connectDB()

const app = express()

app.use(
  cors({
    origin: 'https://arogyasetu-frontend.vercel.app',
  })
)
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'ArogyaSetu Care API is running' })
})

app.use('/api/auth', authRoutes)
app.use('/api/appointments', appointmentRoutes)

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Server error' })
})

const PORT = process.env.PORT || 5000
try {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
} catch (error) {
  console.error(error)
}
