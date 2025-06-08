-- ============================================================================
-- MIGRACIÓN MANUAL PARA CORREGIR ESQUEMA DE PLAKITA
-- Copia y pega este SQL completo en el SQL Editor de Supabase
-- ============================================================================

-- PASO 1: CREAR TABLA public.users SI NO EXISTE
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  full_name text,
  avatar_url text,
  updated_at timestamptz DEFAULT now()
);

-- PASO 2: AGREGAR COLUMNAS FALTANTES A TAGS
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS user_id uuid,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- PASO 3: AGREGAR COLUMNAS FALTANTES A PETS
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS qr_activated boolean DEFAULT false;

-- PASO 4: HACER tag_id NULLABLE EN PETS
ALTER TABLE public.pets ALTER COLUMN tag_id DROP NOT NULL;

-- PASO 5: ELIMINAR CONSTRAINTS PROBLEMÁTICAS
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT constraint_name, table_name
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_type = 'FOREIGN KEY'
        AND (
          constraint_name LIKE '%user_id%' OR
          constraint_name = 'fk_pet_tag' OR
          constraint_name LIKE '%auth_users%'
        )
    LOOP
        EXECUTE 'ALTER TABLE public.' || constraint_record.table_name || 
                ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
    END LOOP;
END $$;

-- PASO 6: CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON public.pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_pets_tag_id ON public.pets(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON public.tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON public.tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON public.tags(created_at);

-- PASO 7: FUNCIÓN DE SINCRONIZACIÓN
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 8: CREAR TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PASO 9: SINCRONIZAR USUARIOS EXISTENTES
INSERT INTO public.users (id, email, full_name, avatar_url, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
  raw_user_meta_data->>'avatar_url' as avatar_url,
  now() as updated_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
  updated_at = now();

-- PASO 10: CREAR FOREIGN KEYS
ALTER TABLE public.tags 
ADD CONSTRAINT IF NOT EXISTS tags_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.tags 
ADD CONSTRAINT IF NOT EXISTS tags_pet_id_fkey 
FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE SET NULL;

ALTER TABLE public.pets 
ADD CONSTRAINT IF NOT EXISTS pets_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- PASO 11: LIMPIAR POLÍTICAS RLS EXISTENTES
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Limpiar políticas de public.users
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.users';
    END LOOP;
    
    -- Limpiar políticas de tags
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'tags'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.tags';
    END LOOP;
    
    -- Limpiar políticas de pets
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'pets'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.pets';
    END LOOP;
END $$;

-- PASO 12: HABILITAR RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- PASO 13: CREAR POLÍTICAS RLS PARA public.users
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

-- PASO 14: CREAR POLÍTICAS RLS PARA tags
CREATE POLICY "Users can read own tags"
  ON public.tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own tags"
  ON public.tags
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert tags"
  ON public.tags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can claim unclaimed tags"
  ON public.tags
  FOR UPDATE
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can activate tags"
  ON public.tags
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pets 
      WHERE pets.id = tags.pet_id 
      AND pets.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read activated tags"
  ON public.tags
  FOR SELECT
  TO anon
  USING (activated = true);

-- PASO 15: CREAR POLÍTICAS RLS PARA pets
CREATE POLICY "Users can read own pets"
  ON public.pets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own pets"
  ON public.pets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own pets"
  ON public.pets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- PASO 16: SINCRONIZAR DATOS
-- Actualizar created_at para tags que no lo tengan
UPDATE public.tags 
SET created_at = now() 
WHERE created_at IS NULL;

-- Sincronizar qr_activated en pets con activated en tags
UPDATE public.pets 
SET qr_activated = true 
WHERE id IN (
  SELECT DISTINCT pet_id 
  FROM public.tags 
  WHERE activated = true AND pet_id IS NOT NULL
) AND (qr_activated = false OR qr_activated IS NULL);

-- Sincronizar user_id en tags con pets
UPDATE public.tags 
SET user_id = (
  SELECT user_id 
  FROM public.pets 
  WHERE pets.id = tags.pet_id
)
WHERE pet_id IS NOT NULL AND user_id IS NULL;

-- PASO 17: VERIFICACIÓN FINAL
SELECT 
  'tags.user_id' as columna,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'user_id'
  ) THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as estado
UNION ALL
SELECT 
  'tags.created_at' as columna,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'created_at'
  ) THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as estado
UNION ALL
SELECT 
  'pets.qr_activated' as columna,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pets' AND column_name = 'qr_activated'
  ) THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as estado
UNION ALL
SELECT 
  'public.users.full_name' as columna,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'full_name'
  ) THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as estado;

-- Mostrar conteo de políticas
SELECT 
  'tags' as tabla,
  COUNT(*) as politicas
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'tags'
UNION ALL
SELECT 
  'pets' as tabla,
  COUNT(*) as politicas
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'pets'
UNION ALL
SELECT 
  'users' as tabla,
  COUNT(*) as politicas
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users';

-- Mostrar conteo de registros
SELECT 
  'public.users' as tabla,
  COUNT(*) as registros
FROM public.users
UNION ALL
SELECT 
  'tags' as tabla,
  COUNT(*) as registros
FROM public.tags
UNION ALL
SELECT 
  'pets' as tabla,
  COUNT(*) as registros
FROM public.pets;