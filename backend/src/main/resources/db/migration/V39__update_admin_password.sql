-- Update admin password to admin123
UPDATE users 
SET password_hash = '$2a$10$g3DbqptWYXY2DsM/HgRZlOsrixw15p7JsXOjOG6RRTwt8nWpQfJ5e',
    assigned_password = 'admin123'
WHERE username = 'admin';
