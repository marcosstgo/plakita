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
    // Test de public.users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, phone')
      .limit(1);
    
    tests.users_public = { success: !usersError, error: usersError?.message };
  } catch (error) {
    tests.users_public = { success: false, error: error.message };
  }
  
  try {
    // Test de join solo si los tests básicos funcionan
    if (tests.tags_basic?.success && tests.pets_basic?.success && tests.users_public?.success) {
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
    // Verificar phone en users
    const { data: usersPhoneTest, error: usersPhoneError } = await supabase
      .from('users')
      .select('phone')
      .limit(1);
    
    columnChecks.users_phone = { 
      exists: !usersPhoneError, 
      error: usersPhoneError?.message 
    };
  } catch (error) {
    columnChecks.users_phone = { exists: false, error: error.message };
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

  try {
    // Verificar tabla public.users
    const { data: usersTest, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, phone')
      .limit(1);
    
    columnChecks.public_users = { 
      exists: !usersError, 
      error: usersError?.message 
    };
  } catch (error) {
    columnChecks.public_users = { exists: false, error: error.message };
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

// Helper function to get all tags for admin with related data - ACTUALIZADA
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

// Nueva función para obtener tag por código
export const getTagByCode = async (code) => {
  try {
    const { data, error } = await supabase
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
      .eq('code', code.toUpperCase())
      .single();
    
    return { success: !error, data, error: error?.message };
  } catch (error) {
    return { success: false, data: null, error: error.message };
  }
};

// Nueva función para activar tag con mascota - ACTUALIZADA para incluir owner_phone
export const activateTagWithPet = async (tagId, petData, userId) => {
  try {
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
    
    return { success: true, data: { tag: updatedTag, petId }, error: null };
  } catch (error) {
    console.error('Error activating tag with pet:', error);
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