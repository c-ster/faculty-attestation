-- ============================================================================
-- FIX PROFILES RLS POLICIES
-- Ensures users can access their own profile data
-- ============================================================================

-- Drop and recreate the basic profile policies to ensure they work
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Simple, reliable policy for users to view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow profile creation (needed for signup trigger)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Also allow service role / trigger to insert profiles
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- ENSURE PROFILE EXISTS FOR CURRENT USERS
-- Creates profiles for any users who signed up before trigger existed
-- ============================================================================

INSERT INTO public.profiles (user_id, email, full_name)
SELECT
  au.id as user_id,
  au.email as email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- ENSURE RPC FUNCTIONS ARE ACCESSIBLE
-- Grant execute permissions on stats functions
-- ============================================================================

-- Make sure the functions exist and are accessible
GRANT EXECUTE ON FUNCTION get_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_public_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_leadership_stats(INTEGER) TO authenticated;
