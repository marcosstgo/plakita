/*
  # Add User Roles System

  1. Changes
    - Add `role` column to `users` table with default value 'user'
    - Valid roles: 'user', 'admin'
    - Set santiago.marcos@gmail.com as admin
  
  2. Security
    - Users can only view their own role
    - Only admins can update roles
*/

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Set santiago.marcos@gmail.com as admin
UPDATE users 
SET role = 'admin' 
WHERE id = '0b89482f-4271-49d8-a71f-afeb261a30f2';

-- Add check constraint for valid roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

-- Update RLS policies for role management
DROP POLICY IF EXISTS "Users can view own role" ON users;
CREATE POLICY "Users can view own role"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    -- Users can update their own data but not their role
    auth.uid() = id AND role = (SELECT role FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update any user" ON users;
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );