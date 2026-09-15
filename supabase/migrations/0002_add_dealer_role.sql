-- =========================================================================
-- Add the 'dealer' role, ahead of the dealer self-service order portal.
--
-- IMPORTANT: run this file ALONE, as its own SQL Editor execution, and let
-- it finish before running 0003_dealer_portal.sql. Postgres does not allow
-- a brand-new enum value to be used in the same transaction that adds it,
-- so 0003 (which uses 'dealer' in policies/functions) must run afterwards
-- as a separate execution.
-- =========================================================================

alter type app_role add value if not exists 'dealer';
