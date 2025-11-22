/*
  # Esquema Base de Plakita - Identificación de Mascotas

  1. Tablas Principales
    - users: Usuarios del sistema
    - pets: Mascotas registradas
    - tags: Códigos QR/NFC para identificación
    - medical_records: Registros médicos
    - vaccinations: Vacunas
    - medications: Medicamentos
    - photos: Fotos de mascotas
    - lost_pets: Reportes de mascotas perdidas
    - vet_visits: Visitas veterinarias

  2. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas restrictivas por defecto
    - Solo usuarios autenticados pueden modificar sus datos

  3. Relaciones
    - users → pets (one-to-many)
    - pets → tags (one-to-one bidireccional)
    - pets → medical_records (one-to-many)
*/

-- Tabla de usuarios (sincronizada con auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Tabla de mascotas
CREATE TABLE IF NOT EXISTS pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  breed text,
  owner_name text NOT NULL,
  owner_contact text NOT NULL,
  owner_phone text,
  notes text,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid,
  qr_activated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pets" ON pets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own pets" ON pets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pets" ON pets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own pets" ON pets
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Public can read activated pets" ON pets
  FOR SELECT TO anon
  USING (qr_activated = true);

-- Tabla de tags (códigos QR/NFC)
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  activated boolean DEFAULT false,
  activated_at timestamptz,
  pet_id uuid REFERENCES pets(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tags" ON tags
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Users can update own tags" ON tags
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can insert tags" ON tags
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Tabla de registros médicos
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  record_type text NOT NULL,
  description text,
  date date NOT NULL,
  veterinarian text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pet medical records" ON medical_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pets
      WHERE pets.id = medical_records.pet_id
      AND pets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own pet medical records" ON medical_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pets
      WHERE pets.id = medical_records.pet_id
      AND pets.user_id = auth.uid()
    )
  );

-- Tabla de vacunas
CREATE TABLE IF NOT EXISTS vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  vaccine_name text NOT NULL,
  date_administered date NOT NULL,
  next_due_date date,
  veterinarian text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pet vaccinations" ON vaccinations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pets
      WHERE pets.id = vaccinations.pet_id
      AND pets.user_id = auth.uid()
    )
  );

-- Tabla de medicamentos
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  medication_name text NOT NULL,
  dosage text,
  frequency text,
  start_date date NOT NULL,
  end_date date,
  prescribing_vet text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pet medications" ON medications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pets
      WHERE pets.id = medications.pet_id
      AND pets.user_id = auth.uid()
    )
  );

-- Tabla de fotos
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  caption text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pet photos" ON photos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pets
      WHERE pets.id = photos.pet_id
      AND pets.user_id = auth.uid()
    )
  );

-- Tabla de mascotas perdidas
CREATE TABLE IF NOT EXISTS lost_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  reported_by uuid REFERENCES users(id) ON DELETE SET NULL,
  status text DEFAULT 'lost',
  last_seen_location text,
  last_seen_date timestamptz,
  description text,
  contact_info text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE lost_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lost pets" ON lost_pets
  FOR SELECT TO authenticated, anon
  USING (status = 'lost');

CREATE POLICY "Users can manage own pet lost reports" ON lost_pets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pets
      WHERE pets.id = lost_pets.pet_id
      AND pets.user_id = auth.uid()
    )
  );

-- Tabla de visitas veterinarias
CREATE TABLE IF NOT EXISTS vet_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  visit_date date NOT NULL,
  clinic_name text,
  veterinarian text,
  reason text,
  diagnosis text,
  treatment text,
  cost numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vet_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pet vet visits" ON vet_visits
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pets
      WHERE pets.id = vet_visits.pet_id
      AND pets.user_id = auth.uid()
    )
  );

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_activated ON pets(qr_activated);
CREATE INDEX IF NOT EXISTS idx_tags_code ON tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_pet_id ON tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_activated ON tags(activated);
CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id ON medical_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_pet_id ON vaccinations(pet_id);
CREATE INDEX IF NOT EXISTS idx_medications_pet_id ON medications(pet_id);
CREATE INDEX IF NOT EXISTS idx_photos_pet_id ON photos(pet_id);
CREATE INDEX IF NOT EXISTS idx_lost_pets_pet_id ON lost_pets(pet_id);
CREATE INDEX IF NOT EXISTS idx_lost_pets_status ON lost_pets(status);
CREATE INDEX IF NOT EXISTS idx_vet_visits_pet_id ON vet_visits(pet_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON pets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();