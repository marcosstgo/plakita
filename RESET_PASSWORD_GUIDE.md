# Guía para Resetear Contraseña del Usuario Admin

## Opción 1: Desde el Dashboard de Supabase (Recomendado)

1. **Ir al Dashboard de Supabase:**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto `pjojqwgxopdclfsovlgt`

2. **Navegar a Authentication:**
   - En el menú lateral, haz clic en "Authentication"
   - Luego en "Users"

3. **Encontrar el usuario:**
   - Busca el usuario `santiago.marcos@gmail.com`
   - Debería aparecer con ID: `3d4b3b56-fba6-4d76-866c-f38551c7a6c4`

4. **Resetear contraseña:**
   - Haz clic en los tres puntos (...) al lado del usuario
   - Selecciona "Send password reset email"
   - O selecciona "Reset password" para establecer una nueva directamente

## Opción 2: Desde SQL Editor

Si prefieres hacerlo desde SQL, puedes ejecutar:

```sql
-- Opción A: Enviar email de reset
SELECT auth.send_password_reset_email('santiago.marcos@gmail.com');

-- Opción B: Cambiar contraseña directamente (reemplaza 'nueva_contraseña')
UPDATE auth.users 
SET encrypted_password = crypt('nueva_contraseña', gen_salt('bf'))
WHERE email = 'santiago.marcos@gmail.com';
```

## Opción 3: Crear nueva contraseña temporal

Si quieres establecer una contraseña específica temporalmente:

```sql
-- Establecer contraseña temporal "admin123"
UPDATE auth.users 
SET encrypted_password = crypt('admin123', gen_salt('bf'))
WHERE email = 'santiago.marcos@gmail.com';
```

## Verificar que el usuario existe

```sql
-- Verificar usuario en auth.users
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email = 'santiago.marcos@gmail.com';

-- Verificar usuario en public.users
SELECT id, email, full_name, created_at 
FROM public.users 
WHERE email = 'santiago.marcos@gmail.com';
```

## Después del reset

1. **Intenta hacer login** con la nueva contraseña
2. **Ve al panel de admin** en `/admin` para verificar que todo funciona
3. **Cambia la contraseña** por una más segura desde el perfil

## Notas importantes

- El usuario ya está correctamente sincronizado en `public.users`
- El ID del admin ya está actualizado en el código: `3d4b3b56-fba6-4d76-866c-f38551c7a6c4`
- La aplicación ya está configurada para reconocer tanto el ID como el email como admin