/*
  # Sincronización automática de auth.users a users table

  1. Función y Trigger
    - Crea una función que se ejecuta cuando un nuevo usuario se registra en auth.users
    - Automáticamente crea el registro correspondiente en la tabla users
    - Copia email y metadata (full_name, phone) de auth.users a users

  2. Sincronización de usuarios existentes
    - Inserta cualquier usuario de auth.users que no exista en la tabla users
    - Esto soluciona el problema de usuarios que se registraron antes de este trigger

  3. Seguridad
    - La función se ejecuta con privilegios de seguridad del definer
    - Solo se ejecuta automáticamente, no puede ser llamada directamente por usuarios
*/

-- Función para sincronizar nuevo usuario de auth.users a users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    updated_at = EXCLUDED.updated_at;
  
  RETURN NEW;
END;
$$;

-- Crear trigger en auth.users para ejecutar la función cuando se crea un nuevo usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Sincronizar usuarios existentes de auth.users que no están en users
INSERT INTO public.users (id, email, full_name, phone, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  COALESCE(au.raw_user_meta_data->>'phone', ''),
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;