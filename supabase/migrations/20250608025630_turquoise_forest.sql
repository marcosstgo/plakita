/*
  # Migración segura para corregir esquema de base de datos

  1. Columnas faltantes
    - Añade `user_id` a `tags` si no existe
    - Añade `created_at` a `tags` si no existe  
    - Añade `qr_activated` a `pets` si no existe

  2. Constraints seguros
    - Elimina y recrea constraints de manera segura
    - Apunta correctamente a `auth.users` en lugar de `public.users`

  3. Índices de rendimiento
    - Crea índices necesarios para optimizar consultas
*/

-- 1. Asegurar columnas requeridas
DO $$
BEGIN
  -- Añadir user_id a tags si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN user_id UUID;
  END IF;

  -- Añadir created_at a tags si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;

  -- Añadir qr_activated a pets si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pets' AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE public.pets ADD COLUMN qr_activated BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Eliminar constraints existentes de manera segura
DO $$
BEGIN
  -- Eliminar constraint tags_user_id_fkey si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' 
    AND table_name = 'tags' 
    AND constraint_name = 'tags_user_id_fkey'
  ) THEN
    ALTER TABLE public.tags DROP CONSTRAINT tags_user_id_fkey;
  END IF;

  -- Eliminar constraint tags_pet_id_fkey si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' 
    AND table_name = 'tags' 
    AND constraint_name = 'tags_pet_id_fkey'
  ) THEN
    ALTER TABLE public.tags DROP CONSTRAINT tags_pet_id_fkey;
  END IF;

  -- Eliminar constraint pets_user_id_fkey si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' 
    AND table_name = 'pets' 
    AND constraint_name = 'pets_user_id_fkey'
  ) THEN
    ALTER TABLE public.pets DROP CONSTRAINT pets_user_id_fkey;
  END IF;
END $$;

-- 3. Crear claves foráneas correctas (apuntando a auth.users)
DO $$
BEGIN
  -- Foreign key de tags.user_id a auth.users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' 
    AND table_name = 'tags' 
    AND constraint_name = 'tags_user_id_fkey'
  ) THEN
    ALTER TABLE public.tags
    ADD CONSTRAINT tags_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- Foreign key de tags.pet_id a pets.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' 
    AND table_name = 'tags' 
    AND constraint_name = 'tags_pet_id_fkey'
  ) THEN
    ALTER TABLE public.tags
    ADD CONSTRAINT tags_pet_id_fkey
    FOREIGN KEY (pet_id) REFERENCES public.pets(id);
  END IF;

  -- Foreign key de pets.user_id a auth.users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' 
    AND table_name = 'pets' 
    AND constraint_name = 'pets_user_id_fkey'
  ) THEN
    ALTER TABLE public.pets
    ADD CONSTRAINT pets_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END $$;

-- 4. Crear índices para acelerar búsquedas
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON public.tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON public.tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON public.tags(created_at);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON public.pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_pets_tag_id ON public.pets(tag_id);

-- 5. Asegurar que pets.tag_id tenga constraint único si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' 
    AND table_name = 'pets' 
    AND constraint_name = 'pets_tag_id_key'
    AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE public.pets ADD CONSTRAINT pets_tag_id_key UNIQUE (tag_id);
  END IF;
END $$;