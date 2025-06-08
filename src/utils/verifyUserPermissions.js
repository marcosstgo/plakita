import { supabase } from '@/lib/supabaseClient';

// Función para verificar permisos desde el admin panel con manejo de errores mejorado
export const adminVerifyUser = async (email) => {
  try {
    console.log(`🔐 [ADMIN] Verificando usuario: ${email}`);
    
    // Buscar en public.users
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (publicError) {
      console.error('Error en consulta public.users:', publicError);
      return { error: `Error consultando public.users: ${publicError.message}` };
    }

    // Si no se encuentra en public.users, buscar usuarios similares
    if (!publicUser) {
      console.log('🔍 Usuario no encontrado en public.users, buscando similares...');
      
      // Buscar emails similares (case insensitive)
      const { data: similarUsers, error: similarError } = await supabase
        .from('users')
        .select('email, full_name, id')
        .ilike('email', `%${email.split('@')[0]}%`);

      if (similarError) {
        console.error('Error buscando usuarios similares:', similarError);
      }

      return { 
        found: false,
        error: 'Usuario no encontrado en public.users',
        suggestions: {
          similarEmails: similarUsers || [],
          message: `No se encontró el usuario "${email}". Verifica que el email sea correcto o que el usuario se haya registrado en el sistema.`
        }
      };
    }

    // Si se encuentra, obtener toda la información
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

// Función para listar todos los usuarios (solo admin) con manejo de errores mejorado
export const listAllUsers = async () => {
  try {
    console.log('📋 Listando todos los usuarios...');
    
    const { data: allUsers, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Obtener estadísticas para cada usuario
    const usersWithStats = await Promise.all(
      allUsers.map(async (user) => {
        try {
          const { data: userTags } = await supabase
            .from('tags')
            .select('id, activated')
            .eq('user_id', user.id);

          const { data: userPets } = await supabase
            .from('pets')
            .select('id, qr_activated')
            .eq('user_id', user.id);

          return {
            ...user,
            stats: {
              totalTags: userTags?.length || 0,
              activatedTags: userTags?.filter(tag => tag.activated)?.length || 0,
              totalPets: userPets?.length || 0,
              activatedPets: userPets?.filter(pet => pet.qr_activated)?.length || 0
            }
          };
        } catch (error) {
          console.error(`Error getting stats for user ${user.id}:`, error);
          return {
            ...user,
            stats: {
              totalTags: 0,
              activatedTags: 0,
              totalPets: 0,
              activatedPets: 0
            }
          };
        }
      })
    );

    return { users: usersWithStats };

  } catch (error) {
    console.error('Error listando usuarios:', error);
    return { error: error.message };
  }
};

// Función para verificar el estado de la base de datos
export const verifyDatabaseHealth = async () => {
  try {
    const health = {
      tables: {},
      columns: {},
      policies: {},
      overall: true
    };

    // Verificar tablas principales
    const tables = ['users', 'tags', 'pets'];
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        health.tables[table] = { exists: !error, error: error?.message };
        if (error) health.overall = false;
      } catch (error) {
        health.tables[table] = { exists: false, error: error.message };
        health.overall = false;
      }
    }

    // Verificar columnas críticas
    const criticalColumns = [
      { table: 'tags', column: 'user_id' },
      { table: 'tags', column: 'created_at' },
      { table: 'pets', column: 'qr_activated' },
      { table: 'users', column: 'full_name' }
    ];

    for (const { table, column } of criticalColumns) {
      try {
        const { data, error } = await supabase.from(table).select(column).limit(1);
        health.columns[`${table}.${column}`] = { exists: !error, error: error?.message };
        if (error) health.overall = false;
      } catch (error) {
        health.columns[`${table}.${column}`] = { exists: false, error: error.message };
        health.overall = false;
      }
    }

    return health;

  } catch (error) {
    return { 
      overall: false, 
      error: error.message,
      tables: {},
      columns: {},
      policies: {}
    };
  }
};