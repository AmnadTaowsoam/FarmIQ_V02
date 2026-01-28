import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export const listCampaigns = async (req: Request, res: Response) => {
    try {
        const campaigns = await prisma.campaign.findMany({
            include: { firmware: true },
            orderBy: { createdAt: 'desc' }
        })
        res.json(campaigns)
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' })
    }
}

export const createCampaign = async (req: Request, res: Response) => {
    try {
        const { name, targetVersion, type, targetGroup, errorThreshold } = req.body
        const campaign = await prisma.campaign.create({
            data: {
                name,
                targetVersion,
                type,
                targetGroup,
                errorThreshold
            }
        })
        res.status(201).json(campaign)
    } catch (error) {
        res.status(500).json({ error: 'Failed to create campaign' })
    }
}

export const pauseCampaign = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const campaign = await prisma.campaign.update({
            where: { id },
            data: { status: 'PAUSED' }
        })
        res.json(campaign)
    } catch (error) {
        res.status(500).json({ error: 'Failed to pause campaign' })
    }
}
