/*
  # Fix Admin Tag Creation Policy

  1. Changes
    - Drop the overly permissive "Admins can insert tags" policy
    - Create a new restrictive policy that ONLY allows users with role='admin' to insert tags
    - Add policy for admins to update any tag
    - Add policy for admins to delete any tag
  
  2. Security
    - Only authenticated users with role='admin' can create tags
    - Only admins can delete tags
    - Only admins can update any tag (users can still update their own)
*/

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Admins can insert tags" ON tags;

-- Create proper admin insert policy
CREATE POLICY "Only admins can insert tags"
  ON tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Allow admins to update any tag
CREATE POLICY "Admins can update any tag"
  ON tags
  FOR UPDATE
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

-- Allow admins to delete any tag
CREATE POLICY "Admins can delete any tag"
  ON tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
