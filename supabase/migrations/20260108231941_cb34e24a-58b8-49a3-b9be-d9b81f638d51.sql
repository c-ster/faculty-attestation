-- =============================================
-- Fix: Move roles to separate table per security requirements
-- Step 1: Drop all dependent policies first
-- =============================================

-- Drop policies that depend on the role column
DROP POLICY IF EXISTS "Leadership can view unit profiles" ON public.profiles;
DROP POLICY IF EXISTS "Chairs can view department submissions" ON public.submissions;
DROP POLICY IF EXISTS "Vice Provost can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Admins can update submission status" ON public.submissions;
DROP POLICY IF EXISTS "Leadership can view unit certifications" ON public.self_certifications;
DROP POLICY IF EXISTS "Leadership can view attestation logs" ON public.attestation_logs;

-- Now drop the role column from profiles
ALTER TABLE public.profiles DROP COLUMN role;

-- Drop the old user_role enum
DROP TYPE public.user_role;

-- Create app_role enum (if not exists from partial migration)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('faculty', 'chair', 'lab_director', 'vice_provost', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table (if not exists)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1
      WHEN 'vice_provost' THEN 2
      WHEN 'lab_director' THEN 3
      WHEN 'chair' THEN 4
      WHEN 'faculty' THEN 5
    END
  LIMIT 1
$$;

-- RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Recreate profiles policies using has_role function
CREATE POLICY "Leadership can view unit profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'chair') OR
    public.has_role(auth.uid(), 'lab_director') OR
    public.has_role(auth.uid(), 'vice_provost') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Recreate submissions policies using has_role function
CREATE POLICY "Chairs can view department submissions"
  ON public.submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (public.has_role(auth.uid(), 'chair') OR public.has_role(auth.uid(), 'lab_director'))
      AND p.department = submissions.department
    )
  );

CREATE POLICY "Vice Provost can view all submissions"
  ON public.submissions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'vice_provost') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update submission status"
  ON public.submissions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Recreate self_certifications policies
CREATE POLICY "Leadership can view unit certifications"
  ON public.self_certifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE s.id = self_certifications.submission_id
      AND (
        ((public.has_role(auth.uid(), 'chair') OR public.has_role(auth.uid(), 'lab_director')) AND p.department = s.department)
        OR public.has_role(auth.uid(), 'vice_provost')
        OR public.has_role(auth.uid(), 'admin')
      )
    )
  );

-- Recreate attestation_logs policies
CREATE POLICY "Leadership can view attestation logs"
  ON public.attestation_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'chair') OR
    public.has_role(auth.uid(), 'lab_director') OR
    public.has_role(auth.uid(), 'vice_provost') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Update handle_new_user to assign default faculty role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign default faculty role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'faculty');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;