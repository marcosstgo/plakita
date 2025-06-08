/*
  # Corrección del esquema de base de datos

  1. Columnas faltantes
    - Añadir `user_id` a la tabla `tags` si no existe
    - Añadir `qr_activated` a la tabla `pets` si no existe

  2. Claves foráneas
    - Añadir FK de `tags.user_id` a `auth.users(id)`
    - Añadir FK de `tags.pet_id` a `pets(id)`
    - Añadir FK de `pets.user_id` a `auth.users(id)`

  3. Índices para rendimiento
    - Crear índices en las columnas de claves foráneas
*/

-- 1. Añadir columnas faltantes
ALTER TABLE public.tags
ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.pets
ADD COLUMN IF NOT EXISTS qr_activated BOOLEAN DEFAULT false;

-- 2. Añadir claves foráneas
DO $$ BEGIN
  BEGIN
    ALTER TABLE public.tags
    ADD CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'FK tags.user_id_fkey ya existe.';
  END;

  BEGIN
    ALTER TABLE public.tags
    ADD CONSTRAINT tags_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id);
  EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'FK tags.pet_id_fkey ya existe.';
  END;

  BEGIN
    ALTER TABLE public.pets
    ADD CONSTRAINT pets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'FK pets_user_id_fkey ya existe.';
  END;
END $$;

-- 3. Revisar índices (opcional, pero útil para rendimiento)
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON public.tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);

-- 4. Forzar refresco del schema visual en Supabase
-- Esto se logra automáticamente al guardar este script