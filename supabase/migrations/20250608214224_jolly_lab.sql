/*
  # Sincronización del Usuario Administrador

  1. Sincronizar todos los usuarios de auth.users a public.users
  2. Verificar específicamente el usuario admin santiago.marcos@gmail.com
  3. Asegurar que todas las foreign keys estén correctas
  4. Verificar permisos y acceso
*/

-- 1. Asegurar que la tabla public.users existe con todas las columnas
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  full_name text,
  avatar_url text,
  updated_at timestamptz DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Crear índice en email
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 4. Función de sincronización mejorada
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.created_at,
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

-- 5. Crear trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Sincronizar TODOS los usuarios existentes de auth.users a public.users
DO $$
DECLARE
    user_record RECORD;
    sync_count INTEGER := 0;
    admin_found BOOLEAN := false;
BEGIN
    -- Sincronizar todos los usuarios
    FOR user_record IN 
        SELECT id, email, raw_user_meta_data, created_at 
        FROM auth.users 
    LOOP
        INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
        VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email),
            user_record.raw_user_meta_data->>'avatar_url',
            user_record.created_at,
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
            avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
            updated_at = now();
        
        sync_count := sync_count + 1;
        
        -- Verificar si encontramos el admin
        IF user_record.email = 'santiago.marcos@gmail.com' THEN
            admin_found := true;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Sincronizados % usuarios de auth.users a public.users', sync_count;
    
    IF admin_found THEN
        RAISE NOTICE '✅ Usuario admin santiago.marcos@gmail.com sincronizado correctamente';
    ELSE
        RAISE WARNING '⚠️ Usuario admin santiago.marcos@gmail.com NO encontrado en auth.users';
    END IF;
END $$;

-- 7. Limpiar políticas existentes
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

-- 9. Actualizar foreign keys para apuntar a public.users
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

-- 10. Verificación específica del usuario admin
DO $$
DECLARE
    admin_id UUID;
    admin_exists_auth BOOLEAN := false;
    admin_exists_public BOOLEAN := false;
    admin_email TEXT := 'santiago.marcos@gmail.com';
    expected_admin_id TEXT := '08c4845d-28e2-4a9a-b05d-350fac947b28';
BEGIN
    -- Verificar en auth.users
    SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;
    IF FOUND THEN
        admin_exists_auth := true;
        RAISE NOTICE '✅ Admin encontrado en auth.users con ID: %', admin_id;
        
        -- Verificar si el ID coincide con el esperado
        IF admin_id::text = expected_admin_id THEN
            RAISE NOTICE '✅ ID del admin coincide con el esperado en AdminDashboard.jsx';
        ELSE
            RAISE WARNING '⚠️ ID del admin (%) NO coincide con el esperado (%). Actualizar AdminDashboard.jsx', admin_id, expected_admin_id;
        END IF;
    ELSE
        RAISE WARNING '❌ Admin NO encontrado en auth.users';
    END IF;
    
    -- Verificar en public.users
    SELECT id INTO admin_id FROM public.users WHERE email = admin_email;
    IF FOUND THEN
        admin_exists_public := true;
        RAISE NOTICE '✅ Admin encontrado en public.users con ID: %', admin_id;
    ELSE
        RAISE WARNING '❌ Admin NO encontrado en public.users';
    END IF;
    
    -- Resumen
    IF admin_exists_auth AND admin_exists_public THEN
        RAISE NOTICE '🎉 Usuario admin completamente sincronizado y listo para usar';
    ELSE
        RAISE WARNING '⚠️ Problema con la sincronización del usuario admin';
    END IF;
END $$;

-- 11. Mostrar estadísticas finales
DO $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
    tags_count INTEGER;
    pets_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    SELECT COUNT(*) INTO tags_count FROM public.tags;
    SELECT COUNT(*) INTO pets_count FROM public.pets;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== ESTADÍSTICAS FINALES ===';
    RAISE NOTICE 'Usuarios en auth.users: %', auth_count;
    RAISE NOTICE 'Usuarios en public.users: %', public_count;
    RAISE NOTICE 'Tags totales: %', tags_count;
    RAISE NOTICE 'Pets totales: %', pets_count;
    RAISE NOTICE '============================';
    RAISE NOTICE '';
END $$;