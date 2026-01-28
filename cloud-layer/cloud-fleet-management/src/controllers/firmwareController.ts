import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export const listFirmwares = async (req: Request, res: Response) => {
    try {
        const firmwares = await prisma.firmware.findMany({
            orderBy: { createdAt: 'desc' },
        })
        res.json(firmwares)
    } catch (error) {
        logger.error('Error listing firmwares', error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
}

export const createFirmware = async (req: Request, res: Response) => {
    try {
        const { version, s3Key, checksum, isCritical, releaseNote } = req.body
        const firmware = await prisma.firmware.create({
            data: {
                version,
                s3Key,
                checksum,
                isCritical,
                releaseNote,
            },
        })
        res.status(201).json(firmware)
    } catch (error) {
        logger.error('Error creating firmware', error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
}
