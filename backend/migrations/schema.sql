-- ============================================
-- DentalGate II - PostgreSQL Schema
-- ============================================

-- Drop existing tables (for clean migration)
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;
DROP TABLE IF EXISTS sectors CASCADE;
DROP TABLE IF EXISTS networks CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- AUTHENTICATION & AUTHORIZATION
-- ============================================

-- Users table (replaces Firebase Auth)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'User',
    allowed_pages TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'Inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

-- Roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) UNIQUE NOT NULL
);

-- Pages table
CREATE TABLE pages (
    id SERIAL PRIMARY KEY,
    page VARCHAR(50) UNIQUE NOT NULL
);

-- Sessions table (for refresh tokens)
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- ============================================
-- ORGANIZATION STRUCTURE
-- ============================================

-- Networks table
CREATE TABLE networks (
    id SERIAL PRIMARY KEY,
    network_id VARCHAR(50) UNIQUE,
    network VARCHAR(100) NOT NULL
);

-- Facilities table
CREATE TABLE facilities (
    id SERIAL PRIMARY KEY,
    moh_id VARCHAR(50) UNIQUE NOT NULL,
    facility_name_ar VARCHAR(255),
    facility_name_en VARCHAR(255),
    email VARCHAR(255),
    network VARCHAR(100),
    sectors TEXT[]
);

-- Sectors table
CREATE TABLE sectors (
    id SERIAL PRIMARY KEY,
    sector VARCHAR(100) NOT NULL
);

-- Profiles table
CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50),
    national_id VARCHAR(50),
    scfhs_id VARCHAR(50),
    dob DATE,
    gender VARCHAR(10),
    job_title VARCHAR(100),
    specialty VARCHAR(100),
    network_id INTEGER REFERENCES networks(id),
    supervisor_id INTEGER REFERENCES users(id),
    fullname_ar VARCHAR(255),
    fullname_en VARCHAR(255),
    facility_id VARCHAR(50) REFERENCES facilities(moh_id),
    phone VARCHAR(20),
    address TEXT,
    comments TEXT
);

-- ============================================
-- INVENTORY & DEVICES
-- ============================================

-- Devices table
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(255) NOT NULL
);

-- Suppliers table
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    supplier_id VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    email2 VARCHAR(255),
    email3 VARCHAR(255)
);

-- Warehouses table
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    warehouse VARCHAR(255) NOT NULL,
    network_id INTEGER REFERENCES networks(id),
    facility_id VARCHAR(50) REFERENCES facilities(moh_id),
    supervisor_id INTEGER REFERENCES users(id),
    location VARCHAR(255)
);

-- ============================================
-- BUSINESS LOGIC
-- ============================================

-- Orders table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES warehouses(id),
    release_number VARCHAR(100),
    order_date DATE,
    supplier_id INTEGER REFERENCES suppliers(id),
    status VARCHAR(50) DEFAULT 'Waiting Supplier',
    delivered_date DATE,
    waiting_days INTEGER,
    comments TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attachments TEXT[]
);

-- Issues table
CREATE TABLE issues (
    issue_id SERIAL PRIMARY KEY,
    device INTEGER REFERENCES devices(id),
    malfunctioned_date DATE,
    malfunction_description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Disorder',
    waiting_days INTEGER,
    comments TEXT,
    solved_by INTEGER REFERENCES users(id),
    solved_at TIMESTAMP
);

-- Comments table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    reference_table VARCHAR(50) NOT NULL,
    reference_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_employee_id ON profiles(employee_id);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_issues_created_by ON issues(created_by);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_created_at ON issues(created_at);
CREATE INDEX idx_comments_reference ON comments(reference_table, reference_id);
CREATE INDEX idx_comments_created_by ON comments(created_by);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate waiting_days for orders
CREATE OR REPLACE FUNCTION calculate_order_waiting_days()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Delivered' AND NEW.delivered_date IS NOT NULL AND NEW.order_date IS NOT NULL THEN
        NEW.waiting_days = NEW.delivered_date - NEW.order_date;
    ELSIF NEW.status = 'Waiting Supplier' AND NEW.order_date IS NOT NULL THEN
        NEW.waiting_days = CURRENT_DATE - NEW.order_date;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_order_waiting_days 
    BEFORE INSERT OR UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION calculate_order_waiting_days();

-- Auto-calculate waiting_days for issues
CREATE OR REPLACE FUNCTION calculate_issue_waiting_days()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Solved' AND NEW.solved_at IS NOT NULL AND NEW.created_at IS NOT NULL THEN
        NEW.waiting_days = EXTRACT(DAY FROM (NEW.solved_at - NEW.created_at))::INTEGER;
    ELSIF NEW.status = 'Disorder' AND NEW.created_at IS NOT NULL THEN
        NEW.waiting_days = EXTRACT(DAY FROM (CURRENT_TIMESTAMP - NEW.created_at))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_issue_waiting_days 
    BEFORE INSERT OR UPDATE ON issues 
    FOR EACH ROW 
    EXECUTE FUNCTION calculate_issue_waiting_days();

-- Auto-set solved_by and solved_at when status changes to Solved
CREATE OR REPLACE FUNCTION auto_set_solved_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Solved' AND OLD.status != 'Solved' THEN
        NEW.solved_at = CURRENT_TIMESTAMP;
        -- Note: solved_by should be set by the application
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_set_issue_solved 
    BEFORE UPDATE ON issues 
    FOR EACH ROW 
    EXECUTE FUNCTION auto_set_solved_fields();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default roles
INSERT INTO roles (role) VALUES 
    ('Admin'),
    ('User'),
    ('Manager')
ON CONFLICT (role) DO NOTHING;

-- Insert default pages
INSERT INTO pages (page) VALUES 
    ('Profile'),
    ('Issues'),
    ('Orders'),
    ('Devices'),
    ('Facilities'),
    ('Networks'),
    ('Suppliers'),
    ('Warehouse'),
    ('Sectors'),
    ('Profiles'),
    ('Roles'),
    ('Users')
ON CONFLICT (page) DO NOTHING;

-- Create default admin user (password: admin123)
-- Generated with bcrypt: $2b$10$...
INSERT INTO users (email, username, password_hash, role, allowed_pages, status) VALUES 
    ('admin@dentalgate.com', 'admin', '$2b$10$YourHashHere', 'Admin', ARRAY['Profile', 'Issues', 'Orders', 'Devices', 'Facilities', 'Networks', 'Suppliers', 'Warehouse', 'Sectors', 'Profiles', 'Roles', 'Users'], 'Active')
ON CONFLICT (email) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✓ Schema created successfully!';
    RAISE NOTICE '✓ Default roles and pages inserted';
    RAISE NOTICE '✓ Run migration script to import existing data';
END $$;

