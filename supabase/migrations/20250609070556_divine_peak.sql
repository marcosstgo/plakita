/*
  # Migración Final - Corrección Completa del Esquema

  1. Verificación y corrección de todas las columnas faltantes
  2. Creación de tags de prueba incluyendo PLK-TR0DFY
  3. Configuración completa de políticas RLS
  4. Verificación final del esquema

  Esta migración es segura de ejecutar múltiples veces.
*/

-- 1. Verificar y agregar columnas faltantes a tags
DO $$
BEGIN
  -- user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tags ADD COLUMN user_id uuid;
    ALTER TABLE tags ADD CONSTRAINT tags_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Columna user_id agregada a tags';
  ELSE
    RAISE NOTICE 'Columna user_id ya existe en tags';
  END IF;

  -- created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE tags ADD COLUMN created_at timestamptz DEFAULT now();
    RAISE NOTICE 'Columna created_at agregada a tags';
  ELSE
    RAISE NOTICE 'Columna created_at ya existe en tags';
  END IF;

  -- activated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'activated_at'
  ) THEN
    ALTER TABLE tags ADD COLUMN activated_at timestamptz;
    RAISE NOTICE 'Columna activated_at agregada a tags';
  ELSE
    RAISE NOTICE 'Columna activated_at ya existe en tags';
  END IF;
END $$;

-- 2. Verificar y agregar columnas faltantes a pets
DO $$
BEGIN
  -- qr_activated
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'pets' 
    AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE pets ADD COLUMN qr_activated boolean DEFAULT false;
    RAISE NOTICE 'Columna qr_activated agregada a pets';
  ELSE
    RAISE NOTICE 'Columna qr_activated ya existe en pets';
  END IF;

  -- owner_phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'pets' 
    AND column_name = 'owner_phone'
  ) THEN
    ALTER TABLE pets ADD COLUMN owner_phone text;
    RAISE NOTICE 'Columna owner_phone agregada a pets';
  ELSE
    RAISE NOTICE 'Columna owner_phone ya existe en pets';
  END IF;
END $$;

-- 3. Verificar y agregar columna phone a users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone text;
    RAISE NOTICE 'Columna phone agregada a users';
  ELSE
    RAISE NOTICE 'Columna phone ya existe en users';
  END IF;
END $$;

-- 4. Crear todos los índices necesarios
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON tags(code);
CREATE UNIQUE INDEX IF NOT EXISTS tags_code_key ON tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_activated ON tags(activated);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_pets_tag_id ON pets(tag_id);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_owner_phone ON pets(owner_phone) WHERE owner_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 5. Habilitar RLS en todas las tablas
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 6. Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Users can read own tags" ON tags;
DROP POLICY IF EXISTS "Users can claim and update tags" ON tags;
DROP POLICY IF EXISTS "Anyone can read activated tags" ON tags;
DROP POLICY IF EXISTS "Admin can create unassigned tags" ON tags;
DROP POLICY IF EXISTS "Admin can manage all tags" ON tags;

-- 7. Crear políticas RLS para tags
CREATE POLICY "Users can read own tags"
  ON tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can claim and update tags"
  ON tags
  FOR UPDATE
  TO authenticated
  USING (
    user_id IS NULL OR 
    user_id = auth.uid() OR 
    (auth.uid()::text = (
      SELECT users.id::text 
      FROM users 
      WHERE users.email = 'santiago.marcos@gmail.com'
    ))
  );

CREATE POLICY "Anyone can read activated tags"
  ON tags
  FOR SELECT
  TO anon
  USING (activated = true);

CREATE POLICY "Admin can create unassigned tags"
  ON tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id IS NULL AND (auth.uid()::text = (
      SELECT users.id::text 
      FROM users 
      WHERE users.email = 'santiago.marcos@gmail.com'
    ))) OR 
    user_id = auth.uid()
  );

CREATE POLICY "Admin can manage all tags"
  ON tags
  FOR ALL
  TO authenticated
  USING (
    auth.uid()::text = (
      SELECT users.id::text 
      FROM users 
      WHERE users.email = 'santiago.marcos@gmail.com'
    )
  )
  WITH CHECK (
    auth.uid()::text = (
      SELECT users.id::text 
      FROM users 
      WHERE users.email = 'santiago.marcos@gmail.com'
    )
  );

-- 8. Crear vista active_tags_with_pets
CREATE OR REPLACE VIEW active_tags_with_pets AS
SELECT 
  t.id as tag_id,
  t.code,
  t.activated,
  t.user_id,
  t.pet_id,
  p.name as pet_name,
  p.type as pet_type,
  p.breed as pet_breed,
  p.qr_activated
FROM tags t
LEFT JOIN pets p ON t.pet_id = p.id
WHERE t.activated = true;

-- 9. Actualizar timestamps para tags existentes
UPDATE tags 
SET created_at = COALESCE(created_at, now())
WHERE created_at IS NULL;

-- 10. Crear tags de prueba específicos (incluyendo PLK-TR0DFY)
INSERT INTO tags (code, activated, user_id, created_at) VALUES
  ('PLK-TR0DFY', false, null, now()),
  ('PLK-TEST01', false, null, now()),
  ('PLK-TEST02', false, null, now()),
  ('PLK-TEST03', false, null, now()),
  ('PLK-TEST04', false, null, now()),
  ('PLK-TEST05', false, null, now())
ON CONFLICT (code) DO NOTHING;

-- 11. Agregar comentarios para documentación
COMMENT ON COLUMN tags.user_id IS 'Usuario que posee este tag (puede ser NULL si no está asignado)';
COMMENT ON COLUMN tags.created_at IS 'Fecha de creación del tag';
COMMENT ON COLUMN tags.activated_at IS 'Fecha de activación del tag';
COMMENT ON COLUMN pets.owner_phone IS 'Teléfono del dueño de la mascota (separado del email)';
COMMENT ON COLUMN users.phone IS 'Número de teléfono del usuario (opcional)';

-- 12. Verificación final y reporte
DO $$
DECLARE
  tag_count integer;
  user_count integer;
  pet_count integer;
  missing_columns text[] := ARRAY[]::text[];
  plk_tr0dfy_exists boolean := false;
BEGIN
  -- Verificar columnas críticas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'user_id') THEN
    missing_columns := array_append(missing_columns, 'tags.user_id');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'created_at') THEN
    missing_columns := array_append(missing_columns, 'tags.created_at');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'qr_activated') THEN
    missing_columns := array_append(missing_columns, 'pets.qr_activated');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'owner_phone') THEN
    missing_columns := array_append(missing_columns, 'pets.owner_phone');
  END IF;
  
  -- Contar registros
  SELECT COUNT(*) INTO tag_count FROM tags;
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO pet_count FROM pets;
  
  -- Verificar si PLK-TR0DFY existe
  SELECT EXISTS(SELECT 1 FROM tags WHERE code = 'PLK-TR0DFY') INTO plk_tr0dfy_exists;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Faltan columnas críticas: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '📊 Estadísticas:';
    RAISE NOTICE '   - Tags en DB: %', tag_count;
    RAISE NOTICE '   - Usuarios en DB: %', user_count;
    RAISE NOTICE '   - Mascotas en DB: %', pet_count;
    RAISE NOTICE '   - PLK-TR0DFY existe: %', plk_tr0dfy_exists;
    RAISE NOTICE '🎯 Ahora puedes probar con PLK-TR0DFY o cualquier PLK-TEST0X';
  END IF;
END $$;