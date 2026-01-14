-- ============================================================================
-- ADMIN SETUP PERMISSIONS
-- Allows initial admin role assignment and user role management
-- ============================================================================

-- Drop existing policies on user_roles to recreate them
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert/update/delete roles
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- IMPORTANT: Allow first admin setup when no admins exist
CREATE POLICY "Allow first admin setup"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow if no admin exists yet AND user is setting themselves as admin
    NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin')
    AND user_id = auth.uid()
    AND role = 'admin'
  );

-- Allow authenticated users to read profiles (for admin setup page)
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
