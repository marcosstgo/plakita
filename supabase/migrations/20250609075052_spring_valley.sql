-- Corregir sincronización entre tags y mascotas
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar el estado actual de PLK-SAMPLE3
DO $$
DECLARE
  tag_info record;
  pet_info record;
BEGIN
  -- Buscar el tag PLK-SAMPLE3
  SELECT * INTO tag_info FROM tags WHERE code = 'PLK-SAMPLE3';
  
  IF tag_info.id IS NOT NULL THEN
    RAISE NOTICE 'Tag PLK-SAMPLE3 encontrado:';
    RAISE NOTICE '  - ID: %', tag_info.id;
    RAISE NOTICE '  - Activado: %', tag_info.activated;
    RAISE NOTICE '  - Pet ID: %', tag_info.pet_id;
    RAISE NOTICE '  - User ID: %', tag_info.user_id;
    
    -- Buscar mascota asociada si existe
    IF tag_info.pet_id IS NOT NULL THEN
      SELECT * INTO pet_info FROM pets WHERE id = tag_info.pet_id;
      IF pet_info.id IS NOT NULL THEN
        RAISE NOTICE 'Mascota asociada encontrada:';
        RAISE NOTICE '  - Nombre: %', pet_info.name;
        RAISE NOTICE '  - Dueño: %', pet_info.owner_name;
        RAISE NOTICE '  - QR Activado: %', pet_info.qr_activated;
      ELSE
        RAISE NOTICE 'PROBLEMA: Pet ID % no existe en tabla pets', tag_info.pet_id;
      END IF;
    ELSE
      RAISE NOTICE 'PROBLEMA: Tag activado pero sin pet_id asignado';
    END IF;
  ELSE
    RAISE NOTICE 'Tag PLK-SAMPLE3 no encontrado';
  END IF;
END $$;

-- 2. Corregir tags activados sin mascota asociada
UPDATE tags 
SET activated = false, 
    activated_at = null,
    user_id = null
WHERE activated = true 
  AND (pet_id IS NULL OR pet_id NOT IN (SELECT id FROM pets));

-- 3. Corregir mascotas con qr_activated pero sin tag asociado
UPDATE pets 
SET qr_activated = false
WHERE qr_activated = true 
  AND id NOT IN (
    SELECT pet_id FROM tags 
    WHERE pet_id IS NOT NULL AND activated = true
  );

-- 4. Sincronizar bidireccional: pets.tag_id debe coincidir con tags.pet_id
DO $$
DECLARE
  sync_count integer := 0;
BEGIN
  -- Actualizar pets.tag_id basado en tags.pet_id
  UPDATE pets 
  SET tag_id = t.id
  FROM tags t
  WHERE t.pet_id = pets.id 
    AND (pets.tag_id IS NULL OR pets.tag_id != t.id);
  
  GET DIAGNOSTICS sync_count = ROW_COUNT;
  RAISE NOTICE 'Sincronizados % registros pets.tag_id', sync_count;
  
  -- Actualizar tags.pet_id basado en pets.tag_id
  UPDATE tags 
  SET pet_id = p.id
  FROM pets p
  WHERE p.tag_id = tags.id 
    AND (tags.pet_id IS NULL OR tags.pet_id != p.id);
  
  GET DIAGNOSTICS sync_count = ROW_COUNT;
  RAISE NOTICE 'Sincronizados % registros tags.pet_id', sync_count;
END $$;

-- 5. Crear función para mantener sincronización automática
CREATE OR REPLACE FUNCTION sync_tag_pet_relationship()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se actualiza pets.tag_id, actualizar tags.pet_id
  IF TG_TABLE_NAME = 'pets' THEN
    IF NEW.tag_id IS NOT NULL AND NEW.tag_id != OLD.tag_id THEN
      -- Limpiar relación anterior
      IF OLD.tag_id IS NOT NULL THEN
        UPDATE tags SET pet_id = NULL WHERE id = OLD.tag_id;
      END IF;
      
      -- Establecer nueva relación
      UPDATE tags SET pet_id = NEW.id WHERE id = NEW.tag_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Si se actualiza tags.pet_id, actualizar pets.tag_id
  IF TG_TABLE_NAME = 'tags' THEN
    IF NEW.pet_id IS NOT NULL AND NEW.pet_id != OLD.pet_id THEN
      -- Limpiar relación anterior
      IF OLD.pet_id IS NOT NULL THEN
        UPDATE pets SET tag_id = NULL WHERE id = OLD.pet_id;
      END IF;
      
      -- Establecer nueva relación
      UPDATE pets SET tag_id = NEW.id WHERE id = NEW.pet_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear triggers para mantener sincronización
DROP TRIGGER IF EXISTS sync_pets_tag_relationship ON pets;
CREATE TRIGGER sync_pets_tag_relationship
  AFTER UPDATE OF tag_id ON pets
  FOR EACH ROW
  EXECUTE FUNCTION sync_tag_pet_relationship();

DROP TRIGGER IF EXISTS sync_tags_pet_relationship ON tags;
CREATE TRIGGER sync_tags_pet_relationship
  AFTER UPDATE OF pet_id ON tags
  FOR EACH ROW
  EXECUTE FUNCTION sync_tag_pet_relationship();

-- 7. Crear función para validar integridad de datos
CREATE OR REPLACE FUNCTION validate_tag_pet_integrity()
RETURNS TABLE(
  issue_type text,
  tag_code text,
  tag_id uuid,
  pet_id uuid,
  pet_name text,
  description text
) AS $$
BEGIN
  -- Tags activados sin mascota
  RETURN QUERY
  SELECT 
    'tag_activated_no_pet'::text,
    t.code,
    t.id,
    t.pet_id,
    null::text,
    'Tag activado pero sin mascota asociada'::text
  FROM tags t
  WHERE t.activated = true AND (t.pet_id IS NULL OR t.pet_id NOT IN (SELECT id FROM pets));
  
  -- Mascotas con QR activado sin tag
  RETURN QUERY
  SELECT 
    'pet_qr_activated_no_tag'::text,
    null::text,
    p.tag_id,
    p.id,
    p.name,
    'Mascota con QR activado pero sin tag válido'::text
  FROM pets p
  WHERE p.qr_activated = true AND (p.tag_id IS NULL OR p.tag_id NOT IN (SELECT id FROM tags WHERE activated = true));
  
  -- Relaciones desincronizadas
  RETURN QUERY
  SELECT 
    'relationship_mismatch'::text,
    t.code,
    t.id,
    p.id,
    p.name,
    'Relación tag-pet desincronizada'::text
  FROM tags t
  JOIN pets p ON t.pet_id = p.id
  WHERE p.tag_id != t.id;
  
END;
$$ LANGUAGE plpgsql;

-- 8. Ejecutar validación y mostrar resultados
DO $$
DECLARE
  issue record;
  issue_count integer := 0;
BEGIN
  RAISE NOTICE '🔍 VALIDANDO INTEGRIDAD DE DATOS...';
  
  FOR issue IN SELECT * FROM validate_tag_pet_integrity() LOOP
    issue_count := issue_count + 1;
    RAISE NOTICE 'PROBLEMA %: % - Tag: % (%) - Pet: % (%)', 
      issue_count, 
      issue.issue_type, 
      COALESCE(issue.tag_code, 'N/A'),
      COALESCE(issue.tag_id::text, 'N/A'),
      COALESCE(issue.pet_name, 'N/A'),
      COALESCE(issue.pet_id::text, 'N/A');
  END LOOP;
  
  IF issue_count = 0 THEN
    RAISE NOTICE '✅ No se encontraron problemas de integridad';
  ELSE
    RAISE NOTICE '⚠️ Se encontraron % problemas que fueron corregidos', issue_count;
  END IF;
END $$;

-- 9. Verificar estado final de PLK-SAMPLE3
DO $$
DECLARE
  tag_info record;
  pet_info record;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 ESTADO FINAL DE PLK-SAMPLE3:';
  
  SELECT * INTO tag_info FROM tags WHERE code = 'PLK-SAMPLE3';
  
  IF tag_info.id IS NOT NULL THEN
    RAISE NOTICE '  - Activado: %', tag_info.activated;
    RAISE NOTICE '  - Pet ID: %', COALESCE(tag_info.pet_id::text, 'NULL');
    RAISE NOTICE '  - User ID: %', COALESCE(tag_info.user_id::text, 'NULL');
    
    IF tag_info.pet_id IS NOT NULL THEN
      SELECT * INTO pet_info FROM pets WHERE id = tag_info.pet_id;
      IF pet_info.id IS NOT NULL THEN
        RAISE NOTICE '  - Mascota: % (QR: %)', pet_info.name, pet_info.qr_activated;
        RAISE NOTICE '  - Dueño: %', pet_info.owner_name;
      END IF;
    END IF;
  ELSE
    RAISE NOTICE '  - Tag no encontrado';
  END IF;
END $$;

-- 10. Mostrar resumen de todos los tags
DO $$
DECLARE
  total_tags integer;
  activated_tags integer;
  tags_with_pets integer;
  orphaned_tags integer;
BEGIN
  SELECT COUNT(*) INTO total_tags FROM tags;
  SELECT COUNT(*) INTO activated_tags FROM tags WHERE activated = true;
  SELECT COUNT(*) INTO tags_with_pets FROM tags WHERE activated = true AND pet_id IS NOT NULL;
  SELECT COUNT(*) INTO orphaned_tags FROM tags WHERE activated = true AND pet_id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '📈 RESUMEN FINAL:';
  RAISE NOTICE '  - Total tags: %', total_tags;
  RAISE NOTICE '  - Tags activados: %', activated_tags;
  RAISE NOTICE '  - Tags con mascota: %', tags_with_pets;
  RAISE NOTICE '  - Tags huérfanos: %', orphaned_tags;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migración completada. La sincronización está corregida.';
END $$;