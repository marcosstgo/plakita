-- Corregir políticas RLS para permitir creación de tags
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Eliminar todas las políticas existentes de tags
DROP POLICY IF EXISTS "Users can read own tags" ON tags;
DROP POLICY IF EXISTS "Users can claim and update tags" ON tags;
DROP POLICY IF EXISTS "Anyone can read activated tags" ON tags;
DROP POLICY IF EXISTS "Admin can create unassigned tags" ON tags;
DROP POLICY IF EXISTS "Admin can manage all tags" ON tags;

-- 2. Crear políticas RLS más permisivas para tags

-- Permitir a usuarios autenticados leer tags
CREATE POLICY "Authenticated users can read tags"
  ON tags FOR SELECT TO authenticated
  USING (true);

-- Permitir a usuarios anónimos leer tags activados
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

-- Permitir a admin eliminar tags
CREATE POLICY "Admin can delete tags"
  ON tags FOR DELETE TO authenticated
  USING (
    auth.uid()::text = (
      SELECT users.id::text 
      FROM users 
      WHERE users.email = 'santiago.marcos@gmail.com'
    )
  );

-- 3. Verificar que las políticas se aplicaron correctamente
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'tags';
  
  RAISE NOTICE '✅ Políticas RLS actualizadas para tabla tags';
  RAISE NOTICE '📊 Total de políticas activas: %', policy_count;
  RAISE NOTICE '🔓 Ahora los usuarios autenticados pueden crear y gestionar tags';
END $$;