-- Create user for Postgres
CREATE USER postal_user WITH PASSWORD 'vancepass';

-- Create database
CREATE DATABASE postal_service OWNER postal_user;

-- Connect to postal_service database
\c postal_service;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE postal_service TO postal_user;

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    street VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL
);

-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    cost NUMERIC(10, 2) NOT NULL,
    weight NUMERIC(10, 2) NOT NULL,
    shipping_method JSONB NOT NULL,
    from_address_id INTEGER NOT NULL REFERENCES addresses(id),
    to_address_id INTEGER NOT NULL REFERENCES addresses(id)
);

-- Create labels table
CREATE TABLE IF NOT EXISTS labels (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    from_address_id INTEGER NOT NULL REFERENCES addresses(id),
    to_address_id INTEGER NOT NULL REFERENCES addresses(id),
    shipment_id INTEGER NOT NULL REFERENCES shipments(id)
);
