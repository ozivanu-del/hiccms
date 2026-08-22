-- Migration number: 0022_disable_known_admin_credential
--
-- Do not edit migration 0002: it may already be recorded by deployed databases.
-- Disable only an account that still uses the publicly known bootstrap hash. Accounts
-- whose password has already been changed are deliberately left untouched.

UPDATE users
SET password_hash = 'disabled-bootstrap-credential:0000000000000000000000000000000000000000000000000000000000000000',
    must_change_password = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'user-admin-1'
  AND password_hash = 'fixedsaltforadmin:f09b324ce00e62fccfcba006f0c7c76a1917dc5287cffef9dcf21584280f64ed';
