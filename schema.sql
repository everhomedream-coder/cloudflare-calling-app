-- Cloudflare D1 Database Schema for Canal+ Rwanda Calling App
-- Table: contacts

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
    display_status TEXT DEFAULT 'unseen',  -- 'unseen' -> 'displayed' -> 'called'
    displayed_at TIMESTAMP,
    outcome TEXT,
    notes TEXT,
    called_at TIMESTAMP
);

CREATE INDEX idx_contacts_status ON contacts(display_status);
CREATE INDEX idx_contacts_score ON contacts(reconnection_score);
CREATE INDEX idx_contacts_phone ON contacts(phone);

