import { ILabel, IAddress, IShippingMethod, IShipment } from '../interfaces/Postal';
import pool from '../db/postgres';

export class PostalController {
    async printLabel(content: string, from: IAddress, to: IAddress): Promise<ILabel> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const fromRes = await client.query(
                `INSERT INTO addresses (name, street, city, state, zip, country) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [from.name, from.street, from.city, from.state, from.zip, from.country]
            );
            const toRes = await client.query(
                `INSERT INTO addresses (name, street, city, state, zip, country) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [to.name, to.street, to.city, to.state, to.zip, to.country]
            );
            const fromId = fromRes.rows[0].id;
            const toId = toRes.rows[0].id;

            const labelRes = await client.query(
                `INSERT INTO labels (content, from_address_id, to_address_id, shipment_id) VALUES ($1, $2, $3, NULL) RETURNING id`,
                [content, fromId, toId]
            );
            const labelId = labelRes.rows[0].id;

            await client.query('COMMIT');

            const label: ILabel = {
                id: labelId,
                content,
                from,
                to,
            };
            return label;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async createShipment(weight: number, shippingMethod: IShippingMethod, from: IAddress, to: IAddress): Promise<IShipment> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const cost = await this.calculateCost(shippingMethod, weight);

            // Insert addresses
            const fromRes = await client.query(
                `INSERT INTO addresses (name, street, city, state, zip, country) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [from.name, from.street, from.city, from.state, from.zip, from.country]
            );
            const toRes = await client.query(
                `INSERT INTO addresses (name, street, city, state, zip, country) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [to.name, to.street, to.city, to.state, to.zip, to.country]
            );
            const fromId = fromRes.rows[0].id;
            const toId = toRes.rows[0].id;

            // Insert shipment
            const shipmentRes = await client.query(
                `INSERT INTO shipments (status, cost, weight, shipping_method, from_address_id, to_address_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                ['Created', cost, weight, shippingMethod, fromId, toId]
            );
            const shipmentId = shipmentRes.rows[0].id;

            // Insert label
            const labelContent = `Package from ${from.name} to ${to.name}`;
            const labelRes = await client.query(
                `INSERT INTO labels (content, from_address_id, to_address_id, shipment_id) VALUES ($1, $2, $3, $4) RETURNING id`,
                [labelContent, fromId, toId, shipmentId]
            );
            const labelId = labelRes.rows[0].id;

            await client.query('COMMIT');

            const label: ILabel = {
                id: labelId,
                content: labelContent,
                from,
                to,
            };

            const shipment: IShipment = {
                id: shipmentId,
                status: 'Created',
                shippingMethod,
                cost,
                from,
                to,
                label,
            };

            return shipment;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}
