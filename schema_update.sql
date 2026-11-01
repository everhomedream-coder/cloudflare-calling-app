-- ========================================================
-- CANAL+ RWANDA: SCHEMA MIGRATION / UPGRADE SCRIPT
-- Run this if you already have an existing D1 database and 
-- want to add the new columns without losing existing records.
-- ========================================================

-- Contacts table upgrades
ALTER TABLE contacts ADD COLUMN assigned_to TEXT;
ALTER TABLE contacts ADD COLUMN callback_at TIMESTAMP;
ALTER TABLE contacts ADD COLUMN call_duration INTEGER DEFAULT 0;

-- Users table upgrades
ALTER TABLE users ADD COLUMN shift_status TEXT DEFAULT 'offline';
ALTER TABLE users ADD COLUMN daily_target INTEGER DEFAULT 30;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_callback ON contacts(callback_at);
CREATE INDEX IF NOT EXISTS idx_contacts_city ON contacts(city);
