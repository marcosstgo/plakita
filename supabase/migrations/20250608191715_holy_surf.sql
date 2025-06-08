/*
  # Configuración completa de la base de datos Plakita

  Esta migración configura toda la base de datos desde cero, incluyendo:

  1. Tablas principales
     - `users` - Usuarios del sistema
     - `tags` - Códigos QR de las Plakitas
     - `pets` - Información de las mascotas
     - `medical_records` - Registros médicos
     - `vaccinations` - Vacunas
     - `medications` - Medicamentos
     - `photos` - Fotos de mascotas
     - `lost_pets` - Reportes de mascotas perdidas
     - `vet_visits` - Visitas veterinarias

  2. Seguridad
     - Habilitar RLS en todas las tablas
     - Políticas de seguridad apropiadas
     - Trigger para sincronización de usuarios

  3. Índices y optimizaciones
     - Índices para consultas frecuentes
     - Foreign keys para integridad referencial
*/

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLA: users (Usuarios del sistema)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- RLS para users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Políticas para users
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- =============================================
-- TABLA: tags (Códigos QR de las Plakitas)
-- =============================================
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  activated boolean DEFAULT false,
  activated_at timestamptz,
  pet_id uuid,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Índices para tags
CREATE INDEX IF NOT EXISTS idx_tags_code ON tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_activated ON tags(activated);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at);

-- RLS para tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Políticas para tags
DROP POLICY IF EXISTS "Anyone can read activated tags" ON tags;
CREATE POLICY "Anyone can read activated tags"
  ON tags FOR SELECT
  TO anon
  USING (activated = true);

DROP POLICY IF EXISTS "Users can read own tags" ON tags;
CREATE POLICY "Users can read own tags"
  ON tags FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert tags" ON tags;
CREATE POLICY "Users can insert tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own tags" ON tags;
CREATE POLICY "Users can update own tags"
  ON tags FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can claim unclaimed tags" ON tags;
CREATE POLICY "Users can claim unclaimed tags"
  ON tags FOR UPDATE
  TO authenticated
  USING ((user_id IS NULL) OR (user_id = auth.uid()));

-- =============================================
-- TABLA: pets (Información de las mascotas)
-- =============================================
CREATE TABLE IF NOT EXISTS pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  breed text,
  owner_name text NOT NULL,
  owner_contact text NOT NULL,
  notes text,
  user_id uuid NOT NULL,
  tag_id uuid,
  qr_activated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Índices para pets
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_tag_id ON pets(tag_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON pets(qr_activated);

-- RLS para pets
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- Políticas para pets
DROP POLICY IF EXISTS "Users can read own pets" ON pets;
CREATE POLICY "Users can read own pets"
  ON pets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own pets" ON pets;
CREATE POLICY "Users can insert own pets"
  ON pets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own pets" ON pets;
CREATE POLICY "Users can update own pets"
  ON pets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can read activated pets" ON pets;
CREATE POLICY "Anyone can read activated pets"
  ON pets FOR SELECT
  TO anon
  USING (qr_activated = true);

-- =============================================
-- TABLA: medical_records (Registros médicos)
-- =============================================
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  record_date date NOT NULL,
  description text NOT NULL,
  diagnosis text,
  treatment text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Índices para medical_records
CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id ON medical_records(pet_id);

-- RLS para medical_records
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Políticas para medical_records
DROP POLICY IF EXISTS "Users can read own pet medical records" ON medical_records;
CREATE POLICY "Users can read own pet medical records"
  ON medical_records FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = medical_records.pet_id 
    AND pets.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own pet medical records" ON medical_records;
CREATE POLICY "Users can insert own pet medical records"
  ON medical_records FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = medical_records.pet_id 
    AND pets.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own pet medical records" ON medical_records;
CREATE POLICY "Users can update own pet medical records"
  ON medical_records FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = medical_records.pet_id 
    AND pets.user_id = auth.uid()
  ));

-- =============================================
-- TABLA: vaccinations (Vacunas)
-- =============================================
CREATE TABLE IF NOT EXISTS vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  vaccine_name text NOT NULL,
  application_date date NOT NULL,
  next_due_date date,
  vet_name text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Índices para vaccinations
CREATE INDEX IF NOT EXISTS idx_vaccinations_pet_id ON vaccinations(pet_id);

-- RLS para vaccinations
ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;

-- Políticas para vaccinations
DROP POLICY IF EXISTS "Users can read own pet vaccinations" ON vaccinations;
CREATE POLICY "Users can read own pet vaccinations"
  ON vaccinations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = vaccinations.pet_id 
    AND pets.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own pet vaccinations" ON vaccinations;
CREATE POLICY "Users can insert own pet vaccinations"
  ON vaccinations FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = vaccinations.pet_id 
    AND pets.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own pet vaccinations" ON vaccinations;
CREATE POLICY "Users can update own pet vaccinations"
  ON vaccinations FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = vaccinations.pet_id 
    AND pets.user_id = auth.uid()
  ));

-- =============================================
-- TABLA: medications (Medicamentos)
-- =============================================
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Índices para medications
CREATE INDEX IF NOT EXISTS idx_medications_pet_id ON medications(pet_id);

-- RLS para medications
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Políticas para medications
DROP POLICY IF EXISTS "Users can read own pet medications" ON medications;
CREATE POLICY "Users can read own pet medications"
  ON medications FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = medications.pet_id 
    AND pets.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own pet medications" ON medications;
CREATE POLICY "Users can insert own pet medications"
  ON medications FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = medications.pet_id 
    AND pets.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own pet medications" ON medications;
CREATE POLICY "Users can update own pet medications"
  ON medications FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = medications.pet_id 
    AND pets.user_id = auth.uid()
  ));

-- =============================================
-- TABLA: photos (Fotos de mascotas)
-- =============================================
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  url text NOT NULL,
  description text,
  taken_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Índices para photos
CREATE INDEX IF NOT EXISTS idx_photos_pet_id ON photos(pet_id);

-- RLS para photos
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Políticas para photos
DROP POLICY IF EXISTS "Users can read own pet photos" ON photos;
CREATE POLICY "Users can read own pet photos"
  ON photos FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = photos.pet_id 
    AND pets.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own pet photos" ON photos;
CREATE POLICY "Users can insert own pet photos"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = photos.pet_id 
    AND pets.user_id = auth.uid()
  ));

-- =============================================
-- TABLA: lost_pets (Reportes de mascotas perdidas)
-- =============================================
CREATE TABLE IF NOT EXISTS lost_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  last_seen_date timestamptz NOT NULL,
  last_seen_location text NOT NULL,
  description text,
  contact_info text NOT NULL,
  is_found boolean DEFAULT false,
  found_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Índices para lost_pets
CREATE INDEX IF NOT EXISTS idx_lost_pets_pet_id ON lost_pets(pet_id);

-- RLS para lost_pets
ALTER TABLE lost_pets ENABLE ROW LEVEL SECURITY;

-- Políticas para lost_pets
DROP POLICY IF EXISTS "Anyone can read lost pet reports" ON lost_pets;
CREATE POLICY "Anyone can read lost pet reports"
  ON lost_pets FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Users can insert own lost pet reports" ON lost_pets;
CREATE POLICY "Users can insert own lost pet reports"
  ON lost_pets FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = lost_pets.pet_id 
    AND pets.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own lost pet reports" ON lost_pets;
CREATE POLICY "Users can update own lost pet reports"
  ON lost_pets FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = lost_pets.pet_id 
    AND pets.user_id = auth.uid()
  ));

-- =============================================
-- TABLA: vet_visits (Visitas veterinarias)
-- =============================================
CREATE TABLE IF NOT EXISTS vet_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  visit_date timestamptz NOT NULL,
  vet_name text NOT NULL,
  reason text NOT NULL,
  diagnosis text,
  treatment text,
  next_visit_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Índices para vet_visits
CREATE INDEX IF NOT EXISTS idx_vet_visits_pet_id ON vet_visits(pet_id);

-- RLS para vet_visits
ALTER TABLE vet_visits ENABLE ROW LEVEL SECURITY;

-- Políticas para vet_visits
DROP POLICY IF EXISTS "Users can read own pet vet visits" ON vet_visits;
CREATE POLICY "Users can read own pet vet visits"
  ON vet_visits FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = vet_visits.pet_id 
    AND pets.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own pet vet visits" ON vet_visits;
CREATE POLICY "Users can insert own pet vet visits"
  ON vet_visits FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = vet_visits.pet_id 
    AND pets.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own pet vet visits" ON vet_visits;
CREATE POLICY "Users can update own pet vet visits"
  ON vet_visits FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = vet_visits.pet_id 
    AND pets.user_id = auth.uid()
  ));

-- =============================================
-- FOREIGN KEYS (Integridad referencial)
-- =============================================

-- Foreign keys para tags
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tags_user_id_fkey'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tags_pet_id_fkey'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Foreign keys para pets
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pets_user_id_fkey'
  ) THEN
    ALTER TABLE pets ADD CONSTRAINT pets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Foreign keys para medical_records
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'medical_records_pet_id_fkey'
  ) THEN
    ALTER TABLE medical_records ADD CONSTRAINT medical_records_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Foreign keys para vaccinations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vaccinations_pet_id_fkey'
  ) THEN
    ALTER TABLE vaccinations ADD CONSTRAINT vaccinations_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Foreign keys para medications
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'medications_pet_id_fkey'
  ) THEN
    ALTER TABLE medications ADD CONSTRAINT medications_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Foreign keys para photos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'photos_pet_id_fkey'
  ) THEN
    ALTER TABLE photos ADD CONSTRAINT photos_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Foreign keys para lost_pets
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lost_pets_pet_id_fkey'
  ) THEN
    ALTER TABLE lost_pets ADD CONSTRAINT lost_pets_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Foreign keys para vet_visits
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vet_visits_pet_id_fkey'
  ) THEN
    ALTER TABLE vet_visits ADD CONSTRAINT vet_visits_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================
-- TRIGGER FUNCTION: Sincronización de usuarios
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- DATOS INICIALES: Tags de ejemplo para testing
-- =============================================
INSERT INTO tags (code, activated, created_at) VALUES
  ('PLK-DEMO01', false, now()),
  ('PLK-DEMO02', false, now()),
  ('PLK-DEMO03', false, now()),
  ('PLK-TEST01', false, now()),
  ('PLK-TEST02', false, now())
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Base de datos Plakita configurada exitosamente!';
  RAISE NOTICE 'Tablas creadas: users, tags, pets, medical_records, vaccinations, medications, photos, lost_pets, vet_visits';
  RAISE NOTICE 'RLS habilitado en todas las tablas';
  RAISE NOTICE 'Políticas de seguridad aplicadas';
  RAISE NOTICE 'Foreign keys configurados';
  RAISE NOTICE 'Trigger de sincronización de usuarios activo';
  RAISE NOTICE 'Tags de ejemplo creados para testing';
END $$;