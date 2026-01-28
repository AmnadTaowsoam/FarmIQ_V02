import { Express } from 'express'
import { listFirmwares, createFirmware } from './controllers/firmwareController'
import { listCampaigns, createCampaign, pauseCampaign } from './controllers/campaignController'

export const setupRoutes = (app: Express) => {
    app.get('/api/firmwares', listFirmwares)
    app.post('/api/firmwares', createFirmware)

    app.get('/api/campaigns', listCampaigns)
    app.post('/api/campaigns', createCampaign)
    app.post('/api/campaigns/:id/pause', pauseCampaign)
}
