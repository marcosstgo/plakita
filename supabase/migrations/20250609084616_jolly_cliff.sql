-- Migración para corregir problemas de integridad en el dashboard de admin
-- Esta migración agrega funciones para limpiar y mantener la integridad de datos

-- Función para limpiar tags huérfanos (activados sin mascota)
CREATE OR REPLACE FUNCTION cleanup_orphaned_tags()
RETURNS TABLE(
  cleaned_tag_id UUID,
  tag_code TEXT,
  action_taken TEXT
) AS $$
DECLARE
  rec RECORD;
  cleaned_count INTEGER := 0;
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Buscar y limpiar tags activados sin mascota válida
  FOR rec IN 
    SELECT t.id, t.code, t.pet_id
    FROM tags t
    WHERE t.activated = true 
    AND (
      t.pet_id IS NULL 
      OR NOT EXISTS (
        SELECT 1 FROM pets p 
        WHERE p.id = t.pet_id 
        AND p.qr_activated = true
      )
    )
  LOOP
    -- Desactivar el tag huérfano
    UPDATE tags 
    SET 
      activated = false,
      activated_at = NULL,
      pet_id = NULL
    WHERE id = rec.id;
    
    cleaned_count := cleaned_count + 1;
    
    RETURN QUERY SELECT 
      rec.id,
      rec.code,
      'deactivated_orphaned_tag'::TEXT;
  END LOOP;
  
  -- Si no hay problemas, retornar mensaje
  IF cleaned_count = 0 THEN
    RETURN QUERY SELECT 
      NULL::UUID,
      'no_orphaned_tags'::TEXT,
      'no_cleanup_needed'::TEXT;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para sincronizar estados entre tags y pets
CREATE OR REPLACE FUNCTION sync_tag_pet_states()
RETURNS TABLE(
  sync_type TEXT,
  entity_id UUID,
  entity_code TEXT,
  action_taken TEXT
) AS $$
DECLARE
  rec RECORD;
  sync_count INTEGER := 0;
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- 1. Sincronizar pets que tienen qr_activated=true pero su tag no está activado
  FOR rec IN 
    SELECT p.id as pet_id, p.name, t.id as tag_id, t.code
    FROM pets p
    JOIN tags t ON t.pet_id = p.id
    WHERE p.qr_activated = true 
    AND t.activated = false
  LOOP
    -- Activar el tag correspondiente
    UPDATE tags 
    SET 
      activated = true,
      activated_at = COALESCE(activated_at, NOW())
    WHERE id = rec.tag_id;
    
    sync_count := sync_count + 1;
    
    RETURN QUERY SELECT 
      'sync_tag_activation'::TEXT,
      rec.tag_id,
      rec.code,
      'activated_tag_for_active_pet'::TEXT;
  END LOOP;
  
  -- 2. Sincronizar tags activados cuya mascota no tiene qr_activated=true
  FOR rec IN 
    SELECT t.id as tag_id, t.code, p.id as pet_id, p.name
    FROM tags t
    JOIN pets p ON p.id = t.pet_id
    WHERE t.activated = true 
    AND p.qr_activated = false
  LOOP
    -- Activar el QR de la mascota
    UPDATE pets 
    SET qr_activated = true
    WHERE id = rec.pet_id;
    
    sync_count := sync_count + 1;
    
    RETURN QUERY SELECT 
      'sync_pet_activation'::TEXT,
      rec.pet_id,
      rec.name,
      'activated_pet_qr_for_active_tag'::TEXT;
  END LOOP;
  
  -- Si no hay sincronizaciones necesarias
  IF sync_count = 0 THEN
    RETURN QUERY SELECT 
      'no_sync_needed'::TEXT,
      NULL::UUID,
      'all_states_synchronized'::TEXT,
      'no_action_required'::TEXT;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener un reporte detallado de integridad
CREATE OR REPLACE FUNCTION get_detailed_integrity_report()
RETURNS TABLE(
  check_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_code TEXT,
  issue_description TEXT,
  severity TEXT,
  recommended_action TEXT
) AS $$
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- 1. Tags activados sin mascota
  RETURN QUERY
  SELECT 
    'orphaned_tag'::TEXT,
    'tag'::TEXT,
    t.id,
    t.code,
    'Tag activado sin mascota asociada válida'::TEXT,
    'high'::TEXT,
    'Desactivar tag o asociar mascota válida'::TEXT
  FROM tags t
  WHERE t.activated = true 
  AND (
    t.pet_id IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM pets p 
      WHERE p.id = t.pet_id
    )
  );
  
  -- 2. Pets con QR activado sin tag
  RETURN QUERY
  SELECT 
    'orphaned_pet'::TEXT,
    'pet'::TEXT,
    p.id,
    p.name,
    'Mascota con QR activado sin tag asociado'::TEXT,
    'medium'::TEXT,
    'Crear tag para la mascota o desactivar QR'::TEXT
  FROM pets p
  WHERE p.qr_activated = true
  AND NOT EXISTS (
    SELECT 1 FROM tags t 
    WHERE t.pet_id = p.id 
    AND t.activated = true
  );
  
  -- 3. Estados inconsistentes entre tag y pet
  RETURN QUERY
  SELECT 
    'state_mismatch'::TEXT,
    'tag_pet_pair'::TEXT,
    t.id,
    CONCAT(t.code, ' -> ', p.name),
    'Estados inconsistentes entre tag y mascota'::TEXT,
    'medium'::TEXT,
    'Sincronizar estados de activación'::TEXT
  FROM tags t
  JOIN pets p ON p.id = t.pet_id
  WHERE (t.activated = true AND p.qr_activated = false)
     OR (t.activated = false AND p.qr_activated = true);
  
  -- 4. Tags con referencias a pets inexistentes
  RETURN QUERY
  SELECT 
    'invalid_reference'::TEXT,
    'tag'::TEXT,
    t.id,
    t.code,
    'Tag referencia mascota inexistente'::TEXT,
    'high'::TEXT,
    'Limpiar referencia o restaurar mascota'::TEXT
  FROM tags t
  WHERE t.pet_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM pets p 
    WHERE p.id = t.pet_id
  );
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para ejecutar limpieza completa de integridad
CREATE OR REPLACE FUNCTION full_integrity_cleanup()
RETURNS TABLE(
  cleanup_step TEXT,
  items_processed INTEGER,
  items_fixed INTEGER,
  details TEXT
) AS $$
DECLARE
  orphaned_tags_count INTEGER := 0;
  sync_actions_count INTEGER := 0;
  invalid_refs_count INTEGER := 0;
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Paso 1: Limpiar tags huérfanos
  SELECT COUNT(*) INTO orphaned_tags_count
  FROM cleanup_orphaned_tags()
  WHERE action_taken = 'deactivated_orphaned_tag';
  
  RETURN QUERY SELECT 
    'cleanup_orphaned_tags'::TEXT,
    orphaned_tags_count,
    orphaned_tags_count,
    CONCAT('Desactivados ', orphaned_tags_count, ' tags huérfanos')::TEXT;
  
  -- Paso 2: Sincronizar estados
  SELECT COUNT(*) INTO sync_actions_count
  FROM sync_tag_pet_states()
  WHERE action_taken IN ('activated_tag_for_active_pet', 'activated_pet_qr_for_active_tag');
  
  RETURN QUERY SELECT 
    'sync_tag_pet_states'::TEXT,
    sync_actions_count,
    sync_actions_count,
    CONCAT('Sincronizados ', sync_actions_count, ' estados inconsistentes')::TEXT;
  
  -- Paso 3: Limpiar referencias inválidas
  UPDATE tags 
  SET pet_id = NULL
  WHERE pet_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM pets p 
    WHERE p.id = tags.pet_id
  );
  
  GET DIAGNOSTICS invalid_refs_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    'cleanup_invalid_references'::TEXT,
    invalid_refs_count,
    invalid_refs_count,
    CONCAT('Limpiadas ', invalid_refs_count, ' referencias inválidas')::TEXT;
  
  -- Resumen final
  RETURN QUERY SELECT 
    'summary'::TEXT,
    (orphaned_tags_count + sync_actions_count + invalid_refs_count),
    (orphaned_tags_count + sync_actions_count + invalid_refs_count),
    'Limpieza completa de integridad finalizada'::TEXT;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear índices para mejorar performance de las consultas de integridad
CREATE INDEX IF NOT EXISTS idx_tags_activated_pet_id ON tags(activated, pet_id) WHERE activated = true;
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON pets(qr_activated) WHERE qr_activated = true;

-- Comentarios para documentación
COMMENT ON FUNCTION cleanup_orphaned_tags() IS 'Limpia tags activados que no tienen mascota asociada válida';
COMMENT ON FUNCTION sync_tag_pet_states() IS 'Sincroniza estados de activación entre tags y pets';
COMMENT ON FUNCTION get_detailed_integrity_report() IS 'Genera reporte detallado de problemas de integridad';
COMMENT ON FUNCTION full_integrity_cleanup() IS 'Ejecuta limpieza completa de todos los problemas de integridad';