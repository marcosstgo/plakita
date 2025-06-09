/*
  # Corregir políticas RLS para permitir creación de tags

  1. Cambios en políticas
    - Eliminar políticas restrictivas existentes de forma segura
    - Crear políticas más permisivas para usuarios autenticados
    - Mantener seguridad pero permitir funcionalidad completa

  2. Seguridad
    - Usuarios autenticados pueden crear, leer y actualizar tags
    - Usuarios anónimos solo pueden leer tags activados
    - Solo admin puede eliminar tags
*/

-- 1. Eliminar políticas existentes de forma segura (solo si existen)
DO $$
BEGIN
  -- Eliminar políticas de tags si existen
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users can read own tags') THEN
    DROP POLICY "Users can read own tags" ON tags;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users can claim and update tags') THEN
    DROP POLICY "Users can claim and update tags" ON tags;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Anyone can read activated tags') THEN
    DROP POLICY "Anyone can read activated tags" ON tags;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Admin can create unassigned tags') THEN
    DROP POLICY "Admin can create unassigned tags" ON tags;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Admin can manage all tags') THEN
    DROP POLICY "Admin can manage all tags" ON tags;
  END IF;
  
  -- Eliminar políticas nuevas si ya existen (por si se ejecutó parcialmente antes)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Authenticated users can read tags') THEN
    DROP POLICY "Authenticated users can read tags" ON tags;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Authenticated users can create tags') THEN
    DROP POLICY "Authenticated users can create tags" ON tags;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Authenticated users can update tags') THEN
    DROP POLICY "Authenticated users can update tags" ON tags;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Admin can delete tags') THEN
    DROP POLICY "Admin can delete tags" ON tags;
  END IF;
  
  RAISE NOTICE '🗑️ Políticas existentes eliminadas de forma segura';
END $$;

-- 2. Crear nuevas políticas RLS más permisivas

-- Permitir a usuarios autenticados leer todos los tags
CREATE POLICY "Authenticated users can read tags"
  ON tags FOR SELECT TO authenticated
  USING (true);

-- Permitir a usuarios anónimos leer solo tags activados
CREATE POLICY "Anyone can read activated tags"
  ON tags FOR SELECT TO anon
  USING (activated = true);

-- Permitir a usuarios autenticados crear tags
CREATE POLICY "Authenticated users can create tags"
  ON tags FOR INSERT TO authenticated
  WITH CHECK (true);

-- Permitir a usuarios autenticados actualizar tags
CREATE POLICY "Authenticated users can update tags"
  ON tags FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Solo admin puede eliminar tags
CREATE POLICY "Admin can delete tags"
  ON tags FOR DELETE TO authenticated
  USING (
    auth.uid()::text IN (
      SELECT users.id::text 
      FROM users 
      WHERE users.email = 'santiago.marcos@gmail.com'
    )
  );

-- 3. Verificar que RLS está habilitado
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- 4. Verificar configuración final
DO $$
DECLARE
  policy_count integer;
  rls_enabled boolean;
BEGIN
  -- Contar políticas
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'tags';
  
  -- Verificar RLS
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class 
  WHERE relname = 'tags';
  
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '📊 Total de políticas RLS activas: %', policy_count;
  RAISE NOTICE '🔒 RLS habilitado: %', rls_enabled;
  RAISE NOTICE '🔓 Usuarios autenticados ahora pueden crear y gestionar tags';
  RAISE NOTICE '👀 Usuarios anónimos pueden leer tags activados';
  RAISE NOTICE '🛡️ Solo admin puede eliminar tags';
END $$;