/*
  # Corregir acceso de administradores a datos de usuarios

  1. Funciones de administrador
    - Crear función para obtener estadísticas de usuarios de forma segura
    - Crear función para listar usuarios (solo para admins)
    
  2. Políticas mejoradas
    - Permitir a administradores acceder a datos agregados
    - Mantener seguridad para usuarios regulares
    
  3. Seguridad
    - Solo el usuario admin específico puede acceder
    - Datos sensibles protegidos
*/

-- Función para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar por ID específico del admin
  IF auth.uid()::text = '3d4b3b56-fba6-4d76-866c-f38551c7a6c4' THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar por email como fallback
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'santiago.marcos@gmail.com'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de usuarios (solo admin)
CREATE OR REPLACE FUNCTION get_user_statistics()
RETURNS TABLE(
  total_users BIGINT,
  users_with_tags BIGINT,
  users_with_pets BIGINT,
  active_users BIGINT
) AS $$
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.users)::BIGINT as total_users,
    (SELECT COUNT(DISTINCT user_id) FROM tags WHERE user_id IS NOT NULL)::BIGINT as users_with_tags,
    (SELECT COUNT(DISTINCT user_id) FROM pets WHERE user_id IS NOT NULL)::BIGINT as users_with_pets,
    (SELECT COUNT(*) FROM public.users WHERE created_at > NOW() - INTERVAL '30 days')::BIGINT as active_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para listar usuarios básicos (solo admin)
CREATE OR REPLACE FUNCTION list_users_for_admin()
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  total_tags BIGINT,
  activated_tags BIGINT,
  total_pets BIGINT,
  activated_pets BIGINT
) AS $$
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.created_at,
    COALESCE(t.total_tags, 0) as total_tags,
    COALESCE(t.activated_tags, 0) as activated_tags,
    COALESCE(p.total_pets, 0) as total_pets,
    COALESCE(p.activated_pets, 0) as activated_pets
  FROM public.users u
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as total_tags,
      COUNT(*) FILTER (WHERE activated = true) as activated_tags
    FROM tags 
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ) t ON u.id = t.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as total_pets,
      COUNT(*) FILTER (WHERE qr_activated = true) as activated_pets
    FROM pets 
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ) p ON u.id = p.user_id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar usuario específico (solo admin)
CREATE OR REPLACE FUNCTION verify_user_for_admin(user_email TEXT)
RETURNS TABLE(
  user_data JSONB,
  tags_data JSONB,
  pets_data JSONB,
  stats JSONB
) AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Buscar el usuario por email
  SELECT id INTO target_user_id 
  FROM public.users 
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_email;
  END IF;
  
  RETURN QUERY
  SELECT 
    to_jsonb(u.*) as user_data,
    COALESCE(
      (SELECT jsonb_agg(to_jsonb(t.*)) FROM tags t WHERE t.user_id = target_user_id),
      '[]'::jsonb
    ) as tags_data,
    COALESCE(
      (SELECT jsonb_agg(to_jsonb(p.*)) FROM pets p WHERE p.user_id = target_user_id),
      '[]'::jsonb
    ) as pets_data,
    jsonb_build_object(
      'totalTags', (SELECT COUNT(*) FROM tags WHERE user_id = target_user_id),
      'activatedTags', (SELECT COUNT(*) FROM tags WHERE user_id = target_user_id AND activated = true),
      'totalPets', (SELECT COUNT(*) FROM pets WHERE user_id = target_user_id),
      'activatedPets', (SELECT COUNT(*) FROM pets WHERE user_id = target_user_id AND qr_activated = true)
    ) as stats
  FROM public.users u
  WHERE u.id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política mejorada para administradores en la tabla users
DROP POLICY IF EXISTS "Admin can read all users" ON public.users;
CREATE POLICY "Admin can read all users" ON public.users
  FOR SELECT TO authenticated
  USING (is_admin_user());

-- Política para permitir a admins actualizar usuarios si es necesario
DROP POLICY IF EXISTS "Admin can update users" ON public.users;
CREATE POLICY "Admin can update users" ON public.users
  FOR UPDATE TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());