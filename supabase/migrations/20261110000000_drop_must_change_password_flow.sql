-- Drop forced password-change-on-first-login flow.
-- All existing profiles with must_change_password=true are cleared.
UPDATE profiles SET must_change_password = false WHERE must_change_password = true;
