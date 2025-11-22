/*
  # Create Admin Helper Functions

  1. New Functions
    - `get_user_statistics` - Returns count of all users (admin only)
    - `get_admin_statistics` - Returns comprehensive admin statistics
    - `get_all_tags_with_details` - Returns all tags with related user/pet info
    - `get_integrity_report` - Returns data integrity issues
    - `verify_dashboard_integrity` - Returns integrity score
    - `fix_dashboard_integrity_issues` - Auto-fixes common integrity issues
    - `fix_specific_tags` - Fixes specific problematic tags

  2. Security
    - All functions are restricted to admin users only
    - Functions use SECURITY DEFINER to bypass RLS when needed
    - Proper validation and error handling
*/

-- Function to get user count (admin only)
CREATE OR REPLACE FUNCTION get_user_statistics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count int;
  is_admin boolean;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Get user count
  SELECT COUNT(*) INTO user_count FROM users;

  RETURN json_build_object(
    'success', true,
    'data', json_build_object('total_users', user_count)
  );
END;
$$;

-- Function to get comprehensive admin statistics
CREATE OR REPLACE FUNCTION get_admin_statistics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  total_tags int;
  activated_tags int;
  total_pets int;
  total_users int;
  nfc_tags int;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Get statistics
  SELECT COUNT(*) INTO total_tags FROM tags;
  SELECT COUNT(*) INTO activated_tags FROM tags WHERE activated = true;
  SELECT COUNT(*) INTO total_pets FROM pets;
  SELECT COUNT(*) INTO total_users FROM users;
  SELECT COUNT(*) INTO nfc_tags FROM tags WHERE has_nfc = true;

  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'totalTags', total_tags,
      'activatedTags', activated_tags,
      'totalPets', total_pets,
      'totalUsers', total_users,
      'nfcTags', nfc_tags
    )
  );
END;
$$;

-- Function to get all tags with details (admin only)
CREATE OR REPLACE FUNCTION get_all_tags_with_details()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  tags_data json;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Get all tags with related data
  SELECT json_agg(
    json_build_object(
      'id', t.id,
      'code', t.code,
      'activated', t.activated,
      'activated_at', t.activated_at,
      'pet_id', t.pet_id,
      'user_id', t.user_id,
      'created_at', t.created_at,
      'has_nfc', COALESCE(t.has_nfc, false),
      'nfc_last_written', t.nfc_last_written,
      'nfc_uid', t.nfc_uid,
      'pets', CASE 
        WHEN p.id IS NOT NULL THEN json_build_object(
          'id', p.id,
          'name', p.name,
          'type', p.type,
          'owner_name', p.owner_name
        )
        ELSE NULL
      END,
      'users', CASE 
        WHEN u.id IS NOT NULL THEN json_build_object(
          'id', u.id,
          'email', u.email,
          'full_name', u.full_name
        )
        ELSE NULL
      END,
      'hasIntegrityIssue', CASE
        WHEN t.activated = true AND t.pet_id IS NULL THEN true
        ELSE false
      END,
      'isOrphaned', CASE
        WHEN t.user_id IS NULL AND t.activated = true THEN true
        ELSE false
      END,
      'statusText', CASE
        WHEN t.activated = true AND t.pet_id IS NULL THEN 'Error: Activado sin mascota'
        WHEN t.activated = true THEN 'Activado'
        ELSE 'No Activado'
      END
    )
    ORDER BY t.created_at DESC
  ) INTO tags_data
  FROM tags t
  LEFT JOIN pets p ON t.pet_id = p.id
  LEFT JOIN users u ON t.user_id = u.id;

  RETURN json_build_object(
    'success', true,
    'data', COALESCE(tags_data, '[]'::json)
  );
END;
$$;

-- Function to get integrity report
CREATE OR REPLACE FUNCTION get_integrity_report()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  issues json;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Find integrity issues
  SELECT json_agg(
    json_build_object(
      'type', issue_type,
      'description', description,
      'tag_code', tag_code,
      'tag_id', tag_id
    )
  ) INTO issues
  FROM (
    -- Activated tags without pets
    SELECT 
      'activated_no_pet' as issue_type,
      'Tag activado sin mascota vinculada' as description,
      t.code as tag_code,
      t.id as tag_id
    FROM tags t
    WHERE t.activated = true AND t.pet_id IS NULL
    
    UNION ALL
    
    -- Activated tags without users
    SELECT 
      'activated_no_user' as issue_type,
      'Tag activado sin usuario asignado' as description,
      t.code as tag_code,
      t.id as tag_id
    FROM tags t
    WHERE t.activated = true AND t.user_id IS NULL
  ) sub;

  RETURN json_build_object(
    'success', true,
    'data', COALESCE(issues, '[]'::json)
  );
END;
$$;

-- Function to verify dashboard integrity
CREATE OR REPLACE FUNCTION verify_dashboard_integrity()
RETURNS TABLE(integrity_score int, issues_found int)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  total_tags int;
  problem_tags int;
  score int;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Count total tags
  SELECT COUNT(*) INTO total_tags FROM tags;
  
  -- Count problematic tags
  SELECT COUNT(*) INTO problem_tags
  FROM tags t
  WHERE (t.activated = true AND t.pet_id IS NULL)
     OR (t.activated = true AND t.user_id IS NULL);

  -- Calculate score
  IF total_tags = 0 THEN
    score := 100;
  ELSE
    score := GREATEST(0, 100 - ((problem_tags * 100) / total_tags));
  END IF;

  RETURN QUERY SELECT score, problem_tags;
END;
$$;

-- Function to fix dashboard integrity issues
CREATE OR REPLACE FUNCTION fix_dashboard_integrity_issues()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  fixed_count int := 0;
  results json;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Fix activated tags without pets (deactivate them)
  WITH fixed_tags AS (
    UPDATE tags
    SET activated = false, activated_at = NULL
    WHERE activated = true AND pet_id IS NULL
    RETURNING id, code
  )
  SELECT json_agg(
    json_build_object(
      'success', true,
      'tag_code', code,
      'action_taken', 'deactivated_orphaned_tag'
    )
  ) INTO results
  FROM fixed_tags;

  GET DIAGNOSTICS fixed_count = ROW_COUNT;

  IF fixed_count = 0 THEN
    RETURN json_build_object(
      'success', true,
      'data', json_build_array(
        json_build_object(
          'success', true,
          'action_taken', 'No se encontraron problemas de integridad'
        )
      )
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'data', COALESCE(results, '[]'::json),
    'fixed_count', fixed_count
  );
END;
$$;

-- Function to fix specific tags
CREATE OR REPLACE FUNCTION fix_specific_tags(tag_codes text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  results json;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Fix specified tags
  WITH fixed_tags AS (
    UPDATE tags
    SET activated = false, activated_at = NULL
    WHERE code = ANY(tag_codes)
      AND activated = true 
      AND pet_id IS NULL
    RETURNING id, code
  )
  SELECT json_agg(
    json_build_object(
      'success', true,
      'tag_code', code,
      'action_taken', 'deactivated_orphaned_tag'
    )
  ) INTO results
  FROM fixed_tags;

  RETURN json_build_object(
    'success', true,
    'data', COALESCE(results, '[]'::json)
  );
END;
$$;

-- Grant execute permissions to authenticated users
-- (functions will check admin role internally)
GRANT EXECUTE ON FUNCTION get_user_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_tags_with_details() TO authenticated;
GRANT EXECUTE ON FUNCTION get_integrity_report() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_dashboard_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_dashboard_integrity_issues() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_specific_tags(text[]) TO authenticated;
