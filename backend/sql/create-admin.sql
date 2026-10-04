-- 1) Create the administrator account normally from login.html first.
-- 2) Replace the email below with that account's email and run this query.
update public.profiles
set role = 'admin'
where lower(email) = lower('YOUR_ADMIN_EMAIL');

-- Verify:
select id, email, full_name, role, plan
from public.profiles
where lower(email) = lower('YOUR_ADMIN_EMAIL');
