-- Update Users with Real Credentials
DELETE FROM users;

INSERT INTO users (username, name, pin, role) VALUES 
('everhomedreamltd@gmail.com', 'Administrator', 'fau@123', 'admin'),
('agent1', 'Agent 1', 'caddet@123', 'agent');

