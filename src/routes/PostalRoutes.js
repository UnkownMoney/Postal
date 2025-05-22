"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const PostalController_1 = require("../controllers/PostalController");
const router = express_1.default.Router();
const postalController = new PostalController_1.PostalController();
router.post('/shipment', (req, res) => {
    const { weight, shippingMethod } = req.body;
    if (!weight || !shippingMethod) {
        return res.status(400).json({ success: false, message: 'Weight and shippingMethod are required' });
    }
    const shipment = postalController.createShipment(weight, shippingMethod);
    res.json({ success: true, shipment });
});
router.post('/shipment/:id/status', (req, res) => {
    const shipmentId = parseInt(req.params.id);
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required' });
    }
    const updated = postalController.updateStatus(shipmentId, status);
    if (updated) {
        res.json({ success: true, message: 'Status updated' });
    }
    else {
        res.status(404).json({ success: false, message: 'Shipment not found' });
    }
});
exports.default = router;
