/*
  # Actualización de esquema para Plakita

  1. Nuevas Columnas
    - `tags.user_id` (uuid) - Referencia al usuario que reclama el tag
    - `tags.created_at` (timestamptz) - Fecha de creación del tag
    - `pets.qr_activated` (boolean) - Estado de activación del QR

  2. Relaciones
    - tags.user_id → auth.users(id)
    - tags.pet_id → pets(id)
    - pets.user_id → auth.users(id)

  3. Índices
    - Índices en columnas frecuentemente consultadas

  4. Seguridad
    - Políticas RLS actualizadas para tags y pets
    - Permisos apropiados para usuarios autenticados y anónimos

  5. Consistencia de Datos
    - Actualización de datos existentes para mantener integridad
*/

-- Step 1: Add missing columns with proper checks
DO $$
BEGIN
  -- Add user_id to tags if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN user_id UUID;
    RAISE NOTICE 'Added user_id column to tags table';
  ELSE
    RAISE NOTICE 'user_id column already exists in tags table';
  END IF;

  -- Add created_at to tags if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added created_at column to tags table';
  ELSE
    RAISE NOTICE 'created_at column already exists in tags table';
  END IF;

  -- Add qr_activated to pets if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pets' 
    AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE public.pets ADD COLUMN qr_activated BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added qr_activated column to pets table';
  ELSE
    RAISE NOTICE 'qr_activated column already exists in pets table';
  END IF;
END $$;

-- Step 2: Clean up any existing problematic constraints
DO $$
DECLARE
  constraint_record record;
BEGIN
  -- Remove any existing foreign key constraints that might conflict
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
    RAISE NOTICE 'Dropped constraint % from tags', constraint_record.conname;
  END LOOP;

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
    RAISE NOTICE 'Dropped constraint % from pets', constraint_record.conname;
  END LOOP;
END $$;

-- Step 3: Add foreign key constraints with proper checks
DO $$
BEGIN
  -- Foreign key from tags.user_id to auth.users(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
    AND constraint_name = 'tags_user_id_fkey' 
    AND table_name = 'tags'
  ) THEN
    ALTER TABLE public.tags 
    ADD CONSTRAINT tags_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added foreign key constraint tags_user_id_fkey';
  END IF;

  -- Foreign key from tags.pet_id to pets(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
    AND constraint_name = 'tags_pet_id_fkey' 
    AND table_name = 'tags'
  ) THEN
    ALTER TABLE public.tags 
    ADD CONSTRAINT tags_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added foreign key constraint tags_pet_id_fkey';
  END IF;

  -- Foreign key from pets.user_id to auth.users(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
    AND constraint_name = 'pets_user_id_fkey' 
    AND table_name = 'pets'
  ) THEN
    ALTER TABLE public.pets 
    ADD CONSTRAINT pets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint pets_user_id_fkey';
  END IF;
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON public.tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON public.tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON public.tags(created_at);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON public.pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_pets_tag_id ON public.pets(tag_id);

-- Step 5: Update existing data for consistency
DO $$
BEGIN
  -- Update pets.qr_activated based on associated activated tags
  UPDATE public.pets 
  SET qr_activated = true 
  WHERE id IN (
    SELECT DISTINCT pet_id 
    FROM public.tags 
    WHERE activated = true AND pet_id IS NOT NULL
  ) AND (qr_activated = false OR qr_activated IS NULL);

  -- Update tags.user_id based on associated pets
  UPDATE public.tags 
  SET user_id = (
    SELECT user_id 
    FROM public.pets 
    WHERE pets.id = tags.pet_id
  )
  WHERE pet_id IS NOT NULL AND user_id IS NULL;

  RAISE NOTICE 'Updated existing data for consistency';
END $$;

-- Step 6: Ensure RLS policies are in place
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can insert tags" ON public.tags;
DROP POLICY IF EXISTS "Users can claim unclaimed tags" ON public.tags;
DROP POLICY IF EXISTS "Users can activate tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can read activated tags" ON public.tags;

-- Create RLS policies for tags
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

-- Drop existing policies for pets to avoid conflicts
DROP POLICY IF EXISTS "Users can read own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can insert own pets" ON public.pets;

-- Create RLS policies for pets
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