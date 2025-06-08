import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yseyznpiemscdskczdak.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZXl6bnBpZW1zY2Rza2N6ZGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxODUzNTksImV4cCI6MjA2NDc2MTM1OX0.OZ164B1YHzsUg-Mll0d_XJk4cnLsoGLRkuYjhegdlmI';

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

// Helper function to check database connection
export const checkDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    return { connected: true, error: null };
  } catch (error) {
    console.error('Database connection error:', error);
    return { connected: false, error: error.message };
  }
};

// Helper function to verify schema
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

// Helper function to test specific queries
export const testDatabaseQueries = async () => {
  const tests = {};
  
  try {
    // Test tags query
    const { data: tagsData, error: tagsError } = await supabase
      .from('tags')
      .select('id, code, activated, user_id, pet_id, created_at')
      .limit(1);
    
    tests.tags = { success: !tagsError, error: tagsError?.message };
  } catch (error) {
    tests.tags = { success: false, error: error.message };
  }
  
  try {
    // Test pets query
    const { data: petsData, error: petsError } = await supabase
      .from('pets')
      .select('id, name, type, breed, owner_name, owner_contact, notes, user_id, qr_activated')
      .limit(1);
    
    tests.pets = { success: !petsError, error: petsError?.message };
  } catch (error) {
    tests.pets = { success: false, error: error.message };
  }
  
  try {
    // Test join query
    const { data: joinData, error: joinError } = await supabase
      .from('tags')
      .select(`
        id, 
        code, 
        activated, 
        user_id,
        pet_id,
        pets:pet_id (id, name),
        users:user_id (email)
      `)
      .limit(1);
    
    tests.joins = { success: !joinError, error: joinError?.message };
  } catch (error) {
    tests.joins = { success: false, error: error.message };
  }
  
  return tests;
};