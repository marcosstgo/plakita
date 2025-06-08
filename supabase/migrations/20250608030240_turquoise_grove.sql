/*
  # Arreglar esquema de base de datos

  1. Columnas faltantes
    - Añadir `user_id` a tabla `tags`
    - Añadir `qr_activated` a tabla `pets`
  
  2. Claves foráneas
    - Conectar `tags.user_id` con `auth.users.id`
    - Conectar `tags.pet_id` con `pets.id`
    - Conectar `pets.user_id` con `auth.users.id`
  
  3. Índices para rendimiento
    - Índices en columnas de búsqueda frecuente
*/

-- 1. Añadir columnas faltantes de manera segura
DO $$
BEGIN
  -- Añadir user_id a tags si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.tags ADD COLUMN user_id UUID;
    RAISE NOTICE 'Columna user_id añadida a tabla tags';
  ELSE
    RAISE NOTICE 'Columna user_id ya existe en tabla tags';
  END IF;

  -- Añadir qr_activated a pets si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pets' AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE public.pets ADD COLUMN qr_activated BOOLEAN DEFAULT false;
    RAISE NOTICE 'Columna qr_activated añadida a tabla pets';
  ELSE
    RAISE NOTICE 'Columna qr_activated ya existe en tabla pets';
  END IF;
END $$;

-- 2. Eliminar constraints existentes de manera segura
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  -- Verificar y eliminar constraint tags_user_id_fkey si existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' 
    AND table_name = 'tags' 
    AND constraint_name = 'tags_user_id_fkey'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    ALTER TABLE public.tags DROP CONSTRAINT tags_user_id_fkey;
    RAISE NOTICE 'Constraint tags_user_id_fkey eliminado';
  END IF;

  -- Verificar y eliminar constraint tags_pet_id_fkey si existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' 
    AND table_name = 'tags' 
    AND constraint_name = 'tags_pet_id_fkey'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    ALTER TABLE public.tags DROP CONSTRAINT tags_pet_id_fkey;
    RAISE NOTICE 'Constraint tags_pet_id_fkey eliminado';
  END IF;

  -- Verificar y eliminar constraint pets_user_id_fkey si existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' 
    AND table_name = 'pets' 
    AND constraint_name = 'pets_user_id_fkey'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    ALTER TABLE public.pets DROP CONSTRAINT pets_user_id_fkey;
    RAISE NOTICE 'Constraint pets_user_id_fkey eliminado';
  END IF;
END $$;

-- 3. Crear claves foráneas correctas
DO $$
BEGIN
  -- Foreign key de tags.user_id a auth.users.id
  BEGIN
    ALTER TABLE public.tags
    ADD CONSTRAINT tags_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
    RAISE NOTICE 'Foreign key tags_user_id_fkey creado';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Foreign key tags_user_id_fkey ya existe';
  END;

  -- Foreign key de tags.pet_id a pets.id
  BEGIN
    ALTER TABLE public.tags
    ADD CONSTRAINT tags_pet_id_fkey
    FOREIGN KEY (pet_id) REFERENCES public.pets(id);
    RAISE NOTICE 'Foreign key tags_pet_id_fkey creado';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Foreign key tags_pet_id_fkey ya existe';
  END;

  -- Foreign key de pets.user_id a auth.users.id
  BEGIN
    ALTER TABLE public.pets
    ADD CONSTRAINT pets_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
    RAISE NOTICE 'Foreign key pets_user_id_fkey creado';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Foreign key pets_user_id_fkey ya existe';
  END;
END $$;

-- 4. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON public.tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON public.tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON public.tags(created_at);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON public.pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_pets_tag_id ON public.pets(tag_id);

-- 5. Asegurar constraint único en pets.tag_id si no existe
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
    RAISE NOTICE 'Constraint único pets_tag_id_key creado';
  ELSE
    RAISE NOTICE 'Constraint único pets_tag_id_key ya existe';
  END IF;
END $$;

-- 6. Verificar que las tablas tienen las columnas necesarias
DO $$
DECLARE
  tags_user_id_exists BOOLEAN;
  pets_qr_activated_exists BOOLEAN;
BEGIN
  -- Verificar columna user_id en tags
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'user_id'
  ) INTO tags_user_id_exists;

  -- Verificar columna qr_activated en pets
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pets' AND column_name = 'qr_activated'
  ) INTO pets_qr_activated_exists;

  -- Reportar estado
  IF tags_user_id_exists THEN
    RAISE NOTICE 'VERIFICACIÓN: Columna tags.user_id existe ✓';
  ELSE
    RAISE EXCEPTION 'ERROR: Columna tags.user_id no existe';
  END IF;

  IF pets_qr_activated_exists THEN
    RAISE NOTICE 'VERIFICACIÓN: Columna pets.qr_activated existe ✓';
  ELSE
    RAISE EXCEPTION 'ERROR: Columna pets.qr_activated no existe';
  END IF;

  RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE ✓';
END $$;