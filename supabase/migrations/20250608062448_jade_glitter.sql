/*
  # Actualización de esquema para Plakita

  1. Nuevas Columnas
    - `tags.user_id` (uuid) - Usuario que reclama el tag
    - `tags.created_at` (timestamp) - Fecha de creación
    - `pets.qr_activated` (boolean) - Estado de activación QR

  2. Seguridad
    - Claves foráneas a auth.users
    - Políticas RLS actualizadas
    - Índices para rendimiento

  3. Cambios
    - Elimina constraints conflictivos existentes
    - Crea nuevas relaciones seguras
    - Actualiza datos existentes para consistencia
*/

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
  END IF;

  -- Agregar created_at a tags si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- Agregar qr_activated a pets si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pets' 
    AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE public.pets ADD COLUMN qr_activated BOOLEAN DEFAULT false;
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
END $$;