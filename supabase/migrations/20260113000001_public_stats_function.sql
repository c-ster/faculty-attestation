-- ============================================================================
-- PUBLIC STATS FUNCTION
-- Returns aggregate statistics without exposing sensitive data
-- Uses SECURITY DEFINER to bypass RLS for aggregate counts only
-- ============================================================================

-- Function to get public aggregate statistics
CREATE OR REPLACE FUNCTION get_public_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_year_start DATE;
BEGIN
  current_year_start := date_trunc('year', CURRENT_DATE)::DATE;

  SELECT json_build_object(
    'total_submissions', COUNT(*),
    'submissions_this_year', COUNT(*) FILTER (WHERE created_at >= current_year_start),
    'released_count', COUNT(*) FILTER (WHERE status = 'released'),
    'released_percentage', CASE
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'released')::NUMERIC / COUNT(*)) * 100)
      ELSE 0
    END,
    'departments_count', COUNT(DISTINCT department),
    'under_review_count', COUNT(*) FILTER (WHERE status = 'under_review'),
    'with_risk_flags', COUNT(*) FILTER (WHERE array_length(risk_flags, 1) > 0)
  ) INTO result
  FROM submissions;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_public_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_stats() TO anon;

-- ============================================================================
-- LEADERSHIP DASHBOARD STATS FUNCTION
-- Returns detailed statistics for leadership dashboards
-- Uses SECURITY DEFINER to bypass RLS and get all submission data
-- ============================================================================

CREATE OR REPLACE FUNCTION get_leadership_stats(time_range_months INTEGER DEFAULT 6)
RETURNS JSON AS $$
DECLARE
  result JSON;
  cutoff_date DATE;
BEGIN
  cutoff_date := CURRENT_DATE - (time_range_months || ' months')::INTERVAL;

  SELECT json_build_object(
    'total', COUNT(*),
    'released', COUNT(*) FILTER (WHERE status = 'released'),
    'under_review', COUNT(*) FILTER (WHERE status = 'under_review'),
    'submitted', COUNT(*) FILTER (WHERE status = 'submitted'),
    'not_released', COUNT(*) FILTER (WHERE status = 'not_released'),
    'with_risk_flags', COUNT(*) FILTER (WHERE array_length(risk_flags, 1) > 0),
    'by_department', (
      SELECT json_agg(dept_stats)
      FROM (
        SELECT department as name, COUNT(*) as value
        FROM submissions
        WHERE created_at >= cutoff_date
        GROUP BY department
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) dept_stats
    ),
    'by_month', (
      SELECT json_agg(month_stats ORDER BY month_num)
      FROM (
        SELECT
          to_char(created_at, 'Mon') as month,
          EXTRACT(MONTH FROM created_at) as month_num,
          COUNT(*) as submissions
        FROM submissions
        WHERE created_at >= cutoff_date
        GROUP BY to_char(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
      ) month_stats
    ),
    'by_sponsor', (
      SELECT json_agg(sponsor_stats)
      FROM (
        SELECT COALESCE(sponsor, 'Not Specified') as name, COUNT(*) as value
        FROM submissions
        WHERE created_at >= cutoff_date
        GROUP BY sponsor
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) sponsor_stats
    )
  ) INTO result
  FROM submissions
  WHERE created_at >= cutoff_date;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only authenticated users can call this
GRANT EXECUTE ON FUNCTION get_leadership_stats(INTEGER) TO authenticated;
