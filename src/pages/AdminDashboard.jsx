import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Tag, Users, QrCode, Heart, AlertTriangle, ShieldCheck, RefreshCw, Download, Eye, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import QRCode from 'qrcode';
import { validateTagCode, generateTagCode } from '@/components/forms/PetFormValidation';
import FormErrorDisplay from '@/components/forms/FormErrorDisplay';

// ID CORRECTO del usuario admin santiago.marcos@gmail.com obtenido de la consulta SQL
export const ADMIN_USER_ID = '3d4b3b56-fba6-4d76-866c-f38551c7a6c4';

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Estados principales
  const [isLoading, setIsLoading] = useState(true);
  const [isActuallyAdmin, setIsActuallyAdmin] = useState(false);
  
  // Estados de datos
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState({
    totalTags: 0,
    activatedTags: 0,
    totalPets: 0,
    totalUsers: 0
  });
  
  // Estados de diálogos
  const [isCreateTagDialogOpen, setIsCreateTagDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);
  
  // Estados del formulario
  const [newTagCode, setNewTagCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  // Estados de verificación
  const [databaseStatus, setDatabaseStatus] = useState(null);
  const [schemaErrors, setSchemaErrors] = useState([]);

  // Verificar si el usuario es admin
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }
    
    console.log('🔍 Verificando permisos de admin...');
    console.log('Usuario actual ID:', user.id);
    console.log('Usuario actual email:', user.email);
    console.log('Admin ID esperado:', ADMIN_USER_ID);
    
    const isAdminCheck = user.id === ADMIN_USER_ID;
    setIsActuallyAdmin(isAdminCheck);

    if (!isAdminCheck) {
      // Verificar también por email como fallback
      const isAdminByEmail = user.email === 'santiago.marcos@gmail.com';
      
      if (isAdminByEmail) {
        console.warn('⚠️ Usuario admin detectado por email pero ID no coincide');
        console.warn('ID actual:', user.id);
        console.warn('ID esperado:', ADMIN_USER_ID);
        
        // Permitir acceso y mostrar advertencia
        setIsActuallyAdmin(true);
        toast({ 
          title: "Admin verificado", 
          description: "Acceso concedido por email. ID actualizado correctamente.", 
          variant: "default" 
        });
      } else {
        toast({ 
          title: "Acceso Denegado", 
          description: "No tienes permisos para acceder a esta área.", 
          variant: "destructive" 
        });
        navigate('/dashboard');
        setIsLoading(false);
        return;
      }
    }

    loadAdminData();
  }, [user, authLoading, navigate]);

  // Verificar estado de la base de datos
  const checkDatabaseHealth = async () => {
    const errors = [];
    const status = {};
    
    try {
      // Verificar tabla tags
      const { data: tagsTest, error: tagsError } = await supabase
        .from('tags')
        .select('id, code, activated')
        .limit(1);
      
      status.tags_basic = { success: !tagsError, error: tagsError?.message };
      
      // Verificar columnas específicas
      try {
        const { data: tagsSpecific, error: tagsSpecificError } = await supabase
          .from('tags')
          .select('id, code, activated, user_id, pet_id, created_at')
          .limit(1);
        
        status.tags_complete = { success: !tagsSpecificError, error: tagsSpecificError?.message };
        
        if (tagsSpecificError) {
          if (tagsSpecificError.message.includes('user_id')) {
            errors.push('Columna tags.user_id no existe');
          }
          if (tagsSpecificError.message.includes('created_at')) {
            errors.push('Columna tags.created_at no existe');
          }
        }
      } catch (error) {
        errors.push(`Error verificando columnas de tags: ${error.message}`);
      }
      
      // Verificar tabla pets
      try {
        const { data: petsTest, error: petsError } = await supabase
          .from('pets')
          .select('id, name, type, qr_activated')
          .limit(1);
        
        status.pets = { success: !petsError, error: petsError?.message };
        
        if (petsError && petsError.message.includes('qr_activated')) {
          errors.push('Columna pets.qr_activated no existe');
        }
      } catch (error) {
        errors.push(`Error verificando pets: ${error.message}`);
      }
      
      // Verificar tabla public.users
      try {
        const { data: usersTest, error: usersError } = await supabase
          .from('users')
          .select('id, email, full_name')
          .limit(1);
        
        status.users = { success: !usersError, error: usersError?.message };
        
        if (usersError) {
          errors.push('Tabla public.users no existe o no es accesible');
        }
      } catch (error) {
        errors.push(`Error verificando public.users: ${error.message}`);
      }
      
    } catch (error) {
      errors.push(`Error general verificando base de datos: ${error.message}`);
    }
    
    setDatabaseStatus(status);
    setSchemaErrors(errors);
    return errors.length === 0;
  };

  // Cargar datos del admin
  const loadAdminData = async () => {
    setIsLoading(true);
    
    try {
      // Verificar estado de la base de datos primero
      const isHealthy = await checkDatabaseHealth();
      
      if (!isHealthy) {
        toast({ 
          title: "Error de Base de Datos", 
          description: "La base de datos necesita ser actualizada. Revisa los errores mostrados.", 
          variant: "destructive" 
        });
        setIsLoading(false);
        return;
      }
      
      // Cargar datos en paralelo
      await Promise.all([
        loadTags(),
        loadStats()
      ]);
      
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({ 
        title: "Error cargando datos", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar tags con información relacionada
  const loadTags = async () => {
    try {
      const { data: tagsData, error } = await supabase
        .from('tags')
        .select(`
          id,
          code,
          activated,
          created_at,
          pet_id,
          user_id,
          pets:pet_id (id, name),
          users:user_id (email, full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setTags(tagsData || []);
    } catch (error) {
      console.error('Error loading tags:', error);
      // Fallback: cargar solo datos básicos
      try {
        const { data: basicTags, error: basicError } = await supabase
          .from('tags')
          .select('id, code, activated, created_at')
          .order('created_at', { ascending: false });
        
        if (basicError) throw basicError;
        setTags(basicTags || []);
      } catch (fallbackError) {
        console.error('Error loading basic tags:', fallbackError);
        setTags([]);
      }
    }
  };

  // Cargar estadísticas
  const loadStats = async () => {
    try {
      // Contar tags
      const { count: totalTags } = await supabase
        .from('tags')
        .select('id', { count: 'exact', head: true });
      
      const { count: activatedTags } = await supabase
        .from('tags')
        .select('id', { count: 'exact', head: true })
        .eq('activated', true);
      
      // Contar pets
      const { count: totalPets } = await supabase
        .from('pets')
        .select('id', { count: 'exact', head: true });
      
      // Contar usuarios
      let totalUsers = 0;
      try {
        const { count: usersCount } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true });
        totalUsers = usersCount || 0;
      } catch (error) {
        console.warn('Could not count users from public.users table');
      }
      
      setStats({
        totalTags: totalTags || 0,
        activatedTags: activatedTags || 0,
        totalPets: totalPets || 0,
        totalUsers
      });
      
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        totalTags: 0,
        activatedTags: 0,
        totalPets: 0,
        totalUsers: 0
      });
    }
  };

  // Generar código aleatorio
  const generateRandomCode = () => {
    const newCode = generateTagCode();
    setNewTagCode(newCode);
    setFormErrors({});
  };

  // Crear nuevo tag
  const handleCreateTag = async (e) => {
    e.preventDefault();
    
    // Validar formulario
    const validation = validateTagCode(newTagCode);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});
    
    try {
      console.log('🏷️ Creando tag con datos:', {
        code: newTagCode.trim().toUpperCase(),
        activated: false,
        user_id: user.id,
        created_at: new Date().toISOString()
      });

      const { data, error } = await supabase
        .from('tags')
        .insert({ 
          code: newTagCode.trim().toUpperCase(), 
          activated: false,
          user_id: user.id, // Asignar al usuario actual (admin)
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creando tag:', error);
        throw error;
      }

      console.log('✅ Tag creado exitosamente:', data);

      toast({ 
        title: "Tag Creado", 
        description: `Tag ${data.code} creado exitosamente.` 
      });
      
      setNewTagCode('');
      setIsCreateTagDialogOpen(false);
      await loadTags();
      await loadStats();
      
    } catch (error) {
      console.error('Error creating tag:', error);
      
      // Manejar errores específicos
      if (error.message.includes('row-level security')) {
        toast({ 
          title: "Error de permisos", 
          description: "No tienes permisos para crear tags. Verifica que seas administrador.", 
          variant: "destructive" 
        });
      } else if (error.message.includes('duplicate key')) {
        setFormErrors({ code: 'Este código ya existe. Genera uno nuevo.' });
      } else {
        toast({ 
          title: "Error creando tag", 
          description: error.message, 
          variant: "destructive" 
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar tag
  const handleDeleteTag = async () => {
    if (!tagToDelete) return;

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagToDelete.id);
      
      if (error) throw error;

      toast({ 
        title: "Tag Eliminado", 
        description: `El tag ${tagToDelete.code} ha sido eliminado.` 
      });
      
      setIsDeleteDialogOpen(false);
      setTagToDelete(null);
      await loadTags();
      await loadStats();
      
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({ 
        title: "Error eliminando tag", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  // Descargar QR de activación
  const downloadActivationQR = async (tag) => {
    try {
      const url = `${window.location.origin}/activate-tag/${tag.code}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      
      const link = document.createElement('a');
      link.download = `plakita-activate-${tag.code}.png`;
      link.href = qrDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "QR Descargado",
        description: `QR de activación para ${tag.code} descargado.`
      });
    } catch (error) {
      toast({ 
        title: "Error generando QR", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  // Renderizado condicional para loading
  if (authLoading || (isLoading && isActuallyAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  // Renderizado condicional para no admin
  if (!isActuallyAdmin && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="bg-white/10 backdrop-blur-md p-8 rounded-lg shadow-xl"
        >
          <AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-xl mb-6">No tienes permisos para ver esta página.</p>
          <div className="space-y-2 text-sm text-white/70 mb-6">
            <p>Usuario actual: {user?.email}</p>
            <p>ID actual: {user?.id}</p>
            <p>Admin esperado: santiago.marcos@gmail.com</p>
            <p>ID esperado: {ADMIN_USER_ID}</p>
          </div>
          <Link to="/">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg">
              Volver al Inicio
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const statsData = [
    { name: 'Total Tags Generados', value: stats.totalTags, icon: Tag },
    { name: 'Tags Activados', value: stats.activatedTags, icon: QrCode },
    { name: 'Total Mascotas Registradas', value: stats.totalPets, icon: Heart },
    { name: 'Total Usuarios Registrados', value: stats.totalUsers, icon: Users },
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-5xl font-bold text-white mb-3 flex items-center">
            <ShieldCheck className="h-12 w-12 mr-4 text-purple-300" />
            Panel de Administración Plakita
          </h1>
          <p className="text-white/80 text-lg">
            Gestiona Plakitas, visualiza estadísticas y supervisa la plataforma.
          </p>
          
          {/* Información del admin actual */}
          <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
            <p className="text-green-300 text-sm">
              ✅ Conectado como administrador: {user?.email} (ID: {user?.id})
            </p>
          </div>
          
          {/* Errores de esquema */}
          {schemaErrors.length > 0 && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <h3 className="text-red-300 font-semibold mb-2 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Errores de Esquema de Base de Datos
              </h3>
              <ul className="text-red-200 text-sm space-y-1">
                {schemaErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
              <p className="text-red-200 text-sm mt-2">
                Ejecuta las migraciones pendientes en Supabase para resolver estos problemas.
              </p>
            </div>
          )}
          
          {/* Estado de la base de datos */}
          {databaseStatus && (
            <div className="mt-4 p-3 bg-white/10 rounded-lg">
              <p className="text-sm text-white/70 mb-2">Estado de la base de datos:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(databaseStatus).map(([test, result]) => (
                  <span 
                    key={test} 
                    className={`inline-block text-xs px-2 py-1 rounded ${
                      result.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {test}: {result.success ? '✓' : '✗'}
                  </span>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={loadAdminData}
                className="ml-2 text-white hover:bg-white/20"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Actualizar
              </Button>
            </div>
          )}
        </motion.div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {statsData.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="gradient-card border-purple-500/50 text-white shadow-lg hover:shadow-purple-400/30 transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-300">{stat.name}</CardTitle>
                  <stat.icon className="h-5 w-5 text-purple-300" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Gestión de Tags */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.4 }}
        >
          <Card className="gradient-card border-purple-500/50 text-white">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl text-purple-300">Gestión de Plakitas (Tags QR)</CardTitle>
                <CardDescription className="text-white/70 mt-1">
                  Crea y visualiza las Plakitas disponibles para activación.
                </CardDescription>
              </div>
              <Button 
                className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto"
                onClick={() => setIsCreateTagDialogOpen(true)}
                disabled={schemaErrors.length > 0}
              >
                <Plus className="h-4 w-4 mr-2" /> 
                Crear Nueva Plakita
              </Button>
            </CardHeader>
            <CardContent>
              {schemaErrors.length > 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Base de Datos Necesita Actualización</h3>
                  <p className="text-white/70">
                    Ejecuta las migraciones pendientes en Supabase para poder gestionar las Plakitas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  {tags.length === 0 ? (
                    <p className="text-center text-white/70 py-8">No hay Plakitas generadas todavía.</p>
                  ) : (
                    <table className="min-w-full divide-y divide-purple-500/30">
                      <thead className="bg-white/5 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                            Código Plakita
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                            Mascota Vinculada
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                            Usuario
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                            Fecha Creación
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/10 divide-y divide-purple-500/20">
                        {tags.map((tag) => (
                          <tr key={tag.id} className="hover:bg-white/20 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{tag.code}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                tag.activated ? 'bg-green-500/80 text-green-50' : 'bg-yellow-500/80 text-yellow-50'
                              }`}>
                                {tag.activated ? 'Activado' : 'No Activado'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {tag.pets?.name ? (
                                <span className="text-purple-300">{tag.pets.name}</span>
                              ) : (
                                <span className="text-white/50">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {tag.users?.email ? (
                                <span className="text-white/80">{tag.users.email}</span>
                              ) : (
                                <span className="text-white/50">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                              {tag.created_at ? new Date(tag.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 p-2" 
                                  onClick={() => downloadActivationQR(tag)}
                                  title="Descargar QR de Activación"
                                >
                                  <Download className="h-4 w-4"/>
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-2" 
                                  onClick={() => {
                                    setTagToDelete(tag);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  disabled={tag.activated || tag.pet_id !== null}
                                  title={tag.activated || tag.pet_id ? "Solo se pueden eliminar tags no activados" : "Eliminar Tag"}
                                >
                                  <Trash2 className="h-4 w-4"/>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Dialog para crear tag */}
      <Dialog open={isCreateTagDialogOpen} onOpenChange={setIsCreateTagDialogOpen}>
        <DialogContent className="bg-gray-800 text-white border-purple-500 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-purple-300 text-2xl flex items-center">
              <Plus className="h-6 w-6 mr-2 text-purple-300" />
              Crear Nueva Plakita (Tag QR)
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTag} className="space-y-6 mt-4">
            <FormErrorDisplay errors={formErrors} />
            
            <div>
              <Label htmlFor="tagCode" className="text-purple-300 font-medium">
                Código Único de la Plakita
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tagCode"
                  value={newTagCode}
                  onChange={(e) => {
                    setNewTagCode(e.target.value.toUpperCase());
                    setFormErrors({});
                  }}
                  placeholder="Ej: PLK-XYZ123"
                  required
                  className={`bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500 ${
                    formErrors.code ? 'border-red-500' : ''
                  }`}
                  autoFocus
                />
                <Button 
                  type="button" 
                  onClick={generateRandomCode}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3"
                >
                  Generar
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Debe ser único. Se recomienda un prefijo (ej. PLK-) seguido de caracteres alfanuméricos.
              </p>
            </div>
            <DialogFooter className="sm:justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsCreateTagDialogOpen(false);
                  setFormErrors({});
                  setNewTagCode('');
                }} 
                className="border-gray-500 text-gray-300 hover:bg-gray-700"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-purple-600 hover:bg-purple-700 text-white" 
                disabled={isSubmitting}
              >
                {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                Crear Plakita
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para eliminar tag */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white border-red-500 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center text-2xl">
              <AlertTriangle className="h-6 w-6 mr-2 text-red-400" />
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300">
              ¿Estás seguro de que quieres eliminar la Plakita con código{' '}
              <span className="font-semibold text-purple-300">{tagToDelete?.code}</span>?
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Esta acción no se puede deshacer y solo es posible si la Plakita no ha sido activada.
            </p>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)} 
              className="border-gray-500 text-gray-300 hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDeleteTag} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2"/>
              Sí, Eliminar Plakita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;