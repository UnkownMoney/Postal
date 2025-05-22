-- Shipments table
CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    cost NUMERIC(10, 2) NOT NULL,
    weight NUMERIC(10, 2) NOT NULL,
    shipping_method JSONB NOT NULL,
    from_address_id INTEGER NOT NULL,
    to_address_id INTEGER NOT NULL
);

-- Addresses table
CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    street VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL
);

-- Labels table
CREATE TABLE IF NOT EXISTS labels (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    from_address_id INTEGER NOT NULL,
    to_address_id INTEGER NOT NULL,
    shipment_id INTEGER NOT NULL,
    FOREIGN KEY (from_address_id) REFERENCES addresses(id),
    FOREIGN KEY (to_address_id) REFERENCES addresses(id),
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
);
