/*
  # Arreglar todas las políticas RLS y formularios

  1. Políticas RLS corregidas
    - Políticas para tags que permitan inserción por admin
    - Políticas para pets que funcionen correctamente
    - Políticas para usuarios
  
  2. Verificación de esquema
    - Todas las columnas necesarias
    - Foreign keys correctas
    - Índices optimizados
*/

-- 1. LIMPIAR TODAS LAS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Users can read own tags" ON tags;
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert tags" ON tags;
DROP POLICY IF EXISTS "Users can claim unclaimed tags" ON tags;
DROP POLICY IF EXISTS "Users can activate tags" ON tags;
DROP POLICY IF EXISTS "Anyone can read activated tags" ON tags;
DROP POLICY IF EXISTS "Admin can manage all tags" ON tags;

DROP POLICY IF EXISTS "Users can read own pets" ON pets;
DROP POLICY IF EXISTS "Users can update own pets" ON pets;
DROP POLICY IF EXISTS "Users can insert own pets" ON pets;

-- 2. CREAR POLÍTICAS CORRECTAS PARA TAGS

-- Permitir a usuarios autenticados leer sus propios tags
CREATE POLICY "Users can read own tags"
  ON tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Permitir a usuarios autenticados insertar tags (CRÍTICO para admin)
CREATE POLICY "Users can insert tags"
  ON tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR 
    user_id IS NULL OR
    auth.uid()::text = '3d4b3b56-fba6-4d76-866c-f38551c7a6c4'
  );

-- Permitir a usuarios autenticados actualizar sus propios tags
CREATE POLICY "Users can update own tags"
  ON tags
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    user_id IS NULL OR
    auth.uid()::text = '3d4b3b56-fba6-4d76-866c-f38551c7a6c4'
  );

-- Permitir lectura pública de tags activados
CREATE POLICY "Anyone can read activated tags"
  ON tags
  FOR SELECT
  TO anon
  USING (activated = true);

-- Política especial para admin (puede gestionar todos los tags)
CREATE POLICY "Admin can manage all tags"
  ON tags
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = '3d4b3b56-fba6-4d76-866c-f38551c7a6c4')
  WITH CHECK (auth.uid()::text = '3d4b3b56-fba6-4d76-866c-f38551c7a6c4');

-- 3. CREAR POLÍTICAS CORRECTAS PARA PETS

-- Permitir a usuarios leer sus propias mascotas
CREATE POLICY "Users can read own pets"
  ON pets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Permitir a usuarios insertar sus propias mascotas
CREATE POLICY "Users can insert own pets"
  ON pets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Permitir a usuarios actualizar sus propias mascotas
CREATE POLICY "Users can update own pets"
  ON pets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Permitir lectura pública de mascotas activadas
CREATE POLICY "Anyone can read activated pets"
  ON pets
  FOR SELECT
  TO anon
  USING (qr_activated = true);

-- 4. VERIFICAR Y CORREGIR ESQUEMA

-- Asegurar que todas las columnas existen
DO $$
BEGIN
  -- Verificar user_id en tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tags ADD COLUMN user_id uuid;
  END IF;

  -- Verificar created_at en tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE tags ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- Verificar qr_activated en pets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE pets ADD COLUMN qr_activated boolean DEFAULT false;
  END IF;
END $$;

-- 5. CREAR ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_activated ON tags(activated);
CREATE INDEX IF NOT EXISTS idx_tags_code_unique ON tags(code);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON pets(qr_activated);

-- 6. VERIFICAR FOREIGN KEYS
DO $$
BEGIN
  -- Eliminar foreign keys problemáticas
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tags_user_id_fkey' 
    AND table_name = 'tags'
  ) THEN
    ALTER TABLE tags DROP CONSTRAINT tags_user_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pets_user_id_fkey' 
    AND table_name = 'pets'
  ) THEN
    ALTER TABLE pets DROP CONSTRAINT pets_user_id_fkey;
  END IF;

  -- Crear foreign keys correctas
  ALTER TABLE tags
  ADD CONSTRAINT tags_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

  ALTER TABLE pets
  ADD CONSTRAINT pets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

  ALTER TABLE tags
  ADD CONSTRAINT tags_pet_id_fkey
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL;
END $$;

-- 7. LIMPIAR DATOS INCONSISTENTES
UPDATE tags SET user_id = NULL WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
UPDATE pets SET user_id = (SELECT id FROM public.users WHERE email = 'santiago.marcos@gmail.com') 
WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);

-- 8. VERIFICACIÓN FINAL
DO $$
DECLARE
    admin_id uuid;
    tags_count integer;
    pets_count integer;
    users_count integer;
BEGIN
    -- Obtener ID del admin
    SELECT id INTO admin_id FROM public.users WHERE email = 'santiago.marcos@gmail.com';
    
    -- Contar registros
    SELECT COUNT(*) INTO tags_count FROM tags;
    SELECT COUNT(*) INTO pets_count FROM pets;
    SELECT COUNT(*) INTO users_count FROM public.users;
    
    RAISE NOTICE '=== VERIFICACIÓN FINAL ===';
    RAISE NOTICE 'Admin ID: %', admin_id;
    RAISE NOTICE 'Tags: %', tags_count;
    RAISE NOTICE 'Pets: %', pets_count;
    RAISE NOTICE 'Users: %', users_count;
    RAISE NOTICE '========================';
    
    IF admin_id IS NOT NULL THEN
        RAISE NOTICE '✅ Usuario admin encontrado y listo';
    ELSE
        RAISE WARNING '❌ Usuario admin NO encontrado';
    END IF;
END $$;