-- Migration number: 0002_seed_admin

INSERT INTO users (id, email, password_hash, name, role_id) 
VALUES ('user-admin-1', 'admin@hiccms.com', 'fixedsaltforadmin:f09b324ce00e62fccfcba006f0c7c76a1917dc5287cffef9dcf21584280f64ed', 'Super Admin', 'role-superadmin');
