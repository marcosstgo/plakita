/*
  # Remover políticas de debug

  1. Limpieza
    - Remueve las políticas temporales de debug
    - Restaura la seguridad normal
    
  2. Ejecutar después de verificar esquema
    - Solo cuando las columnas funcionen correctamente
*/

-- Remover políticas de debug
DROP POLICY IF EXISTS "Debug read tags" ON public.tags;
DROP POLICY IF EXISTS "Debug read pets" ON public.pets;

-- Confirmar que las políticas normales están activas
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas de debug removidas';
  RAISE NOTICE 'Verificando políticas de seguridad normales...';
  
  -- Verificar que existen las políticas normales
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tags' 
    AND policyname = 'Users can read own tags'
  ) THEN
    RAISE NOTICE '✅ Política "Users can read own tags" activa';
  ELSE
    RAISE WARNING '⚠️  Política "Users can read own tags" NO encontrada';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'pets' 
    AND policyname = 'Users can read own pets'
  ) THEN
    RAISE NOTICE '✅ Política "Users can read own pets" activa';
  ELSE
    RAISE WARNING '⚠️  Política "Users can read own pets" NO encontrada';
  END IF;
END $$;