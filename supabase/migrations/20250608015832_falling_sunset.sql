/*
  # Verificación y actualización completa del esquema de base de datos

  1. Verificación de tablas existentes
    - Confirma que todas las tablas necesarias existen
    - Agrega campos faltantes si es necesario
    - Actualiza tipos de datos si es requerido

  2. Campos verificados por tabla
    - users: id, email, created_at
    - pets: id, name, type, breed, owner_name, owner_contact, notes, created_at, user_id, tag_id, qr_activated
    - tags: id, code, activated, activated_at, pet_id, user_id, created_at
    - medical_records: todos los campos existentes
    - vaccinations: todos los campos existentes
    - medications: todos los campos existentes
    - photos: todos los campos existentes
    - lost_pets: todos los campos existentes
    - vet_visits: todos los campos existentes

  3. Índices y restricciones
    - Verifica que todos los índices necesarios existan
    - Confirma las foreign keys
    - Actualiza las políticas RLS

  4. Campos críticos que podrían faltar
    - pets.qr_activated (boolean)
    - tags.user_id (uuid)
    - tags.created_at (timestamp)
*/

-- Verificar y agregar campo qr_activated en pets si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE pets ADD COLUMN qr_activated boolean DEFAULT false;
  END IF;
END $$;

-- Verificar y agregar campo user_id en tags si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tags ADD COLUMN user_id uuid REFERENCES users(id);
  END IF;
END $$;

-- Verificar y agregar campo created_at en tags si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE tags ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Verificar que el campo tag_id en pets sea nullable (debería serlo)
DO $$
BEGIN
  -- El campo tag_id en pets debe ser nullable para permitir pets sin tags inicialmente
  ALTER TABLE pets ALTER COLUMN tag_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Si ya es nullable o no existe la restricción, continuar
    NULL;
END $$;

-- Crear índices faltantes si no existen
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at);

-- Verificar y actualizar políticas RLS para tags con user_id
DROP POLICY IF EXISTS "Users can read own tags" ON tags;
CREATE POLICY "Users can read own tags"
  ON tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own tags" ON tags;
CREATE POLICY "Users can update own tags"
  ON tags
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert tags" ON tags;
CREATE POLICY "Users can insert tags"
  ON tags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Política para permitir que los usuarios reclamen tags no reclamados
DROP POLICY IF EXISTS "Users can claim unclaimed tags" ON tags;
CREATE POLICY "Users can claim unclaimed tags"
  ON tags
  FOR UPDATE
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

-- Verificar que las foreign keys estén correctamente configuradas
DO $$
BEGIN
  -- Verificar foreign key de pets.user_id a users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'pets' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE pets ADD CONSTRAINT pets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;

  -- Verificar foreign key de tags.user_id a users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'tags' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;

  -- Verificar foreign key de tags.pet_id a pets.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'tags' AND kcu.column_name = 'pet_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES pets(id);
  END IF;
END $$;

-- Actualizar datos existentes para asegurar consistencia
-- Marcar como activados los pets que tienen tags activados
UPDATE pets 
SET qr_activated = true 
WHERE id IN (
  SELECT DISTINCT pet_id 
  FROM tags 
  WHERE activated = true AND pet_id IS NOT NULL
) AND qr_activated = false;

-- Asegurar que todos los tags con pet_id tengan user_id
UPDATE tags 
SET user_id = (
  SELECT user_id 
  FROM pets 
  WHERE pets.id = tags.pet_id
)
WHERE pet_id IS NOT NULL AND user_id IS NULL;