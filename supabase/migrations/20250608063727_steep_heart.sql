/*
  # Corrección completa del esquema de base de datos

  1. Columnas faltantes
    - Agregar `user_id` a tabla `tags`
    - Agregar `qr_activated` a tabla `pets`
    - Verificar que `created_at` existe en `tags`

  2. Foreign Keys
    - Configurar correctamente las relaciones entre tablas
    - Asegurar que apunten a `auth.users` no a `public.users`

  3. Índices
    - Crear índices para mejor rendimiento

  4. RLS Policies
    - Actualizar políticas de seguridad
*/

-- Paso 1: Verificar y agregar columnas faltantes
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
  END IF;

  -- Verificar created_at en tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Agregada columna created_at a tabla tags';
  END IF;
END $$;

-- Paso 2: Limpiar constraints problemáticos
DO $$
DECLARE
  constraint_record record;
BEGIN
  -- Eliminar todos los foreign keys existentes que puedan causar problemas
  FOR constraint_record IN
    SELECT conname, conrelid::regclass as table_name
    FROM pg_constraint c
    WHERE c.contype = 'f'
    AND (
      (conrelid = 'public.tags'::regclass AND conname LIKE '%user_id%') OR
      (conrelid = 'public.tags'::regclass AND conname LIKE '%pet_id%') OR
      (conrelid = 'public.pets'::regclass AND conname LIKE '%user_id%')
    )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', 
                   constraint_record.table_name, constraint_record.conname);
    RAISE NOTICE 'Eliminado constraint %', constraint_record.conname;
  END LOOP;
END $$;

-- Paso 3: Crear foreign keys correctos
DO $$
BEGIN
  -- tags.user_id -> auth.users(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tags_user_id_fkey' 
    AND table_name = 'tags'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.tags 
    ADD CONSTRAINT tags_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Creado foreign key tags_user_id_fkey';
  END IF;

  -- tags.pet_id -> pets(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tags_pet_id_fkey' 
    AND table_name = 'tags'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.tags 
    ADD CONSTRAINT tags_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE SET NULL;
    RAISE NOTICE 'Creado foreign key tags_pet_id_fkey';
  END IF;

  -- pets.user_id -> auth.users(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pets_user_id_fkey' 
    AND table_name = 'pets'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.pets 
    ADD CONSTRAINT pets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Creado foreign key pets_user_id_fkey';
  END IF;
END $$;

-- Paso 4: Crear índices necesarios
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON public.tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON public.tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON public.tags(created_at);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON public.pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_pets_tag_id ON public.pets(tag_id);

-- Paso 5: Actualizar datos existentes
DO $$
BEGIN
  -- Actualizar qr_activated basado en tags activados
  UPDATE public.pets 
  SET qr_activated = true 
  WHERE id IN (
    SELECT DISTINCT pet_id 
    FROM public.tags 
    WHERE activated = true AND pet_id IS NOT NULL
  ) AND (qr_activated IS NULL OR qr_activated = false);

  -- Actualizar user_id en tags basado en pets
  UPDATE public.tags 
  SET user_id = (
    SELECT user_id 
    FROM public.pets 
    WHERE pets.id = tags.pet_id
  )
  WHERE pet_id IS NOT NULL AND user_id IS NULL;

  RAISE NOTICE 'Datos actualizados para consistencia';
END $$;

-- Paso 6: Configurar RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can read own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can insert tags" ON public.tags;
DROP POLICY IF EXISTS "Users can claim unclaimed tags" ON public.tags;
DROP POLICY IF EXISTS "Users can activate tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can read activated tags" ON public.tags;
DROP POLICY IF EXISTS "Users can read own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can insert own pets" ON public.pets;

-- Crear políticas para tags
CREATE POLICY "Users can read own tags"
  ON public.tags FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own tags"
  ON public.tags FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert tags"
  ON public.tags FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can claim unclaimed tags"
  ON public.tags FOR UPDATE TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can activate tags"
  ON public.tags FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pets 
      WHERE pets.id = tags.pet_id 
      AND pets.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read activated tags"
  ON public.tags FOR SELECT TO anon
  USING (activated = true);

-- Crear políticas para pets
CREATE POLICY "Users can read own pets"
  ON public.pets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own pets"
  ON public.pets FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own pets"
  ON public.pets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Verificación final
DO $$
DECLARE
  tags_user_id_exists BOOLEAN;
  pets_qr_activated_exists BOOLEAN;
  tags_created_at_exists BOOLEAN;
BEGIN
  -- Verificar columnas
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'user_id'
  ) INTO tags_user_id_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'pets' AND column_name = 'qr_activated'
  ) INTO pets_qr_activated_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'created_at'
  ) INTO tags_created_at_exists;

  -- Reportar resultados
  IF tags_user_id_exists AND pets_qr_activated_exists AND tags_created_at_exists THEN
    RAISE NOTICE '✅ MIGRACIÓN EXITOSA - Todas las columnas están presentes';
    RAISE NOTICE '✅ tags.user_id: %', tags_user_id_exists;
    RAISE NOTICE '✅ pets.qr_activated: %', pets_qr_activated_exists;
    RAISE NOTICE '✅ tags.created_at: %', tags_created_at_exists;
  ELSE
    RAISE WARNING '❌ MIGRACIÓN INCOMPLETA';
    RAISE WARNING 'tags.user_id: %', tags_user_id_exists;
    RAISE WARNING 'pets.qr_activated: %', pets_qr_activated_exists;
    RAISE WARNING 'tags.created_at: %', tags_created_at_exists;
  END IF;
END $$;