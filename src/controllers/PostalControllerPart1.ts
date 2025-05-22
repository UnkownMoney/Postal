import { IShipment, IShippingMethod, ILabel, IAddress } from '../interfaces/Postal';
import pool from '../db/postgres';

export class PostalController {
    async calculateCost(shippingMethod: IShippingMethod, weight: number): Promise<number> {
        let baseCost = 5;
        if (shippingMethod.expedited) {
            baseCost += 10;
        }
        return baseCost + weight * 2;
    }
}
