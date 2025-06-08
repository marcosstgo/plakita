/*
  # Fix database schema and create user synchronization

  1. Schema Updates
    - Add missing columns to tags and pets tables
    - Fix foreign key constraints
    - Create proper indexes

  2. User Synchronization
    - Create public.users table as replica of auth.users
    - Set up automatic sync with triggers
    - Enable safe access to user data

  3. Security
    - Enable RLS on all tables
    - Create comprehensive policies
    - Ensure data consistency
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

-- Crear tabla public.users como réplica de auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS en public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

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
  -- Foreign key de tags.user_id a public.users.id (no auth.users)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'tags' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  -- Foreign key de tags.pet_id a pets.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'tags' AND kcu.column_name = 'pet_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL;
  END IF;

  -- Foreign key de pets.user_id a public.users.id (no auth.users)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'pets' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE pets ADD CONSTRAINT pets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
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
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Limpiar políticas existentes antes de crear nuevas
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Limpiar políticas de tags
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'tags'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON tags';
    END LOOP;
    
    -- Limpiar políticas de pets
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'pets'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON pets';
    END LOOP;
END $$;

-- Políticas para public.users
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

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

CREATE POLICY "Public can read activated tags"
  ON tags
  FOR SELECT
  TO anon
  USING (activated = true);

-- Políticas para pets
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

-- Función para sincronizar auth.users con public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para sincronización automática
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sincronizar usuarios existentes
INSERT INTO public.users (id, email, full_name, avatar_url)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
  raw_user_meta_data->>'avatar_url' as avatar_url
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
  updated_at = now();

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