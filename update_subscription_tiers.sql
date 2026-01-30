-- Update all users to 'free' tier EXCEPT for srikesavaraja@gmail.com

UPDATE public.user_profiles
SET subscription_tier = 'free'
WHERE user_id IN (
  SELECT id 
  FROM auth.users
  WHERE email NOT IN ('admin@example.com') -- Replace with your admin email
);

-- (Optional) If you want to ensure the admin is PRO, uncomment the following lines:
-- UPDATE public.user_profiles
-- SET subscription_tier = 'pro'
-- WHERE user_id IN (
--   SELECT id 
--   FROM auth.users 
--   WHERE email = 'admin@example.com' -- Replace with your admin email
-- );
