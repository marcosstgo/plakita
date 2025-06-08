-- Migración completa para corregir esquema de base de datos
-- Ejecuta este código en el SQL Editor de Supabase

-- Paso 1: Agregar columnas faltantes con verificaciones
DO $$
BEGIN
  -- Agregar user_id a tags si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN user_id UUID;
    RAISE NOTICE 'Agregada columna user_id a tabla tags';
  ELSE
    RAISE NOTICE 'Columna user_id ya existe en tabla tags';
  END IF;

  -- Agregar created_at a tags si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Agregada columna created_at a tabla tags';
  ELSE
    RAISE NOTICE 'Columna created_at ya existe en tabla tags';
  END IF;

  -- Agregar qr_activated a pets si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pets' 
    AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE public.pets ADD COLUMN qr_activated BOOLEAN DEFAULT false;
    RAISE NOTICE 'Agregada columna qr_activated a tabla pets';
  ELSE
    RAISE NOTICE 'Columna qr_activated ya existe en tabla pets';
  END IF;
END $$;

-- Paso 2: Limpiar constraints existentes que puedan causar conflictos
DO $$
DECLARE
  constraint_record record;
BEGIN
  -- Eliminar constraints de foreign key existentes en tags
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' 
    AND t.relname = 'tags'
    AND c.contype = 'f'
    AND (conname LIKE '%user_id%' OR conname LIKE '%pet_id%')
  LOOP
    EXECUTE format('ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
    RAISE NOTICE 'Eliminado constraint % de tags', constraint_record.conname;
  END LOOP;

  -- Eliminar constraints de foreign key existentes en pets
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' 
    AND t.relname = 'pets'
    AND c.contype = 'f'
    AND conname LIKE '%user_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
    RAISE NOTICE 'Eliminado constraint % de pets', constraint_record.conname;
  END LOOP;
END $$;

-- Paso 3: Crear constraints de foreign key solo si no existen
DO $$
BEGIN
  -- Foreign key de tags.user_id a auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
    AND constraint_name = 'tags_user_id_fkey' 
    AND table_name = 'tags'
  ) THEN
    ALTER TABLE public.tags 
    ADD CONSTRAINT tags_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Agregado foreign key constraint tags_user_id_fkey';
  END IF;

  -- Foreign key de tags.pet_id a pets (solo si no existe)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
    AND constraint_name = 'tags_pet_id_fkey' 
    AND table_name = 'tags'
  ) THEN
    ALTER TABLE public.tags 
    ADD CONSTRAINT tags_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE SET NULL;
    RAISE NOTICE 'Agregado foreign key constraint tags_pet_id_fkey';
  END IF;

  -- Foreign key de pets.user_id a auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
    AND constraint_name = 'pets_user_id_fkey' 
    AND table_name = 'pets'
  ) THEN
    ALTER TABLE public.pets 
    ADD CONSTRAINT pets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Agregado foreign key constraint pets_user_id_fkey';
  END IF;
END $$;

-- Paso 4: Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON public.tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON public.tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON public.tags(created_at);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON public.pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_pets_tag_id ON public.pets(tag_id);

-- Paso 5: Actualizar datos existentes para consistencia
DO $$
BEGIN
  -- Actualizar pets.qr_activated basado en tags activados asociados
  UPDATE public.pets 
  SET qr_activated = true 
  WHERE id IN (
    SELECT DISTINCT pet_id 
    FROM public.tags 
    WHERE activated = true AND pet_id IS NOT NULL
  ) AND (qr_activated = false OR qr_activated IS NULL);

  -- Actualizar tags.user_id basado en pets asociados
  UPDATE public.tags 
  SET user_id = (
    SELECT user_id 
    FROM public.pets 
    WHERE pets.id = tags.pet_id
  )
  WHERE pet_id IS NOT NULL AND user_id IS NULL;

  RAISE NOTICE 'Datos existentes actualizados para consistencia';
END $$;

-- Paso 6: Habilitar RLS y crear políticas
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Users can read own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can insert tags" ON public.tags;
DROP POLICY IF EXISTS "Users can claim unclaimed tags" ON public.tags;
DROP POLICY IF EXISTS "Users can activate tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can read activated tags" ON public.tags;

-- Crear políticas RLS para tags
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

-- Eliminar políticas existentes para pets
DROP POLICY IF EXISTS "Users can read own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can insert own pets" ON public.pets;

-- Crear políticas RLS para pets
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

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '✅ Columnas agregadas: tags.user_id, tags.created_at, pets.qr_activated';
  RAISE NOTICE '✅ Foreign keys configurados correctamente';
  RAISE NOTICE '✅ Índices creados para mejor rendimiento';
  RAISE NOTICE '✅ Políticas RLS actualizadas';
  RAISE NOTICE '✅ Datos existentes sincronizados';
END $$;