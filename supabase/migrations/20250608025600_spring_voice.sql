/*
  # Corrección completa del esquema de base de datos

  1. Columnas requeridas
    - Añade `user_id` a la tabla `tags` si no existe
    - Añade `created_at` a la tabla `tags` si no existe  
    - Añade `qr_activated` a la tabla `pets` si no existe

  2. Limpieza de constraints
    - Elimina claves foráneas conflictivas que puedan apuntar a public.users
    - Maneja múltiples constraints con nombres similares

  3. Claves foráneas correctas
    - Conecta tags.user_id con auth.users(id)
    - Conecta tags.pet_id con pets(id)
    - Conecta pets.user_id con auth.users(id)

  4. Índices de rendimiento
    - Crea índices para acelerar búsquedas en user_id y pet_id
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

-- 3. Crear claves foráneas correctas (a auth.users)

ALTER TABLE public.tags
ADD CONSTRAINT tags_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.tags
ADD CONSTRAINT tags_pet_id_fkey
FOREIGN KEY (pet_id) REFERENCES public.pets(id);

ALTER TABLE public.pets
ADD CONSTRAINT pets_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- 4. Crear índices para acelerar búsquedas
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON public.tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);