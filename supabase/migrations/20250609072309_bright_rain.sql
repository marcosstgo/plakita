-- Crear tags de prueba para testing
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar que la tabla tags existe y tiene las columnas correctas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tags') THEN
    RAISE EXCEPTION 'Tabla tags no existe. Ejecuta primero las migraciones anteriores.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'user_id') THEN
    RAISE EXCEPTION 'Columna user_id no existe en tabla tags. Ejecuta las migraciones anteriores.';
  END IF;
END $$;

-- 2. Limpiar tags de prueba existentes (por si acaso)
DELETE FROM tags WHERE code LIKE 'PLK-TEST%' OR code LIKE 'PLK-DEMO%' OR code IN ('PLK-TR0DFY', 'PLK-970MPY');

-- 3. Crear tags de prueba específicos
INSERT INTO tags (code, activated, user_id, created_at) VALUES
  ('PLK-TR0DFY', false, null, now()),
  ('PLK-970MPY', false, null, now()),
  ('PLK-TEST01', false, null, now()),
  ('PLK-TEST02', false, null, now()),
  ('PLK-TEST03', false, null, now()),
  ('PLK-TEST04', false, null, now()),
  ('PLK-TEST05', false, null, now()),
  ('PLK-DEMO01', false, null, now()),
  ('PLK-DEMO02', false, null, now()),
  ('PLK-DEMO03', false, null, now()),
  ('PLK-SAMPLE1', false, null, now()),
  ('PLK-SAMPLE2', false, null, now()),
  ('PLK-SAMPLE3', false, null, now());

-- 4. Verificar que se crearon correctamente
DO $$
DECLARE
  tag_count integer;
  sample_tags text[];
BEGIN
  SELECT COUNT(*) INTO tag_count FROM tags;
  
  SELECT array_agg(code ORDER BY code) INTO sample_tags 
  FROM tags 
  WHERE code IN ('PLK-TR0DFY', 'PLK-970MPY', 'PLK-TEST01', 'PLK-DEMO01')
  LIMIT 4;
  
  RAISE NOTICE '🎉 TAGS DE PRUEBA CREADOS EXITOSAMENTE';
  RAISE NOTICE '📊 Total de tags en base de datos: %', tag_count;
  RAISE NOTICE '✅ Algunos códigos disponibles: %', array_to_string(sample_tags, ', ');
  RAISE NOTICE '';
  RAISE NOTICE '🚀 CÓDIGOS PARA PROBAR:';
  RAISE NOTICE '   - PLK-TR0DFY (el que estabas buscando)';
  RAISE NOTICE '   - PLK-970MPY (el que aparece en tu pantalla)';
  RAISE NOTICE '   - PLK-TEST01, PLK-TEST02, etc.';
  RAISE NOTICE '   - PLK-DEMO01, PLK-DEMO02, etc.';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Ahora ve a la aplicación y prueba con cualquiera de estos códigos.';
END $$;