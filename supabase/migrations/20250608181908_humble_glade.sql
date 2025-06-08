/*
  # Políticas de debug temporales

  1. Políticas temporales
    - Permite lectura anónima para debug
    - Solo para verificar que las columnas existen
    
  2. Importante
    - Estas políticas son SOLO para debug
    - Deben ser removidas en producción
*/

-- Crear políticas temporales de debug para tags (SOLO PARA TESTING)
CREATE POLICY "Debug read tags"
  ON public.tags
  FOR SELECT
  TO anon
  USING (true);

-- Crear políticas temporales de debug para pets (SOLO PARA TESTING)  
CREATE POLICY "Debug read pets"
  ON public.pets
  FOR SELECT
  TO anon
  USING (true);

-- Notificar que estas son políticas temporales
DO $$
BEGIN
  RAISE NOTICE '⚠️  POLÍTICAS DE DEBUG CREADAS - REMOVER EN PRODUCCIÓN';
  RAISE NOTICE 'Estas políticas permiten lectura anónima para verificar esquema';
  RAISE NOTICE 'Ejecutar remove_debug_policies.sql cuando el esquema esté verificado';
END $$;