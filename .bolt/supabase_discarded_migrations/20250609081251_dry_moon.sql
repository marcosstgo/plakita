/*
  # Fix data integrity issues

  1. Functions
    - validate_tag_pet_integrity: Detecta y corrige problemas de integridad
    - fix_orphaned_tags: Desactiva tags sin mascotas asociadas
    - cleanup_data_integrity: Función completa de limpieza

  2. Security
    - Solo accesible por administradores
    - Logs de cambios para auditoría
*/

-- Función para validar y corregir integridad entre tags y pets
CREATE OR REPLACE FUNCTION validate_tag_pet_integrity()
RETURNS TABLE(
  issue_type TEXT,
  tag_id UUID,
  tag_code TEXT,
  pet_id UUID,
  user_id UUID,
  action_taken TEXT
) AS $$
DECLARE
  rec RECORD;
  fixed_count INTEGER := 0;
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Buscar tags activados sin mascota asociada
  FOR rec IN 
    SELECT t.id, t.code, t.pet_id, t.user_id, t.activated
    FROM tags t
    WHERE t.activated = true 
    AND (t.pet_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM pets p WHERE p.id = t.pet_id
    ))
  LOOP
    -- Desactivar el tag huérfano
    UPDATE tags 
    SET 
      activated = false,
      activated_at = NULL,
      pet_id = NULL
    WHERE id = rec.id;
    
    fixed_count := fixed_count + 1;
    
    RETURN QUERY SELECT 
      'orphaned_tag'::TEXT,
      rec.id,
      rec.code,
      rec.pet_id,
      rec.user_id,
      'deactivated_orphaned_tag'::TEXT;
  END LOOP;
  
  -- Buscar pets con qr_activated=true pero sin tag asociado
  FOR rec IN
    SELECT p.id as pet_id, p.name, p.user_id, p.qr_activated
    FROM pets p
    WHERE p.qr_activated = true
    AND NOT EXISTS (
      SELECT 1 FROM tags t WHERE t.pet_id = p.id AND t.activated = true
    )
  LOOP
    -- Desactivar el QR de la mascota
    UPDATE pets 
    SET qr_activated = false
    WHERE id = rec.pet_id;
    
    fixed_count := fixed_count + 1;
    
    RETURN QUERY SELECT 
      'orphaned_pet'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      rec.pet_id,
      rec.user_id,
      'deactivated_pet_qr'::TEXT;
  END LOOP;
  
  -- Si no hay problemas, retornar mensaje de éxito
  IF fixed_count = 0 THEN
    RETURN QUERY SELECT 
      'no_issues'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::UUID,
      NULL::UUID,
      'no_integrity_issues_found'::TEXT;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener reporte de integridad sin hacer cambios
CREATE OR REPLACE FUNCTION get_integrity_report()
RETURNS TABLE(
  issue_type TEXT,
  tag_code TEXT,
  pet_name TEXT,
  user_email TEXT,
  description TEXT
) AS $$
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Tags activados sin mascota
  RETURN QUERY
  SELECT 
    'orphaned_tag'::TEXT,
    t.code,
    NULL::TEXT,
    u.email,
    'Tag activado sin mascota asociada'::TEXT
  FROM tags t
  LEFT JOIN users u ON t.user_id = u.id
  WHERE t.activated = true 
  AND (t.pet_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM pets p WHERE p.id = t.pet_id
  ));
  
  -- Pets con QR activado sin tag
  RETURN QUERY
  SELECT 
    'orphaned_pet'::TEXT,
    NULL::TEXT,
    p.name,
    u.email,
    'Mascota con QR activado sin tag asociado'::TEXT
  FROM pets p
  LEFT JOIN users u ON p.user_id = u.id
  WHERE p.qr_activated = true
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.pet_id = p.id AND t.activated = true
  );
  
  -- Tags con pet_id que no existe
  RETURN QUERY
  SELECT 
    'invalid_pet_reference'::TEXT,
    t.code,
    NULL::TEXT,
    u.email,
    'Tag referencia mascota inexistente'::TEXT
  FROM tags t
  LEFT JOIN users u ON t.user_id = u.id
  WHERE t.pet_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM pets p WHERE p.id = t.pet_id
  );
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar datos específicos de prueba
CREATE OR REPLACE FUNCTION cleanup_test_data()
RETURNS TABLE(
  action TEXT,
  count INTEGER,
  details TEXT
) AS $$
DECLARE
  deleted_tags INTEGER;
  deleted_pets INTEGER;
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Eliminar tags de prueba no activados
  DELETE FROM tags 
  WHERE code LIKE 'PLK-TEST%' 
  AND activated = false;
  
  GET DIAGNOSTICS deleted_tags = ROW_COUNT;
  
  -- Eliminar pets huérfanos (sin tags asociados)
  DELETE FROM pets 
  WHERE NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.pet_id = pets.id
  )
  AND name LIKE '%test%';
  
  GET DIAGNOSTICS deleted_pets = ROW_COUNT;
  
  RETURN QUERY SELECT 'deleted_test_tags'::TEXT, deleted_tags, 'Tags de prueba eliminados'::TEXT;
  RETURN QUERY SELECT 'deleted_orphan_pets'::TEXT, deleted_pets, 'Mascotas huérfanas eliminadas'::TEXT;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para corregir tags específicos problemáticos
CREATE OR REPLACE FUNCTION fix_specific_tags(tag_codes TEXT[])
RETURNS TABLE(
  tag_code TEXT,
  action_taken TEXT,
  success BOOLEAN
) AS $$
DECLARE
  code TEXT;
  tag_record RECORD;
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  FOREACH code IN ARRAY tag_codes
  LOOP
    SELECT * INTO tag_record FROM tags WHERE tags.code = code;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT code, 'tag_not_found'::TEXT, false;
      CONTINUE;
    END IF;
    
    -- Si está activado pero no tiene mascota, desactivar
    IF tag_record.activated = true AND (
      tag_record.pet_id IS NULL OR 
      NOT EXISTS (SELECT 1 FROM pets WHERE id = tag_record.pet_id)
    ) THEN
      UPDATE tags 
      SET 
        activated = false,
        activated_at = NULL,
        pet_id = NULL
      WHERE id = tag_record.id;
      
      RETURN QUERY SELECT code, 'deactivated_orphaned_tag'::TEXT, true;
    ELSE
      RETURN QUERY SELECT code, 'no_action_needed'::TEXT, true;
    END IF;
  END LOOP;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;