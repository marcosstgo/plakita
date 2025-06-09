/*
  # Agregar campo teléfono a usuarios

  1. Cambios en tabla users
    - Agregar columna `phone` (text, opcional)
    - Agregar índice para búsquedas por teléfono

  2. Cambios en tabla pets  
    - Agregar columna `owner_phone` (text, opcional)
    - Mantener `owner_contact` para compatibilidad

  3. Seguridad
    - Mantener políticas RLS existentes
    - El campo phone es opcional y privado
*/

-- Agregar campo phone a la tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;

-- Agregar campo owner_phone a la tabla pets para separar teléfono de email
ALTER TABLE pets ADD COLUMN IF NOT EXISTS owner_phone text;

-- Crear índice para búsquedas por teléfono (opcional, para futuras funcionalidades)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Crear índice para teléfonos de dueños de mascotas
CREATE INDEX IF NOT EXISTS idx_pets_owner_phone ON pets(owner_phone) WHERE owner_phone IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN users.phone IS 'Número de teléfono del usuario (opcional)';
COMMENT ON COLUMN pets.owner_phone IS 'Teléfono del dueño de la mascota (separado del email)';