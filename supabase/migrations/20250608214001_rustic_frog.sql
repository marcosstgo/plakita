/*
  # Sincronizar usuarios existentes de auth.users a public.users

  1. Crear tabla public.users si no existe
  2. Sincronizar todos los usuarios de auth.users
  3. Crear función de trigger para sincronización automática
  4. Configurar políticas RLS para public.users
*/

-- 1. Crear tabla public.users si no existe
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  full_name text,
  avatar_url text,
  updated_at timestamptz DEFAULT now()
);

-- 2. Habilitar RLS en public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Crear índice en email para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 4. Función para sincronizar usuarios de auth.users a public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Crear trigger para sincronización automática
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Sincronizar todos los usuarios existentes de auth.users
INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
  raw_user_meta_data->>'avatar_url' as avatar_url,
  created_at,
  now() as updated_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
  updated_at = now();

-- 7. Limpiar políticas existentes en public.users
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- 8. Crear políticas RLS para public.users
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- 9. Actualizar foreign keys en otras tablas para apuntar a public.users
DO $$
BEGIN
  -- Eliminar foreign keys existentes que apunten a auth.users
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tags_user_id_fkey' 
    AND table_name = 'tags'
  ) THEN
    ALTER TABLE public.tags DROP CONSTRAINT tags_user_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pets_user_id_fkey' 
    AND table_name = 'pets'
  ) THEN
    ALTER TABLE public.pets DROP CONSTRAINT pets_user_id_fkey;
  END IF;

  -- Crear nuevas foreign keys que apunten a public.users
  ALTER TABLE public.tags
  ADD CONSTRAINT tags_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

  ALTER TABLE public.pets
  ADD CONSTRAINT pets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;