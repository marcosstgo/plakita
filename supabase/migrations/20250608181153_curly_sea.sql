/*
  # Corrección final del esquema de base de datos

  1. Verificación y corrección de columnas faltantes
    - Agregar user_id a tags si no existe
    - Agregar qr_activated a pets si no existe
    - Agregar created_at a tags si no existe

  2. Corrección de foreign keys
    - tags.user_id -> auth.users(id)
    - tags.pet_id -> pets(id)
    - pets.user_id -> auth.users(id)

  3. Políticas RLS actualizadas
    - Eliminar políticas duplicadas antes de crear nuevas
    - Crear políticas consistentes para todos los casos de uso

  4. Índices para optimización
    - Índices en columnas frecuentemente consultadas
*/

-- Verificar y agregar columnas faltantes en tags
DO $$
BEGIN
  -- Agregar user_id si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN user_id uuid;
    RAISE NOTICE 'Columna user_id agregada a tags';
  END IF;

  -- Agregar created_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN created_at timestamptz DEFAULT now();
    RAISE NOTICE 'Columna created_at agregada a tags';
  END IF;
END $$;

-- Verificar y agregar columnas faltantes en pets
DO $$
BEGIN
  -- Agregar qr_activated si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'pets' 
    AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE public.pets ADD COLUMN qr_activated boolean DEFAULT false;
    RAISE NOTICE 'Columna qr_activated agregada a pets';
  END IF;
END $$;

-- Limpiar foreign keys existentes que puedan causar conflictos
DO $$
BEGIN
  -- Eliminar constraint problemática de pets si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
    AND constraint_name = 'fk_pet_tag' 
    AND table_name = 'pets'
  ) THEN
    ALTER TABLE public.pets DROP CONSTRAINT fk_pet_tag;
    RAISE NOTICE 'Constraint fk_pet_tag eliminado';
  END IF;

  -- Hacer tag_id nullable en pets si no lo es
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'pets' 
    AND column_name = 'tag_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.pets ALTER COLUMN tag_id DROP NOT NULL;
    RAISE NOTICE 'Columna tag_id en pets ahora es nullable';
  END IF;
END $$;

-- Agregar foreign keys si no existen
DO $$
BEGIN
  -- Foreign key de tags.user_id a auth.users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_schema = 'public'
    AND tc.table_name = 'tags' 
    AND kcu.column_name = 'user_id' 
    AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.tags ADD CONSTRAINT tags_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Foreign key tags_user_id_fkey creado';
  END IF;

  -- Foreign key de tags.pet_id a pets.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_schema = 'public'
    AND tc.table_name = 'tags' 
    AND kcu.column_name = 'pet_id' 
    AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.tags ADD CONSTRAINT tags_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE SET NULL;
    RAISE NOTICE 'Foreign key tags_pet_id_fkey creado';
  END IF;

  -- Foreign key de pets.user_id a auth.users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_schema = 'public'
    AND tc.table_name = 'pets' 
    AND kcu.column_name = 'user_id' 
    AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.pets ADD CONSTRAINT pets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key pets_user_id_fkey creado';
  END IF;
END $$;

-- Crear índices necesarios si no existen
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON public.pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_pets_tag_id ON public.pets(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON public.tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON public.tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON public.tags(created_at);

-- Limpiar todas las políticas RLS existentes para tags
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'tags'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.tags';
        RAISE NOTICE 'Política % eliminada de tags', policy_record.policyname;
    END LOOP;
END $$;

-- Limpiar todas las políticas RLS existentes para pets
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'pets'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.pets';
        RAISE NOTICE 'Política % eliminada de pets', policy_record.policyname;
    END LOOP;
END $$;

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

-- Asegurar que RLS está habilitado
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Limpiar y sincronizar datos
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

-- Verificación final
DO $$
BEGIN
  RAISE NOTICE 'Migración completada. Verificando esquema...';
  
  -- Verificar columnas críticas
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'user_id'
  ) THEN
    RAISE NOTICE '✓ Columna tags.user_id existe';
  ELSE
    RAISE WARNING '✗ Columna tags.user_id NO existe';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pets' AND column_name = 'qr_activated'
  ) THEN
    RAISE NOTICE '✓ Columna pets.qr_activated existe';
  ELSE
    RAISE WARNING '✗ Columna pets.qr_activated NO existe';
  END IF;
END $$;