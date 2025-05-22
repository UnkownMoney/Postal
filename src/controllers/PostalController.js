"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostalController = void 0;
class PostalController {
    constructor() {
        this.shipments = [];
        this.nextShipmentId = 1;
        this.nextLabelId = 1;
    }
    calculateCost(shippingMethod, weight) {
        let baseCost = 5;
        if (shippingMethod.expedited) {
            baseCost += 10;
        }
        return baseCost + weight * 2;
    }
    printLabel(content) {
        const label = {
            id: this.nextLabelId++,
            content,
        };
        return label;
    }
    createShipment(weight, shippingMethod) {
        const cost = this.calculateCost(shippingMethod, weight);
        const shipment = {
            id: this.nextShipmentId++,
            status: 'Created',
            shippingMethod,
            cost,
        };
        this.shipments.push(shipment);
        return shipment;
    }
    updateStatus(shipmentId, status) {
        const shipment = this.shipments.find(s => s.id === shipmentId);
        if (shipment) {
            shipment.status = status;
            return true;
        }
        return false;
    }
}
exports.PostalController = PostalController;
