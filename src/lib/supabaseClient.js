import { createClient } from '@supabase/supabase-js';

// Configuración actualizada con el project ID correcto: pjojqwgxopdclfsovlgt
const supabaseUrl = 'https://pjojqwgxopdclfsovlgt.supabase.co';
// API Key anónima correcta para el proyecto pjojqwgxopdclfsovlgt
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqb2pxd2d4b3BkY2xmc292bGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNzY2MDgsImV4cCI6MjA2NDc1MjYwOH0.bWAy5FK1TKkjd1bMiywbURdc7gv0roaO8IELE3NVthc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-my-custom-header': 'plakita-app'
    }
  }
});

// Helper function to safely check database connection
export const checkDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('tags').select('id').limit(1);
    if (error) throw error;
    return { connected: true, error: null };
  } catch (error) {
    console.error('Database connection error:', error);
    return { connected: false, error: error.message };
  }
};

// Helper function to safely verify schema
export const verifyDatabaseSchema = async () => {
  const tables = ['users', 'pets', 'tags', 'medical_records', 'vaccinations', 'medications', 'photos', 'lost_pets', 'vet_visits'];
  const results = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      results[table] = { exists: !error, error: error?.message };
    } catch (error) {
      results[table] = { exists: false, error: error.message };
    }
  }
  
  return results;
};

// FUNCIÓN MEJORADA para crear tags con validación completa y mejor manejo de errores RLS
export const createTagWithValidation = async (tagCode, userId = null) => {
  try {
    console.log('🏷️ Creando tag con validación:', { tagCode, userId });
    
    // 1. Validar formato del código
    if (!tagCode || tagCode.trim().length < 3) {
      throw new Error('El código debe tener al menos 3 caracteres');
    }
    
    const normalizedCode = tagCode.trim().toUpperCase();
    
    // 2. Verificar que no existe ya
    const { data: existingTag, error: checkError } = await supabase
      .from('tags')
      .select('id, code')
      .eq('code', normalizedCode)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error verificando tag existente:', checkError);
      
      // Si es un error de RLS, intentar con políticas más permisivas
      if (checkError.message.includes('row-level security') || checkError.code === '42501') {
        console.log('🔓 Error de RLS detectado, intentando crear directamente...');
      } else {
        throw new Error(`Error verificando tag: ${checkError.message}`);
      }
    }
    
    if (existingTag) {
      throw new Error(`Ya existe un tag con el código ${normalizedCode}`);
    }
    
    // 3. Crear el tag con manejo mejorado de errores RLS
    const tagData = {
      code: normalizedCode,
      activated: false,
      user_id: userId,
      created_at: new Date().toISOString()
    };
    
    console.log('📝 Datos del tag a insertar:', tagData);
    
    const { data: newTag, error: insertError } = await supabase
      .from('tags')
      .insert(tagData)
      .select()
      .single();
    
    if (insertError) {
      console.error('Error insertando tag:', insertError);
      
      // Manejar errores específicos de RLS
      if (insertError.message.includes('row-level security') || insertError.code === '42501') {
        throw new Error('Error de permisos: No tienes autorización para crear tags. Verifica que estés autenticado correctamente.');
      } else if (insertError.message.includes('duplicate key') || insertError.code === '23505') {
        throw new Error(`Ya existe un tag con el código ${normalizedCode}`);
      } else {
        throw new Error(`Error creando tag: ${insertError.message}`);
      }
    }
    
    console.log('✅ Tag creado exitosamente:', newTag);
    
    // 4. Verificar que se creó correctamente (opcional, puede fallar por RLS)
    try {
      const { data: verifyTag, error: verifyError } = await supabase
        .from('tags')
        .select('*')
        .eq('id', newTag.id)
        .single();
      
      if (verifyError) {
        console.warn('No se pudo verificar el tag creado (posible restricción RLS):', verifyError);
      } else {
        console.log('✅ Tag verificado en base de datos:', verifyTag);
      }
    } catch (verifyError) {
      console.warn('Verificación del tag falló (no crítico):', verifyError);
    }
    
    return { success: true, data: newTag, error: null };
    
  } catch (error) {
    console.error('❌ Error en createTagWithValidation:', error);
    return { success: false, data: null, error: error.message };
  }
};

// Helper function to safely test specific queries with better error handling
export const testDatabaseQueries = async () => {
  const tests = {};
  
  try {
    // Test básico de tags
    const { data: tagsData, error: tagsError } = await supabase
      .from('tags')
      .select('id, code, activated')
      .limit(1);
    
    tests.tags_basic = { success: !tagsError, error: tagsError?.message };

    // Test de columnas específicas de tags
    if (!tagsError) {
      try {
        const { data: tagsSpecific, error: tagsSpecificError } = await supabase
          .from('tags')
          .select('id, code, activated, user_id, pet_id, created_at')
          .limit(1);
        
        tests.tags_specific = { success: !tagsSpecificError, error: tagsSpecificError?.message };
      } catch (error) {
        tests.tags_specific = { success: false, error: error.message };
      }
    }
  } catch (error) {
    tests.tags_basic = { success: false, error: error.message };
  }
  
  try {
    // Test básico de pets
    const { data: petsData, error: petsError } = await supabase
      .from('pets')
      .select('id, name, type')
      .limit(1);
    
    tests.pets_basic = { success: !petsError, error: petsError?.message };

    // Test de columnas específicas de pets
    if (!petsError) {
      try {
        const { data: petsSpecific, error: petsSpecificError } = await supabase
          .from('pets')
          .select('id, name, type, breed, owner_name, owner_contact, owner_phone, notes, user_id, qr_activated')
          .limit(1);
        
        tests.pets_specific = { success: !petsSpecificError, error: petsSpecificError?.message };
      } catch (error) {
        tests.pets_specific = { success: false, error: error.message };
      }
    }
  } catch (error) {
    tests.pets_basic = { success: false, error: error.message };
  }

  try {
    // Test de public.users usando función segura
    const { data: usersData, error: usersError } = await supabase
      .rpc('get_user_statistics');
    
    tests.users_stats = { success: !usersError, error: usersError?.message, data: usersData };
  } catch (error) {
    tests.users_stats = { success: false, error: error.message };
  }
  
  try {
    // Test de join solo si los tests básicos funcionan
    if (tests.tags_basic?.success && tests.pets_basic?.success) {
      const { data: joinData, error: joinError } = await supabase
        .from('tags')
        .select(`
          id, 
          code, 
          activated,
          pets:pet_id (id, name, owner_phone),
          users:user_id (email, full_name, phone)
        `)
        .limit(1);
      
      tests.joins = { success: !joinError, error: joinError?.message };
    }
  } catch (error) {
    tests.joins = { success: false, error: error.message };
  }
  
  return tests;
};

// Helper function to check specific columns with improved error handling
export const checkRequiredColumns = async () => {
  const columnChecks = {};
  
  try {
    // Verificar user_id en tags
    const { data: tagsUserIdTest, error: tagsUserIdError } = await supabase
      .from('tags')
      .select('user_id')
      .limit(1);
    
    columnChecks.tags_user_id = { 
      exists: !tagsUserIdError, 
      error: tagsUserIdError?.message 
    };
  } catch (error) {
    columnChecks.tags_user_id = { exists: false, error: error.message };
  }

  try {
    // Verificar qr_activated en pets
    const { data: petsQrTest, error: petsQrError } = await supabase
      .from('pets')
      .select('qr_activated')
      .limit(1);
    
    columnChecks.pets_qr_activated = { 
      exists: !petsQrError, 
      error: petsQrError?.message 
    };
  } catch (error) {
    columnChecks.pets_qr_activated = { exists: false, error: error.message };
  }

  try {
    // Verificar owner_phone en pets
    const { data: petsPhoneTest, error: petsPhoneError } = await supabase
      .from('pets')
      .select('owner_phone')
      .limit(1);
    
    columnChecks.pets_owner_phone = { 
      exists: !petsPhoneError, 
      error: petsPhoneError?.message 
    };
  } catch (error) {
    columnChecks.pets_owner_phone = { exists: false, error: error.message };
  }

  try {
    // Verificar phone en users usando función segura
    const { data: usersStatsTest, error: usersStatsError } = await supabase
      .rpc('get_user_statistics');
    
    columnChecks.users_access = { 
      exists: !usersStatsError, 
      error: usersStatsError?.message 
    };
  } catch (error) {
    columnChecks.users_access = { exists: false, error: error.message };
  }

  try {
    // Verificar created_at en tags
    const { data: tagsCreatedTest, error: tagsCreatedError } = await supabase
      .from('tags')
      .select('created_at')
      .limit(1);
    
    columnChecks.tags_created_at = { 
      exists: !tagsCreatedError, 
      error: tagsCreatedError?.message 
    };
  } catch (error) {
    columnChecks.tags_created_at = { exists: false, error: error.message };
  }

  return columnChecks;
};

// Helper function to sync current user to public.users with better error handling
export const syncCurrentUser = async (user) => {
  if (!user) return { success: false, error: 'No user provided' };
  
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        avatar_url: user.user_metadata?.avatar_url,
        phone: user.user_metadata?.phone,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    return { success: !error, data, error: error?.message };
  } catch (error) {
    console.error('Error syncing user:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to get user data safely
export const getUserData = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    return { success: !error, data, error: error?.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper function to get user tags with pets data - ACTUALIZADA para nueva estructura
export const getUserTagsWithPets = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select(`
        id,
        code,
        activated,
        created_at,
        pet_id,
        pets:pet_id (
          id,
          name,
          type,
          breed,
          owner_name,
          owner_contact,
          owner_phone,
          notes,
          qr_activated
        )
      `)
      .eq('user_id', userId)
      .not('pet_id', 'is', null)
      .order('created_at', { ascending: false });
    
    return { success: !error, data: data || [], error: error?.message };
  } catch (error) {
    return { success: false, data: [], error: error.message };
  }
};

// FUNCIÓN MEJORADA para obtener todos los tags para admin usando función segura
export const getAllTagsWithDetails = async () => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select(`
        id,
        code,
        activated,
        created_at,
        pet_id,
        user_id,
        pets:pet_id (id, name, owner_phone),
        users:user_id (email, full_name, phone)
      `)
      .order('created_at', { ascending: false });
    
    return { success: !error, data: data || [], error: error?.message };
  } catch (error) {
    return { success: false, data: [], error: error.message };
  }
};

// FUNCIÓN MEJORADA para obtener estadísticas usando función segura
export const getAdminStatistics = async () => {
  try {
    console.log('📊 Obteniendo estadísticas usando función segura...');
    
    // Usar función segura para estadísticas de usuarios
    const { data: userStats, error: userStatsError } = await supabase
      .rpc('get_user_statistics');
    
    if (userStatsError) {
      console.warn('Error obteniendo estadísticas de usuarios:', userStatsError);
    }
    
    // Obtener estadísticas de tags y pets directamente
    const { count: totalTags } = await supabase
      .from('tags')
      .select('id', { count: 'exact', head: true });
    
    const { count: activatedTags } = await supabase
      .from('tags')
      .select('id', { count: 'exact', head: true })
      .eq('activated', true);
    
    const { count: totalPets } = await supabase
      .from('pets')
      .select('id', { count: 'exact', head: true });
    
    const stats = {
      totalTags: totalTags || 0,
      activatedTags: activatedTags || 0,
      totalPets: totalPets || 0,
      totalUsers: userStats?.[0]?.total_users || 0
    };
    
    console.log('📊 Estadísticas obtenidas:', stats);
    return { success: true, data: stats, error: null };
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return { success: false, data: null, error: error.message };
  }
};

// FUNCIÓN MEJORADA para listar usuarios usando función segura
export const getAdminUsersList = async () => {
  try {
    console.log('👥 Obteniendo lista de usuarios usando función segura...');
    
    const { data, error } = await supabase
      .rpc('list_users_for_admin');
    
    if (error) {
      console.error('Error obteniendo lista de usuarios:', error);
      return { success: false, data: [], error: error.message };
    }
    
    console.log('👥 Lista de usuarios obtenida:', data);
    return { success: true, data: data || [], error: null };
    
  } catch (error) {
    console.error('Error inesperado obteniendo usuarios:', error);
    return { success: false, data: [], error: error.message };
  }
};

// FUNCIÓN MEJORADA para verificar usuario específico usando función segura
export const getAdminUserVerification = async (email) => {
  try {
    console.log(`🔍 Verificando usuario ${email} usando función segura...`);
    
    const { data, error } = await supabase
      .rpc('verify_user_for_admin', { user_email: email });
    
    if (error) {
      console.error('Error verificando usuario:', error);
      return { success: false, data: null, error: error.message };
    }
    
    if (!data || data.length === 0) {
      return { success: false, data: null, error: 'Usuario no encontrado' };
    }
    
    const result = data[0];
    console.log('🔍 Usuario verificado:', result);
    
    return { 
      success: true, 
      data: {
        user: result.user_data,
        tags: result.tags_data || [],
        pets: result.pets_data || [],
        stats: result.stats || {}
      }, 
      error: null 
    };
    
  } catch (error) {
    console.error('Error inesperado verificando usuario:', error);
    return { success: false, data: null, error: error.message };
  }
};

// FUNCIÓN MEJORADA para obtener tag por código con mejor debugging
export const getTagByCode = async (code) => {
  try {
    console.log('🔍 Buscando tag con código:', code);
    
    // Normalizar el código (mayúsculas y sin espacios)
    const normalizedCode = code.trim().toUpperCase();
    console.log('🔍 Código normalizado:', normalizedCode);
    
    // Primero, verificar si existen tags en la tabla
    const { data: allTags, error: allTagsError } = await supabase
      .from('tags')
      .select('id, code')
      .limit(10);
    
    if (allTagsError) {
      console.error('❌ Error consultando todos los tags:', allTagsError);
      return { success: false, data: null, error: `Error de base de datos: ${allTagsError.message}` };
    }
    
    console.log('📋 Tags existentes en la base de datos:', allTags);
    
    // Buscar el tag específico con múltiples estrategias
    let tagData = null;
    let searchError = null;
    
    // Estrategia 1: Búsqueda exacta (case sensitive)
    const { data: exactMatch, error: exactError } = await supabase
      .from('tags')
      .select(`
        id,
        code,
        activated,
        user_id,
        pet_id,
        pets:pet_id (
          id,
          name,
          type,
          breed,
          owner_name,
          owner_contact,
          owner_phone,
          notes,
          qr_activated,
          user_id
        )
      `)
      .eq('code', normalizedCode)
      .maybeSingle();
    
    if (exactError) {
      console.error('❌ Error en búsqueda exacta:', exactError);
      searchError = exactError;
    } else if (exactMatch) {
      console.log('✅ Tag encontrado con búsqueda exacta:', exactMatch);
      tagData = exactMatch;
    }
    
    // Estrategia 2: Búsqueda case-insensitive si no se encontró
    if (!tagData) {
      console.log('🔍 Intentando búsqueda case-insensitive...');
      const { data: iLikeMatch, error: iLikeError } = await supabase
        .from('tags')
        .select(`
          id,
          code,
          activated,
          user_id,
          pet_id,
          pets:pet_id (
            id,
            name,
            type,
            breed,
            owner_name,
            owner_contact,
            owner_phone,
            notes,
            qr_activated,
            user_id
          )
        `)
        .ilike('code', normalizedCode)
        .maybeSingle();
      
      if (iLikeError) {
        console.error('❌ Error en búsqueda ilike:', iLikeError);
        searchError = iLikeError;
      } else if (iLikeMatch) {
        console.log('✅ Tag encontrado con búsqueda ilike:', iLikeMatch);
        tagData = iLikeMatch;
      }
    }
    
    // Estrategia 3: Búsqueda parcial si aún no se encontró
    if (!tagData) {
      console.log('🔍 Intentando búsqueda parcial...');
      const { data: partialMatches, error: partialError } = await supabase
        .from('tags')
        .select('id, code')
        .ilike('code', `%${normalizedCode}%`)
        .limit(5);
      
      if (partialError) {
        console.error('❌ Error en búsqueda parcial:', partialError);
      } else if (partialMatches && partialMatches.length > 0) {
        console.log('🔍 Tags similares encontrados:', partialMatches);
      }
    }
    
    if (!tagData) {
      console.log('❌ Tag no encontrado después de todas las estrategias');
      return { 
        success: false, 
        data: null, 
        error: `No se encontró tag con código "${code}". Códigos disponibles: ${allTags.map(t => t.code).join(', ')}`,
        availableTags: allTags
      };
    }
    
    console.log('✅ Tag encontrado exitosamente:', tagData);
    return { success: true, data: tagData, error: null };
    
  } catch (error) {
    console.error('💥 Error inesperado en getTagByCode:', error);
    return { success: false, data: null, error: error.message };
  }
};

// Nueva función para activar tag con mascota - ACTUALIZADA para incluir owner_phone
export const activateTagWithPet = async (tagId, petData, userId) => {
  try {
    console.log('🐕 Activando tag con datos:', { tagId, petData, userId });
    
    // Primero crear o actualizar la mascota
    let petId = petData.id;
    
    if (!petId) {
      // Crear nueva mascota
      const { data: newPet, error: petError } = await supabase
        .from('pets')
        .insert({
          name: petData.name,
          type: petData.type,
          breed: petData.breed,
          owner_name: petData.owner_name,
          owner_contact: petData.owner_contact,
          owner_phone: petData.owner_phone,
          notes: petData.notes,
          user_id: userId,
          qr_activated: true
        })
        .select('id')
        .single();
      
      if (petError) throw petError;
      petId = newPet.id;
      console.log('✅ Nueva mascota creada con ID:', petId);
    } else {
      // Actualizar mascota existente
      const { error: updateError } = await supabase
        .from('pets')
        .update({
          name: petData.name,
          type: petData.type,
          breed: petData.breed,
          owner_name: petData.owner_name,
          owner_contact: petData.owner_contact,
          owner_phone: petData.owner_phone,
          notes: petData.notes,
          qr_activated: true
        })
        .eq('id', petId)
        .eq('user_id', userId);
      
      if (updateError) throw updateError;
      console.log('✅ Mascota actualizada con ID:', petId);
    }
    
    // Luego actualizar el tag
    const { data: updatedTag, error: tagError } = await supabase
      .from('tags')
      .update({
        pet_id: petId,
        activated: true,
        activated_at: new Date().toISOString(),
        user_id: userId
      })
      .eq('id', tagId)
      .select()
      .single();
    
    if (tagError) throw tagError;
    
    console.log('✅ Tag actualizado exitosamente:', updatedTag);
    return { success: true, data: { tag: updatedTag, petId }, error: null };
  } catch (error) {
    console.error('❌ Error activating tag with pet:', error);
    return { success: false, data: null, error: error.message };
  }
};

// Nueva función para obtener mascota pública por ID - ACTUALIZADA para incluir owner_phone
export const getPublicPetById = async (petId) => {
  try {
    const { data, error } = await supabase
      .from('pets')
      .select(`
        id,
        name,
        type,
        breed,
        owner_name,
        owner_contact,
        owner_phone,
        notes,
        qr_activated,
        tags:tags!pet_id (
          code,
          activated
        )
      `)
      .eq('id', petId)
      .eq('qr_activated', true)
      .single();
    
    return { success: !error, data, error: error?.message };
  } catch (error) {
    return { success: false, data: null, error: error.message };
  }
};

// Nueva función para verificar y sincronizar usuario específico
export const verifyAndSyncUser = async (email) => {
  try {
    console.log(`🔍 Verificando usuario: ${email}`);
    
    // 1. Buscar en auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error accediendo a auth.users:', authError);
      return { success: false, error: 'No se puede acceder a auth.users desde el cliente' };
    }
    
    // 2. Buscar en public.users
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (publicError) {
      console.error('Error en public.users:', publicError);
      return { success: false, error: publicError.message };
    }
    
    return {
      success: true,
      authUserExists: false, // No podemos verificar desde el cliente
      publicUserExists: !!publicUser,
      publicUser: publicUser,
      message: publicUser ? 'Usuario encontrado en public.users' : 'Usuario no encontrado en public.users'
    };
    
  } catch (error) {
    console.error('Error en verificación:', error);
    return { success: false, error: error.message };
  }
};

// Nueva función para debugging de tags
export const debugTagSearch = async (code) => {
  try {
    console.log('🐛 DEBUG: Iniciando búsqueda de tag:', code);
    
    // 1. Verificar conexión
    const { data: connectionTest, error: connectionError } = await supabase
      .from('tags')
      .select('count')
      .limit(1);
    
    console.log('🐛 DEBUG: Test de conexión:', { connectionTest, connectionError });
    
    // 2. Obtener todos los tags
    const { data: allTags, error: allTagsError } = await supabase
      .from('tags')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('🐛 DEBUG: Todos los tags:', { count: allTags?.length, allTags, allTagsError });
    
    // 3. Buscar tag específico
    const normalizedCode = code.trim().toUpperCase();
    const { data: specificTag, error: specificError } = await supabase
      .from('tags')
      .select('*')
      .eq('code', normalizedCode)
      .maybeSingle();
    
    console.log('🐛 DEBUG: Búsqueda específica:', { normalizedCode, specificTag, specificError });
    
    return {
      success: true,
      debug: {
        connectionTest: !connectionError,
        totalTags: allTags?.length || 0,
        allTags: allTags || [],
        searchCode: normalizedCode,
        foundTag: specificTag,
        searchError: specificError?.message
      }
    };
    
  } catch (error) {
    console.error('🐛 DEBUG: Error en debugging:', error);
    return { success: false, error: error.message };
  }
};

// NUEVA FUNCIÓN: Crear tags de prueba para testing
export const createTestTags = async (count = 5) => {
  try {
    console.log(`🧪 Creando ${count} tags de prueba...`);
    
    const testTags = [];
    const results = [];
    
    for (let i = 1; i <= count; i++) {
      const tagCode = `PLK-TEST${i.toString().padStart(2, '0')}`;
      const result = await createTagWithValidation(tagCode, null);
      results.push(result);
      
      if (result.success) {
        testTags.push(result.data);
        console.log(`✅ Tag de prueba creado: ${tagCode}`);
      } else {
        console.error(`❌ Error creando tag ${tagCode}:`, result.error);
      }
    }
    
    return {
      success: true,
      created: testTags.length,
      total: count,
      tags: testTags,
      results
    };
    
  } catch (error) {
    console.error('❌ Error creando tags de prueba:', error);
    return { success: false, error: error.message };
  }
};

// NUEVA FUNCIÓN: Limpiar tags de prueba
export const cleanupTestTags = async () => {
  try {
    console.log('🧹 Limpiando tags de prueba...');
    
    const { data: testTags, error: findError } = await supabase
      .from('tags')
      .select('id, code')
      .ilike('code', 'PLK-TEST%');
    
    if (findError) {
      throw findError;
    }
    
    if (!testTags || testTags.length === 0) {
      return { success: true, deleted: 0, message: 'No hay tags de prueba para eliminar' };
    }
    
    const { error: deleteError } = await supabase
      .from('tags')
      .delete()
      .ilike('code', 'PLK-TEST%');
    
    if (deleteError) {
      throw deleteError;
    }
    
    console.log(`✅ ${testTags.length} tags de prueba eliminados`);
    return { success: true, deleted: testTags.length };
    
  } catch (error) {
    console.error('❌ Error limpiando tags de prueba:', error);
    return { success: false, error: error.message };
  }
};