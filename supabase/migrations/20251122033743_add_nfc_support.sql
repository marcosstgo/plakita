/*
  # Agregar Soporte NFC a Plakitas
  
  1. Cambios en Tabla `tags`
    - Agregar columna `has_nfc` (boolean) - indica si el tag físico tiene chip NFC
    - Agregar columna `nfc_last_written` (timestamptz) - última vez que se escribió el chip
    - Agregar columna `nfc_uid` (text) - UID único del chip NFC (opcional)
    - Default: has_nfc = false (compatibilidad con tags QR existentes)
  
  2. Índices
    - Índice en `has_nfc` para queries de tags con NFC
  
  3. Funciones Auxiliares
    - mark_tag_as_nfc() - Marcar un tag como NFC después de escribirlo
    - get_nfc_statistics() - Obtener estadísticas de adopción NFC
  
  4. Notas
    - Esta migración es segura: solo agrega columnas nuevas
    - No afecta funcionalidad existente
    - Tags existentes seguirán funcionando como QR-only
*/

-- Agregar soporte NFC a la tabla tags
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS has_nfc boolean DEFAULT false;

ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS nfc_last_written timestamptz;

ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS nfc_uid text;

-- Agregar índice para búsquedas eficientes de tags NFC
CREATE INDEX IF NOT EXISTS idx_tags_has_nfc 
ON tags(has_nfc) 
WHERE has_nfc = true;

-- Comentarios para documentación
COMMENT ON COLUMN tags.has_nfc IS 'Indica si esta Plakita tiene un chip NFC físico además del QR';
COMMENT ON COLUMN tags.nfc_last_written IS 'Timestamp de la última vez que se escribió el chip NFC';
COMMENT ON COLUMN tags.nfc_uid IS 'UID único del chip NFC (si está disponible)';

-- Función helper para marcar un tag como NFC
CREATE OR REPLACE FUNCTION mark_tag_as_nfc(
  tag_id_param uuid,
  nfc_uid_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_tag tags%ROWTYPE;
BEGIN
  -- Actualizar el tag
  UPDATE tags
  SET 
    has_nfc = true,
    nfc_last_written = now(),
    nfc_uid = COALESCE(nfc_uid_param, nfc_uid)
  WHERE id = tag_id_param
  RETURNING * INTO result_tag;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Tag no encontrado'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'data', row_to_json(result_tag)
  );
END;
$$;

-- Función para obtener estadísticas de NFC
CREATE OR REPLACE FUNCTION get_nfc_statistics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_nfc integer;
  active_nfc integer;
  recent_writes integer;
  total_tags integer;
BEGIN
  -- Total de tags con NFC
  SELECT COUNT(*) INTO total_nfc
  FROM tags
  WHERE has_nfc = true;
  
  -- Tags NFC activados
  SELECT COUNT(*) INTO active_nfc
  FROM tags
  WHERE has_nfc = true AND activated = true;
  
  -- Escrituras NFC en últimos 30 días
  SELECT COUNT(*) INTO recent_writes
  FROM tags
  WHERE has_nfc = true 
    AND nfc_last_written > now() - interval '30 days';
  
  -- Total de tags
  SELECT COUNT(*) INTO total_tags
  FROM tags;
  
  RETURN json_build_object(
    'total_nfc_tags', total_nfc,
    'active_nfc_tags', active_nfc,
    'recent_nfc_writes', recent_writes,
    'nfc_adoption_rate', 
      CASE 
        WHEN total_tags > 0 
        THEN ROUND((total_nfc::numeric / total_tags::numeric) * 100, 2)
        ELSE 0
      END
  );
END;
$$;