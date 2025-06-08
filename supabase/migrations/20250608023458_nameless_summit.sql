/*
  # Corrección completa del esquema de base de datos

  1. Verificación y corrección de estructura de tablas
  2. Corrección de relaciones entre tablas
  3. Actualización de políticas RLS
  4. Corrección de índices y constraints
*/

-- Primero, verificar y corregir la tabla tags
DO $$
BEGIN
  -- Verificar si la columna user_id existe en tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tags ADD COLUMN user_id uuid;
  END IF;

  -- Verificar si la columna created_at existe en tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE tags ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Corregir la tabla pets para asegurar que qr_activated existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE pets ADD COLUMN qr_activated boolean DEFAULT false;
  END IF;
END $$;

-- Eliminar foreign key problemática si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_pet_tag' AND table_name = 'pets'
  ) THEN
    ALTER TABLE pets DROP CONSTRAINT fk_pet_tag;
  END IF;
END $$;

-- Hacer tag_id nullable en pets
ALTER TABLE pets ALTER COLUMN tag_id DROP NOT NULL;

-- Agregar foreign keys correctas
DO $$
BEGIN
  -- Foreign key de tags.user_id a users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'tags' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Foreign key de tags.pet_id a pets.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'tags' AND kcu.column_name = 'pet_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL;
  END IF;

  -- Foreign key de pets.user_id a users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'pets' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE pets ADD CONSTRAINT pets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Crear índices necesarios
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_pets_tag_id ON pets(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at);

-- Actualizar políticas RLS para tags
DROP POLICY IF EXISTS "Users can read own tags" ON tags;
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert tags" ON tags;
DROP POLICY IF EXISTS "Users can claim unclaimed tags" ON tags;
DROP POLICY IF EXISTS "Users can activate tags" ON tags;

-- Políticas para tags
CREATE POLICY "Users can read own tags"
  ON tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own tags"
  ON tags
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert tags"
  ON tags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can claim unclaimed tags"
  ON tags
  FOR UPDATE
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can activate tags"
  ON tags
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pets 
      WHERE pets.id = tags.pet_id 
      AND pets.user_id = auth.uid()
    )
  );

-- Política para permitir lectura pública de tags activados
CREATE POLICY "Anyone can read activated tags"
  ON tags
  FOR SELECT
  TO anon
  USING (activated = true);

-- Actualizar políticas RLS para pets
DROP POLICY IF EXISTS "Users can read own pets" ON pets;
DROP POLICY IF EXISTS "Users can update own pets" ON pets;
DROP POLICY IF EXISTS "Users can insert own pets" ON pets;

CREATE POLICY "Users can read own pets"
  ON pets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own pets"
  ON pets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own pets"
  ON pets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Limpiar datos inconsistentes
UPDATE pets 
SET qr_activated = true 
WHERE id IN (
  SELECT DISTINCT pet_id 
  FROM tags 
  WHERE activated = true AND pet_id IS NOT NULL
) AND (qr_activated = false OR qr_activated IS NULL);

-- Asegurar consistencia en tags
UPDATE tags 
SET user_id = (
  SELECT user_id 
  FROM pets 
  WHERE pets.id = tags.pet_id
)
WHERE pet_id IS NOT NULL AND user_id IS NULL;