/*
  # Add Required Columns and Constraints

  1. New Columns
    - Add user_id to tags table
    - Add created_at to tags table  
    - Add qr_activated to pets table

  2. Foreign Keys
    - Link tags to auth.users
    - Link tags to pets
    - Link pets to auth.users

  3. Indexes
    - Add performance indexes for common queries
*/

-- 1. Asegurar columnas requeridas
ALTER TABLE public.tags
ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.tags
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

ALTER TABLE public.pets
ADD COLUMN IF NOT EXISTS qr_activated BOOLEAN DEFAULT false;

-- 2. Eliminar claves foráneas conflictivas (por si apuntaban a public.users)
DO $$
DECLARE
  constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.tags'::regclass
      AND conname LIKE '%user_id_fkey%'
  LOOP
    EXECUTE format('ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;

  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.pets'::regclass
      AND conname LIKE '%user_id_fkey%'
  LOOP
    EXECUTE format('ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;

-- 3. Crear claves foráneas correctas (a auth.users) solo si no existen
DO $$
BEGIN
  -- Verificar y crear constraint tags_user_id_fkey
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tags_user_id_fkey' 
    AND table_name = 'tags'
  ) THEN
    ALTER TABLE public.tags
    ADD CONSTRAINT tags_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- Verificar y crear constraint tags_pet_id_fkey
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tags_pet_id_fkey' 
    AND table_name = 'tags'
  ) THEN
    ALTER TABLE public.tags
    ADD CONSTRAINT tags_pet_id_fkey
    FOREIGN KEY (pet_id) REFERENCES public.pets(id);
  END IF;

  -- Verificar y crear constraint pets_user_id_fkey
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pets_user_id_fkey' 
    AND table_name = 'pets'
  ) THEN
    ALTER TABLE public.pets
    ADD CONSTRAINT pets_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END $$;

-- 4. Crear índices para acelerar búsquedas
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON public.tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);