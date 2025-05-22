import { IShipment, IShippingMethod, ILabel, IAddress } from '../interfaces/Postal';

export class PostalController {
    private shipments: IShipment[] = [];
    private nextShipmentId: number = 1;
    private nextLabelId: number = 1;

    calculateCost(shippingMethod: IShippingMethod, weight: number): number {
        let baseCost = 5;
        if (shippingMethod.expedited) {
            baseCost += 10;
        }
        return baseCost + weight * 2;
    }

    printLabel(content: string, from: IAddress, to: IAddress): ILabel {
        const label: ILabel = {
            id: this.nextLabelId++,
            content,
            from,
            to,
        };
        return label;
    }

    createShipment(weight: number, shippingMethod: IShippingMethod, from: IAddress, to: IAddress): IShipment {
        const cost = this.calculateCost(shippingMethod, weight);
        const labelContent = `Package from ${from.name} to ${to.name}`;
        const label = this.printLabel(labelContent, from, to);
        const shipment: IShipment = {
            id: this.nextShipmentId++,
            status: 'Created',
            shippingMethod,
            cost,
            from,
            to,
            label,
        };
        this.shipments.push(shipment);
        return shipment;
    }

    updateStatus(shipmentId: number, status: string): boolean {
        const shipment = this.shipments.find(s => s.id === shipmentId);
        if (shipment) {
            shipment.status = status;
            return true;
        }
        return false;
    }

    getShipmentById(shipmentId: number): IShipment | undefined {
        return this.shipments.find(s => s.id === shipmentId);
    }

    searchShipments(query: string): IShipment[] {
        const lowerQuery = query.toLowerCase();
        return this.shipments.filter(s =>
            s.from.name.toLowerCase().includes(lowerQuery) ||
            s.to.name.toLowerCase().includes(lowerQuery)
        );
    }
}
