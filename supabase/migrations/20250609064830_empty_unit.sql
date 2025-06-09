/*
  # Migración final para corregir esquema de tags

  Esta migración asegura que la tabla tags tenga todas las columnas necesarias
  y las políticas RLS correctas para el funcionamiento completo del sistema.

  ## Cambios principales:
  1. Agregar columna user_id a tags si no existe
  2. Agregar columna created_at a tags si no existe  
  3. Agregar columna activated_at a tags si no existe
  4. Crear todos los índices necesarios
  5. Configurar políticas RLS correctas
  6. Verificar columnas en pets (qr_activated, owner_phone)
  7. Crear vista active_tags_with_pets

  ## Seguridad:
  - Habilitar RLS en todas las tablas
  - Políticas para usuarios regulares y admin
  - Acceso público solo a tags activados
*/

-- 1. Agregar columna user_id a tags si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tags ADD COLUMN user_id uuid;
    
    -- Agregar foreign key constraint
    ALTER TABLE tags ADD CONSTRAINT tags_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
      
    RAISE NOTICE 'Columna user_id agregada a tabla tags';
  ELSE
    RAISE NOTICE 'Columna user_id ya existe en tabla tags';
  END IF;
END $$;

-- 2. Agregar columna created_at a tags si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE tags ADD COLUMN created_at timestamptz DEFAULT now();
    RAISE NOTICE 'Columna created_at agregada a tabla tags';
  ELSE
    RAISE NOTICE 'Columna created_at ya existe en tabla tags';
  END IF;
END $$;

-- 3. Agregar columna activated_at a tags si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'activated_at'
  ) THEN
    ALTER TABLE tags ADD COLUMN activated_at timestamptz;
    RAISE NOTICE 'Columna activated_at agregada a tabla tags';
  ELSE
    RAISE NOTICE 'Columna activated_at ya existe en tabla tags';
  END IF;
END $$;

-- 4. Verificar y agregar columna owner_phone a pets si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'pets' 
    AND column_name = 'owner_phone'
  ) THEN
    ALTER TABLE pets ADD COLUMN owner_phone text;
    RAISE NOTICE 'Columna owner_phone agregada a tabla pets';
  ELSE
    RAISE NOTICE 'Columna owner_phone ya existe en tabla pets';
  END IF;
END $$;

-- 5. Verificar y agregar columna phone a users si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone text;
    RAISE NOTICE 'Columna phone agregada a tabla users';
  ELSE
    RAISE NOTICE 'Columna phone ya existe en tabla users';
  END IF;
END $$;

-- 6. Crear todos los índices necesarios
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON tags(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_code_unique ON tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_activated ON tags(activated);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_pets_owner_phone ON pets(owner_phone) WHERE owner_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- 7. Asegurar que RLS está habilitado
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 8. Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Users can read own tags" ON tags;
DROP POLICY IF EXISTS "Users can claim and update tags" ON tags;
DROP POLICY IF EXISTS "Anyone can read activated tags" ON tags;
DROP POLICY IF EXISTS "Admin can create unassigned tags" ON tags;
DROP POLICY IF EXISTS "Admin can manage all tags" ON tags;

-- 9. Crear políticas RLS para tags
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

-- 10. Crear vista active_tags_with_pets
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

-- 11. Actualizar timestamps para tags existentes que no tengan created_at
UPDATE tags 
SET created_at = now() 
WHERE created_at IS NULL;

-- 12. Agregar comentarios para documentación
COMMENT ON COLUMN tags.user_id IS 'Usuario que posee este tag (puede ser NULL si no está asignado)';
COMMENT ON COLUMN tags.created_at IS 'Fecha de creación del tag';
COMMENT ON COLUMN tags.activated_at IS 'Fecha de activación del tag';
COMMENT ON COLUMN pets.owner_phone IS 'Teléfono del dueño de la mascota (separado del email)';
COMMENT ON COLUMN users.phone IS 'Número de teléfono del usuario (opcional)';

-- 13. Verificar que todo está correcto
DO $$
DECLARE
  missing_columns text[] := ARRAY[]::text[];
BEGIN
  -- Verificar columnas críticas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'user_id') THEN
    missing_columns := array_append(missing_columns, 'tags.user_id');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'created_at') THEN
    missing_columns := array_append(missing_columns, 'tags.created_at');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'owner_phone') THEN
    missing_columns := array_append(missing_columns, 'pets.owner_phone');
  END IF;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Faltan columnas críticas: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE 'Migración completada exitosamente. Todas las columnas críticas están presentes.';
  END IF;
END $$;