-- Migración final para crear la estructura completa y tags de prueba
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar y crear tabla tags con todas las columnas
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  activated boolean DEFAULT false,
  activated_at timestamptz,
  pet_id uuid,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

-- 2. Agregar columnas faltantes si no existen
DO $$
BEGIN
  -- user_id en tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tags ADD COLUMN user_id uuid;
  END IF;

  -- created_at en tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE tags ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- activated_at en tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'activated_at'
  ) THEN
    ALTER TABLE tags ADD COLUMN activated_at timestamptz;
  END IF;

  -- qr_activated en pets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'qr_activated'
  ) THEN
    ALTER TABLE pets ADD COLUMN qr_activated boolean DEFAULT false;
  END IF;

  -- owner_phone en pets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'owner_phone'
  ) THEN
    ALTER TABLE pets ADD COLUMN owner_phone text;
  END IF;

  -- phone en users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone text;
  END IF;
END $$;

-- 3. Crear foreign keys si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tags_user_id_fkey'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tags_pet_id_fkey'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_pet_id_fkey 
      FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Crear índices
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_code ON tags(code);
CREATE UNIQUE INDEX IF NOT EXISTS tags_code_key ON tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_activated ON tags(activated);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_pets_owner_phone ON pets(owner_phone) WHERE owner_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- 5. Habilitar RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas RLS para tags
DROP POLICY IF EXISTS "Users can read own tags" ON tags;
CREATE POLICY "Users can read own tags"
  ON tags FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can claim and update tags" ON tags;
CREATE POLICY "Users can claim and update tags"
  ON tags FOR UPDATE TO authenticated
  USING (
    user_id IS NULL OR 
    user_id = auth.uid() OR 
    (auth.uid()::text = (SELECT users.id::text FROM users WHERE users.email = 'santiago.marcos@gmail.com'))
  );

DROP POLICY IF EXISTS "Anyone can read activated tags" ON tags;
CREATE POLICY "Anyone can read activated tags"
  ON tags FOR SELECT TO anon
  USING (activated = true);

DROP POLICY IF EXISTS "Admin can create unassigned tags" ON tags;
CREATE POLICY "Admin can create unassigned tags"
  ON tags FOR INSERT TO authenticated
  WITH CHECK (
    (user_id IS NULL AND (auth.uid()::text = (SELECT users.id::text FROM users WHERE users.email = 'santiago.marcos@gmail.com'))) OR 
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admin can manage all tags" ON tags;
CREATE POLICY "Admin can manage all tags"
  ON tags FOR ALL TO authenticated
  USING (auth.uid()::text = (SELECT users.id::text FROM users WHERE users.email = 'santiago.marcos@gmail.com'))
  WITH CHECK (auth.uid()::text = (SELECT users.id::text FROM users WHERE users.email = 'santiago.marcos@gmail.com'));

-- 7. CREAR TAGS DE PRUEBA (INCLUYENDO PLK-TR0DFY)
INSERT INTO tags (code, activated, user_id, created_at) VALUES
  ('PLK-TR0DFY', false, null, now()),
  ('PLK-970MPY', false, null, now()),
  ('PLK-TEST01', false, null, now()),
  ('PLK-TEST02', false, null, now()),
  ('PLK-TEST03', false, null, now()),
  ('PLK-TEST04', false, null, now()),
  ('PLK-TEST05', false, null, now()),
  ('PLK-DEMO01', false, null, now()),
  ('PLK-DEMO02', false, null, now()),
  ('PLK-DEMO03', false, null, now())
ON CONFLICT (code) DO NOTHING;

-- 8. Crear vista
CREATE OR REPLACE VIEW active_tags_with_pets AS
SELECT 
  t.id as tag_id,
  t.code,
  t.activated,
  t.user_id,
  t.pet_id,
  p.name as pet_name,
  p.type as pet_type,
  p.breed as pet_breed,
  p.qr_activated
FROM tags t
LEFT JOIN pets p ON t.pet_id = p.id
WHERE t.activated = true;

-- 9. Verificación final
DO $$
DECLARE
  tag_count integer;
  plk_tr0dfy_exists boolean;
  plk_970mpy_exists boolean;
BEGIN
  SELECT COUNT(*) INTO tag_count FROM tags;
  SELECT EXISTS(SELECT 1 FROM tags WHERE code = 'PLK-TR0DFY') INTO plk_tr0dfy_exists;
  SELECT EXISTS(SELECT 1 FROM tags WHERE code = 'PLK-970MPY') INTO plk_970mpy_exists;
  
  RAISE NOTICE '🎉 MIGRACIÓN COMPLETADA';
  RAISE NOTICE '📊 Tags creados: %', tag_count;
  RAISE NOTICE '✅ PLK-TR0DFY existe: %', plk_tr0dfy_exists;
  RAISE NOTICE '✅ PLK-970MPY existe: %', plk_970mpy_exists;
  RAISE NOTICE '🚀 Ahora puedes probar con cualquiera de estos códigos';
END $$;