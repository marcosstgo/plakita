/*
  # Fix database schema for tags and pets tables

  1. New Columns
    - Add `user_id` column to tags table if it doesn't exist
    - Add `created_at` column to tags table if it doesn't exist  
    - Add `qr_activated` column to pets table if it doesn't exist

  2. Foreign Key Constraints
    - Remove any conflicting foreign key constraints
    - Add proper foreign key constraints to auth.users
    - Add foreign key constraint from tags to pets

  3. Indexes
    - Create indexes for better query performance
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
  
  -- También eliminar constraint de pet_id si existe
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.tags'::regclass
      AND conname LIKE '%pet_id_fkey%'
  LOOP
    EXECUTE format('ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;

-- 3. Crear claves foráneas correctas (a auth.users) solo si no existen
DO $$
BEGIN
  -- Foreign key de tags.user_id a auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tags_user_id_fkey' 
    AND table_name = 'tags'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.tags
    ADD CONSTRAINT tags_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- Foreign key de tags.pet_id a pets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tags_pet_id_fkey' 
    AND table_name = 'tags'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.tags
    ADD CONSTRAINT tags_pet_id_fkey
    FOREIGN KEY (pet_id) REFERENCES public.pets(id);
  END IF;

  -- Foreign key de pets.user_id a auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pets_user_id_fkey' 
    AND table_name = 'pets'
    AND table_schema = 'public'
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
CREATE INDEX IF NOT EXISTS idx_tags_code ON public.tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON public.tags(created_at);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON public.pets(qr_activated);