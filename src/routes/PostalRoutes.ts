import express, { Request, Response, NextFunction } from 'express';
import postalController from '../controllers/PostalControllerSingleton';

const router = express.Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
    return function(req: Request, res: Response, next: NextFunction) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

router.post('/shipment', asyncHandler(async (req: Request, res: Response) => {
    const { weight, shippingMethod, from, to } = req.body;
    if (!weight || !shippingMethod) {
        return res.status(400).json({ success: false, message: 'Weight and shippingMethod are required' });
    }
    if (!from || !to) {
        return res.status(400).json({ success: false, message: 'From and To addresses are required' });
    }
    // Basic validation for address fields
    const requiredAddressFields = ['name', 'street', 'city', 'state', 'zip', 'country'];
    for (const field of requiredAddressFields) {
        if (!from[field] || !to[field]) {
            return res.status(400).json({ success: false, message: `Both From and To addresses must include ${field}` });
        }
    }
    const shipment = postalController.createShipment(weight, shippingMethod, from, to);
    res.json({ success: true, shipment });
}));

router.post('/shipment/:id/status', asyncHandler(async (req: Request, res: Response) => {
    const shipmentId = parseInt(req.params.id);
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required' });
    }
    const updated = postalController.updateStatus(shipmentId, status);
    if (updated) {
        res.json({ success: true, message: 'Status updated' });
    } else {
        res.status(404).json({ success: false, message: 'Shipment not found' });
    }
}));

router.get('/shipment/:id', asyncHandler(async (req: Request, res: Response) => {
    const shipmentId = parseInt(req.params.id);
    const shipment = postalController.getShipmentById(shipmentId);
    if (shipment) {
        res.json({ success: true, shipment });
    } else {
        res.status(404).json({ success: false, message: 'Shipment not found' });
    }
}));

router.get('/shipment/search', asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.query as string;
    if (!query) {
        return res.status(400).json({ success: false, message: 'Query parameter is required' });
    }
    const results = postalController.searchShipments(query);
    res.json({ success: true, results });
}));

export default router;
