-- ============================================================================
-- MIGRACIÓN COMPLETA PARA CORREGIR ESQUEMA DE PLAKITA
-- ============================================================================

-- PASO 1: CREAR TABLA public.users COMPLETA
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Agregar todas las columnas necesarias a public.users
DO $$
BEGIN
  -- full_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN full_name text;
  END IF;

  -- avatar_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN avatar_url text;
  END IF;

  -- updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- PASO 2: CORREGIR TABLA TAGS
DO $$
BEGIN
  -- user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN user_id uuid;
  END IF;

  -- created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- PASO 3: CORREGIR TABLA PETS
DO $$
BEGIN
  -- qr_activated
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pets' AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE public.pets ADD COLUMN qr_activated boolean DEFAULT false;
  END IF;

  -- Hacer tag_id nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pets' 
    AND column_name = 'tag_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.pets ALTER COLUMN tag_id DROP NOT NULL;
  END IF;
END $$;

-- PASO 4: LIMPIAR CONSTRAINTS PROBLEMÁTICAS
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Eliminar foreign keys problemáticas
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

-- PASO 5: CREAR ÍNDICES PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON public.pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_pets_tag_id ON public.pets(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON public.tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON public.tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON public.tags(created_at);

-- PASO 6: FUNCIÓN DE SINCRONIZACIÓN auth.users → public.users
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

-- PASO 7: CREAR TRIGGER DE SINCRONIZACIÓN
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PASO 8: SINCRONIZAR USUARIOS EXISTENTES
DO $$
DECLARE
    user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  IF user_count > 0 THEN
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
  END IF;
END $$;

-- PASO 9: CREAR FOREIGN KEYS CORRECTAS
DO $$
BEGIN
  -- tags.user_id → public.users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_schema = 'public' AND tc.table_name = 'tags' 
    AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.tags ADD CONSTRAINT tags_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  -- tags.pet_id → pets.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_schema = 'public' AND tc.table_name = 'tags' 
    AND kcu.column_name = 'pet_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.tags ADD CONSTRAINT tags_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE SET NULL;
  END IF;

  -- pets.user_id → public.users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_schema = 'public' AND tc.table_name = 'pets' 
    AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.pets ADD CONSTRAINT pets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- PASO 10: LIMPIAR TODAS LAS POLÍTICAS RLS EXISTENTES
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

-- PASO 11: HABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- PASO 12: CREAR POLÍTICAS RLS PARA public.users
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

-- PASO 13: CREAR POLÍTICAS RLS PARA tags
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

-- PASO 14: CREAR POLÍTICAS RLS PARA pets
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

-- PASO 15: LIMPIEZA Y SINCRONIZACIÓN DE DATOS
UPDATE public.tags 
SET created_at = now() 
WHERE created_at IS NULL;

UPDATE public.pets 
SET qr_activated = true 
WHERE id IN (
  SELECT DISTINCT pet_id 
  FROM public.tags 
  WHERE activated = true AND pet_id IS NOT NULL
) AND (qr_activated = false OR qr_activated IS NULL);

UPDATE public.tags 
SET user_id = (
  SELECT user_id 
  FROM public.pets 
  WHERE pets.id = tags.pet_id
)
WHERE pet_id IS NOT NULL AND user_id IS NULL;