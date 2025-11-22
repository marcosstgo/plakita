/*
  # Agregar campos adicionales a la tabla pets

  1. Nuevos Campos
    - `age` (text): Edad de la mascota (ej: "3 años")
    - `color` (text): Color de la mascota (ej: "Negro con marrón")
    - `location` (text): Ubicación (ej: "San Juan, Puerto Rico")

  2. Notas
    - Todos los campos son opcionales
    - Se utilizan para mostrar información adicional en el perfil público
    - El campo `created_at` existente se usará para mostrar la fecha de activación
*/

-- Agregar campos adicionales a la tabla pets
ALTER TABLE pets 
  ADD COLUMN IF NOT EXISTS age text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS location text;