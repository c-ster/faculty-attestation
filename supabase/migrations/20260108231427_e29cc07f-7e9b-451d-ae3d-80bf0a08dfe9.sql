-- =============================================
-- NPS Public-Release Self-Certification System
-- MVP Database Schema
-- =============================================

-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('faculty', 'chair', 'lab_director', 'vice_provost', 'admin');

-- Create enum for submission status
CREATE TYPE public.submission_status AS ENUM ('submitted', 'under_review', 'released', 'not_released');

-- =============================================
-- Profiles Table (user info with roles)
-- =============================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT,
  school TEXT,
  role public.user_role NOT NULL DEFAULT 'faculty',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Leadership can view profiles in their unit
CREATE POLICY "Leadership can view unit profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('chair', 'lab_director', 'vice_provost', 'admin')
    )
  );

-- =============================================
-- Submissions Table (manuscript metadata)
-- =============================================
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE, -- Human-readable ID like NPS-2025-0001
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  authors TEXT[] NOT NULL,
  department TEXT NOT NULL,
  school TEXT NOT NULL,
  abstract TEXT,
  sponsor TEXT,
  funding_source TEXT,
  target_venue TEXT,
  manuscript_path TEXT, -- Path to file in storage
  manuscript_filename TEXT,
  status public.submission_status NOT NULL DEFAULT 'submitted',
  risk_flags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Faculty can view their own submissions
CREATE POLICY "Faculty can view own submissions"
  ON public.submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Faculty can create submissions
CREATE POLICY "Faculty can create submissions"
  ON public.submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Faculty can update their own submissions (before review)
CREATE POLICY "Faculty can update own submissions"
  ON public.submissions FOR UPDATE
  USING (auth.uid() = user_id AND status = 'submitted');

-- Leadership can view submissions in their unit
CREATE POLICY "Chairs can view department submissions"
  ON public.submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('chair', 'lab_director')
      AND p.department = submissions.department
    )
  );

-- Vice Provost can view all submissions
CREATE POLICY "Vice Provost can view all submissions"
  ON public.submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('vice_provost', 'admin')
    )
  );

-- Admins can update submission status
CREATE POLICY "Admins can update submission status"
  ON public.submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- =============================================
-- Self-Certification Responses Table
-- =============================================
CREATE TABLE public.self_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  
  -- Classification section
  contains_classified BOOLEAN NOT NULL,
  classification_details TEXT,
  
  -- Operational sensitivity
  contains_operational_info BOOLEAN NOT NULL,
  operational_details TEXT,
  
  -- Export control
  contains_export_controlled BOOLEAN NOT NULL,
  export_control_type TEXT, -- ITAR, EAR, etc.
  export_control_details TEXT,
  
  -- Foreign involvement
  has_foreign_involvement BOOLEAN NOT NULL,
  foreign_countries TEXT[],
  foreign_details TEXT,
  
  -- Funding/sponsor requirements
  has_sponsor_restrictions BOOLEAN NOT NULL,
  sponsor_restriction_details TEXT,
  
  -- Prior public release
  has_prior_release BOOLEAN NOT NULL,
  prior_release_details TEXT,
  
  -- Faculty attestation
  attested_accurate BOOLEAN NOT NULL DEFAULT false,
  attested_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.self_certifications ENABLE ROW LEVEL SECURITY;

-- Same policies as submissions (linked data)
CREATE POLICY "Users can view own certifications"
  ON public.self_certifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = self_certifications.submission_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create certifications for own submissions"
  ON public.self_certifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = self_certifications.submission_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Leadership can view unit certifications"
  ON public.self_certifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE s.id = self_certifications.submission_id
      AND (
        (p.role IN ('chair', 'lab_director') AND p.department = s.department)
        OR p.role IN ('vice_provost', 'admin')
      )
    )
  );

-- =============================================
-- Attestation Logs (IMMUTABLE audit trail)
-- =============================================
CREATE TABLE public.attestation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL, -- 'submitted', 'attested', 'status_changed'
  previous_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attestation_logs ENABLE ROW LEVEL SECURITY;

-- No UPDATE or DELETE policies - logs are immutable
CREATE POLICY "Users can view own attestation logs"
  ON public.attestation_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert attestation logs"
  ON public.attestation_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leadership can view attestation logs"
  ON public.attestation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('chair', 'lab_director', 'vice_provost', 'admin')
    )
  );

-- =============================================
-- Helper Functions
-- =============================================

-- Function to generate submission ID
CREATE OR REPLACE FUNCTION public.generate_submission_id()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_id TEXT;
BEGIN
  year_part := to_char(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(submission_id FROM 10 FOR 4) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.submissions
  WHERE submission_id LIKE 'NPS-' || year_part || '-%';
  
  new_id := 'NPS-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  NEW.submission_id := new_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-generating submission ID
CREATE TRIGGER set_submission_id
  BEFORE INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_submission_id();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Timestamp triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- Storage Bucket for Manuscripts
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'manuscripts',
  'manuscripts',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
);

-- Storage policies
CREATE POLICY "Users can upload own manuscripts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'manuscripts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own manuscripts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'manuscripts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own manuscripts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'manuscripts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );