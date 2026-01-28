import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { PrismaClient } from '@prisma/client'

const app = express()
const port = process.env.APP_PORT || 3000
const prisma = new PrismaClient()

app.use(express.json())
app.use(helmet())
app.use(cors())

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).send('OK')
})

app.get('/api/ready', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`
        res.status(200).send('READY')
    } catch (err) {
        res.status(503).send('NOT READY')
    }
})

// Setup routes
import { setupRoutes } from './routes'
setupRoutes(app)

const startServer = async () => {
    try {
        await prisma.$connect()
        console.log('Database connected')
        app.listen(port, () => {
            console.log(`cloud-fleet-management running on ${port}`)
        })
    } catch (err) {
        console.error('Failed to start server', err)
        process.exit(1)
    }
}

startServer()
