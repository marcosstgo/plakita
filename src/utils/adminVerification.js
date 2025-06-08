import { supabase } from '@/lib/supabaseClient';

export const verifyAdminUser = async () => {
  try {
    console.log('🔍 Verificando usuario administrador...');
    
    // 1. Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error obteniendo usuario actual:', userError);
      return { success: false, error: userError.message };
    }
    
    if (!user) {
      return { success: false, error: 'No hay usuario autenticado' };
    }
    
    console.log('Usuario actual:', {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    });
    
    // 2. Verificar en public.users
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'santiago.marcos@gmail.com')
      .maybeSingle();
    
    if (publicError) {
      console.error('Error consultando public.users:', publicError);
      return { success: false, error: publicError.message };
    }
    
    console.log('Usuario en public.users:', publicUser);
    
    // 3. Verificar si el usuario actual es el admin
    const isAdminByEmail = user.email === 'santiago.marcos@gmail.com';
    const expectedAdminId = '08c4845d-28e2-4a9a-b05d-350fac947b28';
    const isAdminById = user.id === expectedAdminId;
    
    const result = {
      success: true,
      currentUser: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      publicUser: publicUser,
      adminStatus: {
        isAdminByEmail,
        isAdminById,
        expectedAdminId,
        actualId: user.id,
        idMatches: user.id === expectedAdminId
      },
      recommendations: []
    };
    
    // 4. Generar recomendaciones
    if (isAdminByEmail && !isAdminById) {
      result.recommendations.push({
        type: 'warning',
        message: `El usuario admin tiene un ID diferente al esperado. Actualizar ADMIN_USER_ID en AdminDashboard.jsx de "${expectedAdminId}" a "${user.id}"`
      });
    }
    
    if (!publicUser && isAdminByEmail) {
      result.recommendations.push({
        type: 'error',
        message: 'El usuario admin no está sincronizado en public.users. Ejecutar migración de sincronización.'
      });
    }
    
    if (publicUser && isAdminByEmail) {
      result.recommendations.push({
        type: 'success',
        message: 'Usuario admin correctamente sincronizado en public.users'
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('Error en verificación:', error);
    return { success: false, error: error.message };
  }
};

export const syncAdminUser = async () => {
  try {
    console.log('🔄 Sincronizando usuario admin...');
    
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'No hay usuario autenticado' };
    }
    
    // Sincronizar en public.users
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        avatar_url: user.user_metadata?.avatar_url,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error sincronizando usuario:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Usuario sincronizado:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('Error en sincronización:', error);
    return { success: false, error: error.message };
  }
};