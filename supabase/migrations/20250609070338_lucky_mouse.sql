/*
  # Migración crítica para solucionar problemas de esquema

  Esta migración soluciona los problemas identificados:
  1. Asegura que todas las columnas críticas existan
  2. Corrige las políticas RLS
  3. Crea índices necesarios
  4. Verifica la integridad del esquema
*/

-- 1. Verificar y crear tabla tags con todas las columnas necesarias
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  activated boolean DEFAULT false,
  activated_at timestamptz,
  pet_id uuid REFERENCES pets(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Agregar columnas faltantes a tags si no existen
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
  END IF;
END $$;

-- 3. Agregar columnas faltantes a pets
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
  END IF;
END $$;

-- 4. Agregar columna phone a users
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
  END IF;
END $$;

-- 5. Crear todos los índices necesarios
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON tags(code);
CREATE UNIQUE INDEX IF NOT EXISTS tags_code_key ON tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_activated ON tags(activated);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_pets_owner_phone ON pets(owner_phone) WHERE owner_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- 6. Habilitar RLS en todas las tablas
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 7. Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Users can read own tags" ON tags;
DROP POLICY IF EXISTS "Users can claim and update tags" ON tags;
DROP POLICY IF EXISTS "Anyone can read activated tags" ON tags;
DROP POLICY IF EXISTS "Admin can create unassigned tags" ON tags;
DROP POLICY IF EXISTS "Admin can manage all tags" ON tags;

-- 8. Crear políticas RLS para tags
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

-- 9. Crear vista active_tags_with_pets
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

-- 10. Actualizar timestamps para tags existentes
UPDATE tags 
SET created_at = COALESCE(created_at, now())
WHERE created_at IS NULL;

-- 11. Crear el tag PLK-TR0DFY si no existe
INSERT INTO tags (code, activated, user_id, created_at)
VALUES ('PLK-TR0DFY', false, null, now())
ON CONFLICT (code) DO NOTHING;

-- 12. Crear algunos tags de prueba adicionales
INSERT INTO tags (code, activated, user_id, created_at) VALUES
  ('PLK-TEST01', false, null, now()),
  ('PLK-TEST02', false, null, now()),
  ('PLK-TEST03', false, null, now()),
  ('PLK-TEST04', false, null, now()),
  ('PLK-TEST05', false, null, now())
ON CONFLICT (code) DO NOTHING;

-- 13. Agregar comentarios para documentación
COMMENT ON COLUMN tags.user_id IS 'Usuario que posee este tag (puede ser NULL si no está asignado)';
COMMENT ON COLUMN tags.created_at IS 'Fecha de creación del tag';
COMMENT ON COLUMN tags.activated_at IS 'Fecha de activación del tag';
COMMENT ON COLUMN pets.owner_phone IS 'Teléfono del dueño de la mascota (separado del email)';
COMMENT ON COLUMN users.phone IS 'Número de teléfono del usuario (opcional)';

-- 14. Verificación final
DO $$
DECLARE
  tag_count integer;
  missing_columns text[] := ARRAY[]::text[];
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
  
  -- Contar tags
  SELECT COUNT(*) INTO tag_count FROM tags;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Faltan columnas críticas: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE 'Migración completada exitosamente. Columnas verificadas. Tags en DB: %', tag_count;
  END IF;
END $$;