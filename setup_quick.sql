-- ========================================================
-- CANAL+ RWANDA: QUICK D1 DATABASE SETUP
-- Paste this directly into the Cloudflare D1 "Console" tab
-- or run: npx wrangler d1 execute canal-calling-db --remote --file=./setup_quick.sql
-- ========================================================

-- 1. Contacts Table
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
    display_status TEXT DEFAULT 'unseen',  -- 'unseen' -> 'assigned' -> 'displayed' -> 'called'
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

-- 2. Users Table
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

-- 3. Admin & Agent Credentials
INSERT INTO users (username, name, pin, role, shift_status, daily_target) VALUES 
('everhomedreamltd@gmail.com', 'Admin Everhome', 'fau@123', 'admin', 'online', 100),
('agent1', 'Agent 1', 'caddet@123', 'agent', 'offline', 30);

-- 4. Initial High-Priority Tier 1 Leads
INSERT INTO contacts (sub_id, name, phone, formatted_phone, display_phone, offer, renewal_count, days_lapsed, city, tier, reconnection_score, crm_status, account_owner, display_status) VALUES
('A-S00009263', 'Hilaire Tshiminyi Tshionsu', '733947358', '+250733947358', '0733 947 358', 'Start', 40, 35, 'Rubavu', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Didier Abayisenga', 'unseen'),
('A-S00006886', 'Riziki Francine', '788458946', '+250788458946', '0788 458 946', 'Start', 39, 38, 'Rubavu', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Emmy Mucyo', 'unseen'),
('M-S22750567001', 'CYUBAHIRO FIAT', '788350441', '+250788350441', '0788 350 441', 'Start', 31, 34, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Jordan Jonathan Jabo', 'unseen'),
('A-S00049940', 'Muhammad Nawaz', '784449592', '+250784449592', '0784 449 592', 'Start', 32, 33, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Emmanuel Mutashya', 'unseen'),
('M-S22438486001', 'RUTAGENGWA DIANE', '788846964', '+250788846964', '0788 846 964', 'Start', 51, 37, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Armand Gasasira', 'unseen'),
('M-S22689453001', 'BIZUMUREMYI FABRICE', '788615595', '+250788615595', '0788 615 595', 'Start', 41, 35, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Basile Mutsinzi', 'unseen'),
('M-S22004725001', 'WAGTCH PROJECTS RWANDA LTD UMUTONI AGATHE', '788657576', '+250788657576', '0788 657 576', 'Start', 59, 35, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Esperance Umutesi', 'unseen'),
('M-S20047176001', 'MUKAMA JOSEPH', '788382608', '+250788382608', '0788 382 608', 'Start', 65, 40, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'KWIZERA Christian', 'unseen'),
('M-S20236631001', 'ANNETTE GAKWERERE', '788313879', '+250788313879', '0788 313 879', 'Start', 63, 31, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'MARIUS RUKUNDO', 'unseen'),
('M-S20175460002', 'IRIBORI SCOVIA', '788478824', '+250788478824', '0788 478 824', 'Start', 66, 33, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Better UMUTONI', 'unseen'),
('M-S20780218001', 'GASHURURU SIMBA RICHARD', '788556595', '+250788556595', '0788 556 595', 'Start', 45, 34, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Cesar Nganji 01 Invalid', 'unseen'),
('A-S00043109', 'manirabarusha Francine', '788547261', '+250788547261', '0788 547 261', 'Start', 36, 31, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Musafiri David', 'unseen'),
('A-S00066847', 'Karehe J damascenne', '788414678', '+250788414678', '0788 414 678', 'Start', 36, 31, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Yves Izabayo', 'unseen'),
('M-S25196928001', 'UWITONZE PHILBERT', '788837553', '+250788837553', '0788 837 553', 'Start', 48, 33, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Bertin Batete', 'unseen'),
('M-S23443197001', 'JOYEUSE MUSANGO', '787678993', '+250787678993', '0787 678 993', 'Start', 36, 42, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Jordan Jonathan Jabo', 'unseen'),
('A-S00121239', '63 INC LTD', '788723420', '+250788723420', '0788 723 420', 'Premium', 32, 36, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Chris Ngabonziza', 'unseen'),
('A-S00080133', 'Line IGIRANEZA', '787147224', '+250787147224', '0787 147 224', 'Start', 36, 40, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Antoine MUTORA', 'unseen'),
('A-S00049211', 'NDAYIRUKIYE Fidel', '788903974', '+250788903974', '0788 903 974', 'Start', 33, 31, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Boniface Bavumiragira', 'unseen'),
('M-S22524278001', 'BYIRIGIRO EMMANUEL', '786188697', '+250786188697', '0786 188 697', 'Start', 42, 34, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'PAUL NDABARASA', 'unseen'),
('M-S26412350001', 'ZUBA YVONNE', '785746793', '+250785746793', '0785 746 793', 'Start', 37, 39, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Alex Musoni', 'unseen'),
('A-S00005384', 'Dusenge Davide', '785570647', '+250785570647', '0785 570 647', 'Start', 34, 38, 'Rubavu', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Robert Nzabonimpa', 'unseen'),
('A-S00005924', 'GATERA ARIEL', '781952963', '+250781952963', '0781 952 963', 'Start', 48, 39, 'Rubavu', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Olivier Twizere', 'unseen'),
('A-S00042146', 'Irasubiza Elie Laurent', '791711288', '+250791711288', '0791 711 288', 'Start', 32, 40, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'ASSOUMAN SHINGIRO', 'unseen'),
('M-S20047981001', 'IRAKOZE PIERRE CLAVER', '788350857', '+250788350857', '0788 350 857', 'Start', 57, 36, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Armand Gasasira', 'unseen'),
('M-S21789344002', 'MUGWIZA AIMABLE', '788502954', '+250788502954', '0788 502 954', 'Start', 38, 38, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Better UMUTONI', 'unseen'),
('A-S00134136', 'Ingabire grace', '784383800', '+250784383800', '0784 383 800', 'Start', 30, 42, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Armand Gasasira', 'unseen'),
('M-S23125502001', 'AFRICA APOLLO', '788879615', '+250788879615', '0788 879 615', 'Start', 42, 34, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Jackeline Abera', 'unseen'),
('M-S23148132002', 'MUCYO HURBERT 2', '783706795', '+250783706795', '0783 706 795', 'Start', 43, 35, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Deyoumpta Imfurayase', 'unseen'),
('M-S21017356001', 'NDAYISABA ALBERT', '788307453', '+250788307453', '0788 307 453', 'Start', 64, 37, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'Jackeline Abera', 'unseen'),
('A-S00048923', 'Mukamwiza Bethrlde', '785573704', '+250785573704', '0785 573 704', 'Start', 36, 35, 'Kigali', 'Tier 1: High Priority (Call First)', 0.997, 'Suspended', 'ASSOUMAN SHINGIRO', 'unseen');
