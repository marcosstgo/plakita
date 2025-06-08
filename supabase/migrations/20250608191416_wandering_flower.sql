-- ============================================================================
-- MIGRACIÓN ESPECÍFICA PARA CORREGIR EL ADMIN PANEL
-- Esta migración asegura que todas las funcionalidades del admin funcionen
-- ============================================================================

-- PASO 1: ASEGURAR QUE EXISTE LA TABLA public.users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  full_name text,
  avatar_url text,
  updated_at timestamptz DEFAULT now()
);

-- PASO 2: ASEGURAR COLUMNAS EN TAGS
DO $$
BEGIN
  -- Agregar user_id si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN user_id uuid;
    RAISE NOTICE 'Columna user_id agregada a tags';
  END IF;

  -- Agregar created_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN created_at timestamptz DEFAULT now();
    RAISE NOTICE 'Columna created_at agregada a tags';
  END IF;
END $$;

-- PASO 3: ASEGURAR COLUMNAS EN PETS
DO $$
BEGIN
  -- Agregar qr_activated si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pets' AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE public.pets ADD COLUMN qr_activated boolean DEFAULT false;
    RAISE NOTICE 'Columna qr_activated agregada a pets';
  END IF;
END $$;

-- PASO 4: CREAR ÍNDICES PARA MEJOR RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_tags_code_unique ON public.tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_activated ON public.tags(activated);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON public.tags(created_at);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON public.tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON public.pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- PASO 5: FUNCIÓN DE SINCRONIZACIÓN MEJORADA
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

-- PASO 6: CREAR TRIGGER SI NO EXISTE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PASO 7: SINCRONIZAR USUARIOS EXISTENTES
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
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
    
    RAISE NOTICE 'Usuarios sincronizados desde auth.users';
  END IF;
END $$;

-- PASO 8: LIMPIAR Y RECREAR FOREIGN KEYS
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Eliminar foreign keys existentes que puedan causar problemas
    FOR constraint_record IN 
        SELECT constraint_name, table_name
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_type = 'FOREIGN KEY'
        AND (
          constraint_name LIKE '%user_id%' OR
          constraint_name LIKE '%pet_id%'
        )
    LOOP
        EXECUTE 'ALTER TABLE public.' || constraint_record.table_name || 
                ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
    END LOOP;
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
    RAISE NOTICE 'Foreign key tags_user_id_fkey creado';
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
    RAISE NOTICE 'Foreign key tags_pet_id_fkey creado';
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
    RAISE NOTICE 'Foreign key pets_user_id_fkey creado';
  END IF;
END $$;

-- PASO 10: HABILITAR RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- PASO 11: LIMPIAR POLÍTICAS EXISTENTES
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

-- PASO 15: ACTUALIZAR DATOS EXISTENTES
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

-- PASO 16: VERIFICACIÓN FINAL
DO $$
DECLARE
    column_count INTEGER;
    policy_count INTEGER;
    fk_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '    ADMIN PANEL - VERIFICACIÓN FINAL';
    RAISE NOTICE '==========================================';
    
    -- Verificar columnas críticas
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'user_id';
    
    IF column_count > 0 THEN
        RAISE NOTICE '✅ tags.user_id: EXISTE';
    ELSE
        RAISE WARNING '❌ tags.user_id: NO EXISTE';
    END IF;
    
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'created_at';
    
    IF column_count > 0 THEN
        RAISE NOTICE '✅ tags.created_at: EXISTE';
    ELSE
        RAISE WARNING '❌ tags.created_at: NO EXISTE';
    END IF;
    
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pets' AND column_name = 'qr_activated';
    
    IF column_count > 0 THEN
        RAISE NOTICE '✅ pets.qr_activated: EXISTE';
    ELSE
        RAISE WARNING '❌ pets.qr_activated: NO EXISTE';
    END IF;
    
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'full_name';
    
    IF column_count > 0 THEN
        RAISE NOTICE '✅ public.users.full_name: EXISTE';
    ELSE
        RAISE WARNING '❌ public.users.full_name: NO EXISTE';
    END IF;
    
    -- Contar políticas
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tags';
    RAISE NOTICE '🛡️ Políticas en tags: %', policy_count;
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pets';
    RAISE NOTICE '🛡️ Políticas en pets: %', policy_count;
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users';
    RAISE NOTICE '🛡️ Políticas en public.users: %', policy_count;
    
    -- Contar foreign keys
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_type = 'FOREIGN KEY'
    AND table_name IN ('tags', 'pets');
    RAISE NOTICE '🔗 Foreign keys: %', fk_count;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ ADMIN PANEL LISTO PARA USAR';
    RAISE NOTICE '==========================================';
END $$;