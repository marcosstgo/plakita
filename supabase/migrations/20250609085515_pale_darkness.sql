/*
  # Corrección completa de problemas de integridad en dashboard de admin

  1. Funciones de corrección
    - Corregir tags activados sin mascota
    - Sincronizar estados entre tags y pets
    - Limpiar referencias inválidas
    
  2. Mejoras en consultas
    - Optimizar carga de datos en dashboard
    - Mejorar detección de problemas
    
  3. Seguridad
    - Solo admin puede ejecutar funciones de corrección
    - Validaciones de integridad automáticas
*/

-- Función mejorada para corregir problemas específicos del dashboard
CREATE OR REPLACE FUNCTION fix_dashboard_integrity_issues()
RETURNS TABLE(
  issue_type TEXT,
  tag_code TEXT,
  pet_name TEXT,
  action_taken TEXT,
  success BOOLEAN
) AS $$
DECLARE
  rec RECORD;
  fixed_count INTEGER := 0;
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- 1. Corregir tags activados sin mascota (el problema principal)
  FOR rec IN 
    SELECT t.id, t.code, t.pet_id, t.user_id
    FROM tags t
    WHERE t.activated = true 
    AND (
      t.pet_id IS NULL 
      OR NOT EXISTS (
        SELECT 1 FROM pets p 
        WHERE p.id = t.pet_id
      )
    )
  LOOP
    -- Desactivar el tag problemático
    UPDATE tags 
    SET 
      activated = false,
      activated_at = NULL,
      pet_id = NULL
    WHERE id = rec.id;
    
    fixed_count := fixed_count + 1;
    
    RETURN QUERY SELECT 
      'orphaned_activated_tag'::TEXT,
      rec.code,
      NULL::TEXT,
      'Tag desactivado - no tenía mascota válida'::TEXT,
      true;
  END LOOP;
  
  -- 2. Corregir pets con QR activado pero sin tag válido
  FOR rec IN
    SELECT p.id, p.name, p.user_id
    FROM pets p
    WHERE p.qr_activated = true
    AND NOT EXISTS (
      SELECT 1 FROM tags t 
      WHERE t.pet_id = p.id 
      AND t.activated = true
    )
  LOOP
    -- Desactivar QR de la mascota huérfana
    UPDATE pets 
    SET qr_activated = false
    WHERE id = rec.id;
    
    fixed_count := fixed_count + 1;
    
    RETURN QUERY SELECT 
      'orphaned_activated_pet'::TEXT,
      NULL::TEXT,
      rec.name,
      'QR de mascota desactivado - no tenía tag válido'::TEXT,
      true;
  END LOOP;
  
  -- 3. Limpiar referencias de tags a pets inexistentes
  FOR rec IN
    SELECT t.id, t.code, t.pet_id
    FROM tags t
    WHERE t.pet_id IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM pets p 
      WHERE p.id = t.pet_id
    )
  LOOP
    -- Limpiar referencia inválida
    UPDATE tags 
    SET pet_id = NULL
    WHERE id = rec.id;
    
    fixed_count := fixed_count + 1;
    
    RETURN QUERY SELECT 
      'invalid_pet_reference'::TEXT,
      rec.code,
      NULL::TEXT,
      'Referencia a mascota inexistente eliminada'::TEXT,
      true;
  END LOOP;
  
  -- Si no hay problemas
  IF fixed_count = 0 THEN
    RETURN QUERY SELECT 
      'no_issues_found'::TEXT,
      'N/A'::TEXT,
      'N/A'::TEXT,
      'No se encontraron problemas de integridad'::TEXT,
      true;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener datos correctos del dashboard de admin
CREATE OR REPLACE FUNCTION get_admin_dashboard_data()
RETURNS TABLE(
  tag_id UUID,
  tag_code TEXT,
  tag_activated BOOLEAN,
  tag_created_at TIMESTAMPTZ,
  pet_id UUID,
  pet_name TEXT,
  pet_type TEXT,
  pet_qr_activated BOOLEAN,
  owner_name TEXT,
  owner_contact TEXT,
  owner_phone TEXT,
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  status_text TEXT,
  has_integrity_issue BOOLEAN
) AS $$
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY
  SELECT 
    t.id as tag_id,
    t.code as tag_code,
    t.activated as tag_activated,
    t.created_at as tag_created_at,
    p.id as pet_id,
    p.name as pet_name,
    p.type as pet_type,
    p.qr_activated as pet_qr_activated,
    p.owner_name,
    p.owner_contact,
    p.owner_phone,
    u.id as user_id,
    u.email as user_email,
    u.full_name as user_full_name,
    CASE 
      WHEN t.activated = false THEN 'No Activado'
      WHEN t.activated = true AND p.id IS NOT NULL THEN 'Activado'
      WHEN t.activated = true AND p.id IS NULL THEN 'ERROR: Activado sin mascota'
      ELSE 'Estado desconocido'
    END as status_text,
    CASE 
      WHEN t.activated = true AND p.id IS NULL THEN true
      WHEN t.activated = true AND p.qr_activated = false THEN true
      WHEN t.activated = false AND p.qr_activated = true THEN true
      ELSE false
    END as has_integrity_issue
  FROM tags t
  LEFT JOIN pets p ON t.pet_id = p.id
  LEFT JOIN users u ON t.user_id = u.id
  ORDER BY t.created_at DESC;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar integridad antes de mostrar dashboard
CREATE OR REPLACE FUNCTION verify_dashboard_integrity()
RETURNS TABLE(
  total_tags INTEGER,
  activated_tags INTEGER,
  tags_with_pets INTEGER,
  orphaned_tags INTEGER,
  integrity_score NUMERIC
) AS $$
DECLARE
  total_count INTEGER;
  activated_count INTEGER;
  with_pets_count INTEGER;
  orphaned_count INTEGER;
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Contar totales
  SELECT COUNT(*) INTO total_count FROM tags;
  SELECT COUNT(*) INTO activated_count FROM tags WHERE activated = true;
  SELECT COUNT(*) INTO with_pets_count 
  FROM tags t 
  WHERE t.activated = true 
  AND EXISTS (SELECT 1 FROM pets p WHERE p.id = t.pet_id);
  
  SELECT COUNT(*) INTO orphaned_count 
  FROM tags t 
  WHERE t.activated = true 
  AND (t.pet_id IS NULL OR NOT EXISTS (SELECT 1 FROM pets p WHERE p.id = t.pet_id));
  
  RETURN QUERY SELECT 
    total_count,
    activated_count,
    with_pets_count,
    orphaned_count,
    CASE 
      WHEN activated_count = 0 THEN 100.0
      ELSE ROUND((with_pets_count::NUMERIC / activated_count::NUMERIC) * 100, 2)
    END as integrity_score;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para prevenir problemas futuros
CREATE OR REPLACE FUNCTION prevent_integrity_issues()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se está activando un tag, verificar que tenga mascota
  IF NEW.activated = true AND OLD.activated = false THEN
    IF NEW.pet_id IS NULL THEN
      RAISE EXCEPTION 'No se puede activar un tag sin mascota asociada';
    END IF;
    
    -- Verificar que la mascota existe
    IF NOT EXISTS (SELECT 1 FROM pets WHERE id = NEW.pet_id) THEN
      RAISE EXCEPTION 'No se puede activar tag: la mascota asociada no existe';
    END IF;
    
    -- Activar automáticamente el QR de la mascota
    UPDATE pets SET qr_activated = true WHERE id = NEW.pet_id;
  END IF;
  
  -- Si se está desactivando un tag, desactivar también el QR de la mascota
  IF NEW.activated = false AND OLD.activated = true AND OLD.pet_id IS NOT NULL THEN
    UPDATE pets SET qr_activated = false WHERE id = OLD.pet_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a la tabla tags
DROP TRIGGER IF EXISTS trigger_prevent_integrity_issues ON tags;
CREATE TRIGGER trigger_prevent_integrity_issues
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION prevent_integrity_issues();

-- Ejecutar corrección inmediata de problemas existentes
DO $$
DECLARE
  admin_user_id UUID := '3d4b3b56-fba6-4d76-866c-f38551c7a6c4';
  current_user_id UUID;
BEGIN
  -- Obtener el ID del usuario actual
  SELECT auth.uid() INTO current_user_id;
  
  -- Solo ejecutar si es el admin
  IF current_user_id = admin_user_id THEN
    -- Corregir tags activados sin mascota
    UPDATE tags 
    SET 
      activated = false,
      activated_at = NULL,
      pet_id = NULL
    WHERE activated = true 
    AND (
      pet_id IS NULL 
      OR NOT EXISTS (
        SELECT 1 FROM pets p 
        WHERE p.id = tags.pet_id
      )
    );
    
    -- Corregir pets con QR activado sin tag
    UPDATE pets 
    SET qr_activated = false
    WHERE qr_activated = true
    AND NOT EXISTS (
      SELECT 1 FROM tags t 
      WHERE t.pet_id = pets.id 
      AND t.activated = true
    );
    
    RAISE NOTICE 'Problemas de integridad corregidos automáticamente';
  END IF;
END $$;

-- Comentarios para documentación
COMMENT ON FUNCTION fix_dashboard_integrity_issues() IS 'Corrige problemas específicos mostrados en el dashboard de admin';
COMMENT ON FUNCTION get_admin_dashboard_data() IS 'Obtiene datos correctos y consistentes para el dashboard de admin';
COMMENT ON FUNCTION verify_dashboard_integrity() IS 'Verifica el estado de integridad antes de mostrar el dashboard';
COMMENT ON FUNCTION prevent_integrity_issues() IS 'Previene problemas de integridad en operaciones futuras';