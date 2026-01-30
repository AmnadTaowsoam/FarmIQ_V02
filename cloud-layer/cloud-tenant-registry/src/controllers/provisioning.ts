import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

// Zero-Touch Provisioning via Claim Code
export const provisionDevice = async (req: Request, res: Response) => {
    try {
        const { serialNo, claimCode, tenantId } = req.body

        // Factory secret from environment variable
        const FACTORY_SECRET = process.env.DEVICE_FACTORY_SECRET;

        if (!FACTORY_SECRET) {
            console.error('DEVICE_FACTORY_SECRET not configured');
            return res.status(500).json({ error: { code: 'CONFIG_ERROR' } });
        }

        // Verify claim code against factory secret
        if (claimCode !== FACTORY_SECRET) {
            return res.status(401).json({ error: { code: 'INVALID_CLAIM_CODE' } });
        }

        const device = await prisma.device.upsert({
            where: {
                tenantId_serialNo: {
                    tenantId,
                    serialNo
                }
            },
            update: {
                lifecycleState: 'PROVISIONED',
                lastHello: new Date()
            },
            create: {
                tenantId,
                serialNo,
                deviceType: 'gateway',
                lifecycleState: 'PROVISIONED',
                lastHello: new Date(),
                metadata: { provisioningMethod: 'ZTP' }
            }
        })

        // Generate certificates (mock)
        const deviceCert = `-----BEGIN CERTIFICATE-----\nMOCK_CERT_FOR_${device.id}\n-----END CERTIFICATE-----`

        res.json({
            status: 'success',
            deviceId: device.id,
            certificate: deviceCert,
            mqttEndpoint: 'mqtts://edge.farmiq.io:8883'
        })
    } catch (error) {
        console.error('Provisioning error', error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
}

// Device Decommissioning
export const decommissionDevice = async (req: Request, res: Response) => {
    try {
        const { deviceId } = req.params
        const { tenantId } = req.body // Should come from Auth middleware

        const device = await prisma.device.update({
            where: { id: deviceId },
            data: {
                lifecycleState: 'DECOMMISSIONED',
                status: 'inactive'
            }
        })

        // Revoke certificates (Mock)
        console.log(`Revoking certs for device ${deviceId}`)

        res.json({ status: 'decommissioned', deviceId: device.id })
    } catch (error) {
        res.status(500).json({ error: 'Decommissioning failed' })
    }
}
