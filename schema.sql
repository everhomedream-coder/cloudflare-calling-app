-- Cloudflare D1 Database Schema for Canal+ Rwanda Calling App

DROP TABLE IF EXISTS contacts;

CREATE TABLE contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sub_id TEXT,
    name TEXT,
    phone TEXT,
    formatted_phone TEXT,
    display_phone TEXT,
    offer TEXT,
    renewal_count INTEGER,
    days_lapsed INTEGER,
    city TEXT,
    tier TEXT,
    reconnection_score REAL,
    crm_status TEXT,
    account_owner TEXT,
    assigned_to TEXT,
    display_status TEXT DEFAULT 'unseen',
    displayed_at TIMESTAMP,
    outcome TEXT,
    notes TEXT,
    called_at TIMESTAMP,
    callback_at TIMESTAMP,
    call_duration INTEGER DEFAULT 0
);

CREATE INDEX idx_contacts_status ON contacts(display_status);
CREATE INDEX idx_contacts_assigned ON contacts(assigned_to);
CREATE INDEX idx_contacts_score ON contacts(reconnection_score);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_callback ON contacts(callback_at);
CREATE INDEX idx_contacts_city ON contacts(city);

DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    pin TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agent',
    shift_status TEXT DEFAULT 'offline',
    daily_target INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, name, pin, role, daily_target) VALUES
('everhomedreamltd@gmail.com', 'Admin Everhome', 'fau@123', 'admin', 100),
('agent1', 'Agent 1', 'caddet@123', 'agent', 30);
