/*
  # Corregir esquema de base de datos - Versión simplificada

  1. Agregar columnas faltantes
  2. Crear foreign keys
  3. Configurar RLS básico
*/

-- Agregar columna user_id a tags si no existe
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS user_id UUID;

-- Agregar columna qr_activated a pets si no existe  
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS qr_activated BOOLEAN DEFAULT false;

-- Agregar columna created_at a tags si no existe
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Eliminar constraints problemáticos si existen
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_user_id_fkey;
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_pet_id_fkey;
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_user_id_fkey;

-- Crear foreign keys
ALTER TABLE public.tags 
ADD CONSTRAINT tags_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.tags 
ADD CONSTRAINT tags_pet_id_fkey 
FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE SET NULL;

ALTER TABLE public.pets 
ADD CONSTRAINT pets_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON public.tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON public.tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON public.tags(created_at);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON public.pets(qr_activated);

-- Actualizar datos existentes
UPDATE public.pets 
SET qr_activated = true 
WHERE id IN (
  SELECT DISTINCT pet_id 
  FROM public.tags 
  WHERE activated = true AND pet_id IS NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can read own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can insert tags" ON public.tags;
DROP POLICY IF EXISTS "Users can claim unclaimed tags" ON public.tags;
DROP POLICY IF EXISTS "Users can activate tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can read activated tags" ON public.tags;

-- Crear políticas básicas para tags
CREATE POLICY "Users can read own tags"
  ON public.tags FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own tags"
  ON public.tags FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert tags"
  ON public.tags FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can read activated tags"
  ON public.tags FOR SELECT TO anon
  USING (activated = true);

-- Eliminar políticas existentes de pets
DROP POLICY IF EXISTS "Users can read own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can insert own pets" ON public.pets;

-- Crear políticas básicas para pets
CREATE POLICY "Users can read own pets"
  ON public.pets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own pets"
  ON public.pets FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own pets"
  ON public.pets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());