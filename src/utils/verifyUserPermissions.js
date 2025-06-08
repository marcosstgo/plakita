import { supabase } from '@/lib/supabaseClient';

// Función para verificar permisos de un usuario específico
export const verifyUserPermissions = async (email) => {
  try {
    console.log(`🔍 Verificando permisos para: ${email}`);
    
    // 1. Verificar si el usuario existe en auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error accediendo a auth.users:', authError);
      return { error: 'No se puede acceder a auth.users desde el cliente' };
    }

    const authUser = authUsers?.users?.find(user => user.email === email);
    
    // 2. Verificar si existe en public.users
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (publicError) {
      console.error('Error consultando public.users:', publicError);
    }

    // 3. Verificar tags asociadas
    const { data: userTags, error: tagsError } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', publicUser?.id || authUser?.id);

    if (tagsError) {
      console.error('Error consultando tags:', tagsError);
    }

    // 4. Verificar mascotas asociadas
    const { data: userPets, error: petsError } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', publicUser?.id || authUser?.id);

    if (petsError) {
      console.error('Error consultando pets:', petsError);
    }

    // 5. Verificar si es admin
    const ADMIN_USER_ID = '08c4845d-28e2-4a9a-b05d-350fac947b28';
    const isAdmin = (publicUser?.id || authUser?.id) === ADMIN_USER_ID;

    const result = {
      email,
      authUser: authUser ? {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        email_confirmed_at: authUser.email_confirmed_at,
        last_sign_in_at: authUser.last_sign_in_at,
        user_metadata: authUser.user_metadata
      } : null,
      publicUser: publicUser || null,
      tags: userTags || [],
      pets: userPets || [],
      isAdmin,
      permissions: {
        canLogin: !!authUser,
        canAccessDashboard: !!authUser,
        canAccessAdmin: isAdmin,
        hasPublicProfile: !!publicUser,
        tagsCount: userTags?.length || 0,
        petsCount: userPets?.length || 0
      }
    };

    console.log('📊 Resultado de verificación:', result);
    return result;

  } catch (error) {
    console.error('Error verificando permisos:', error);
    return { error: error.message };
  }
};

// Función para verificar permisos desde el admin panel
export const adminVerifyUser = async (email) => {
  try {
    console.log(`🔐 [ADMIN] Verificando usuario: ${email}`);
    
    // Consulta directa a public.users
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (publicError) {
      console.error('Error en consulta public.users:', publicError);
      return { error: `Error consultando public.users: ${publicError.message}` };
    }

    if (!publicUser) {
      return { 
        error: 'Usuario no encontrado en public.users',
        suggestion: 'El usuario puede existir en auth.users pero no se ha sincronizado a public.users'
      };
    }

    // Consultar tags del usuario
    const { data: userTags, error: tagsError } = await supabase
      .from('tags')
      .select(`
        id, 
        code, 
        activated, 
        created_at, 
        pet_id,
        pets:pet_id (id, name, type)
      `)
      .eq('user_id', publicUser.id);

    if (tagsError) {
      console.error('Error consultando tags:', tagsError);
    }

    // Consultar mascotas del usuario
    const { data: userPets, error: petsError } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', publicUser.id);

    if (petsError) {
      console.error('Error consultando pets:', petsError);
    }

    // Verificar si es admin
    const ADMIN_USER_ID = '08c4845d-28e2-4a9a-b05d-350fac947b28';
    const isAdmin = publicUser.id === ADMIN_USER_ID;

    const result = {
      found: true,
      user: publicUser,
      tags: userTags || [],
      pets: userPets || [],
      isAdmin,
      stats: {
        totalTags: userTags?.length || 0,
        activatedTags: userTags?.filter(tag => tag.activated)?.length || 0,
        totalPets: userPets?.length || 0,
        activatedPets: userPets?.filter(pet => pet.qr_activated)?.length || 0
      },
      permissions: {
        canAccessDashboard: true,
        canAccessAdmin: isAdmin,
        canCreateTags: true,
        canManagePets: true
      }
    };

    console.log('✅ [ADMIN] Usuario verificado:', result);
    return result;

  } catch (error) {
    console.error('Error en verificación admin:', error);
    return { error: error.message };
  }
};