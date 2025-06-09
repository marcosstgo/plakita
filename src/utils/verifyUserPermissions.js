import { supabase, getAdminUsersList, getAdminUserVerification } from '@/lib/supabaseClient';

// Función para verificar permisos desde el admin panel usando funciones seguras
export const adminVerifyUser = async (email) => {
  try {
    console.log(`🔐 [ADMIN] Verificando usuario: ${email}`);
    
    const result = await getAdminUserVerification(email);
    
    if (!result.success) {
      // Si no se encuentra, buscar usuarios similares
      console.log('🔍 Usuario no encontrado, buscando similares...');
      
      const listResult = await getAdminUsersList();
      if (listResult.success) {
        const similarUsers = listResult.data.filter(user => 
          user.email.toLowerCase().includes(email.toLowerCase().split('@')[0])
        );
        
        return { 
          found: false,
          error: result.error || 'Usuario no encontrado',
          suggestions: {
            similarEmails: similarUsers.slice(0, 5),
            message: `No se encontró el usuario "${email}". Verifica que el email sea correcto o que el usuario se haya registrado en el sistema.`
          }
        };
      }
      
      return { 
        found: false,
        error: result.error || 'Usuario no encontrado'
      };
    }

    // Verificar si es admin
    const ADMIN_USER_ID = '3d4b3b56-fba6-4d76-866c-f38551c7a6c4';
    const isAdmin = result.data.user.id === ADMIN_USER_ID || result.data.user.email === 'santiago.marcos@gmail.com';

    const finalResult = {
      found: true,
      user: result.data.user,
      tags: result.data.tags || [],
      pets: result.data.pets || [],
      isAdmin,
      stats: result.data.stats || {
        totalTags: 0,
        activatedTags: 0,
        totalPets: 0,
        activatedPets: 0
      },
      permissions: {
        canAccessDashboard: true,
        canAccessAdmin: isAdmin,
        canCreateTags: true,
        canManagePets: true
      }
    };

    console.log('✅ [ADMIN] Usuario verificado:', finalResult);
    return finalResult;

  } catch (error) {
    console.error('Error en verificación admin:', error);
    return { error: error.message };
  }
};

// Función para listar todos los usuarios usando función segura
export const listAllUsers = async () => {
  try {
    console.log('📋 Listando todos los usuarios...');
    
    const result = await getAdminUsersList();
    
    if (!result.success) {
      throw new Error(result.error);
    }

    return { users: result.data };

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

    // Verificar acceso a funciones de admin
    try {
      const { data, error } = await supabase.rpc('get_user_statistics');
      health.admin_functions = { available: !error, error: error?.message };
      if (error) health.overall = false;
    } catch (error) {
      health.admin_functions = { available: false, error: error.message };
      health.overall = false;
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