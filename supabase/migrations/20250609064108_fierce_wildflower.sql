-- 1. Agregar columna user_id a tags si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tags ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Agregar columna created_at a tags si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE tags ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 3. Agregar columna activated_at a tags si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'activated_at'
  ) THEN
    ALTER TABLE tags ADD COLUMN activated_at timestamptz;
  END IF;
END $$;

-- 4. Crear índices necesarios
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON tags(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_code_unique ON tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_activated ON tags(activated);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON tags(pet_id);

-- 5. Asegurar que RLS está habilitado en tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- 6. Crear/actualizar políticas RLS para tags
DROP POLICY IF EXISTS "Users can read own tags" ON tags;
CREATE POLICY "Users can read own tags"
  ON tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can claim and update tags" ON tags;
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

DROP POLICY IF EXISTS "Anyone can read activated tags" ON tags;
CREATE POLICY "Anyone can read activated tags"
  ON tags
  FOR SELECT
  TO anon
  USING (activated = true);

DROP POLICY IF EXISTS "Admin can create unassigned tags" ON tags;
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

DROP POLICY IF EXISTS "Admin can manage all tags" ON tags;
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

-- 7. Verificar que la tabla pets tiene qr_activated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE pets ADD COLUMN qr_activated boolean DEFAULT false;
  END IF;
END $$;

-- 8. Crear índice para qr_activated en pets
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON pets(qr_activated);

-- 9. Verificar foreign key entre pets y tags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pets_tag_id_fkey'
  ) THEN
    -- Primero agregar la columna tag_id si no existe
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'pets' AND column_name = 'tag_id'
    ) THEN
      ALTER TABLE pets ADD COLUMN tag_id uuid;
    END IF;
    
    -- Crear foreign key
    ALTER TABLE pets ADD CONSTRAINT pets_tag_id_fkey 
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE SET NULL;
    
    -- Crear índice
    CREATE INDEX IF NOT EXISTS idx_pets_tag_id ON pets(tag_id);
  END IF;
END $$;

-- 10. Crear vista active_tags_with_pets si no existe
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