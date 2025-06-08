import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Tag, Users, QrCode, Heart, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, testDatabaseQueries, checkRequiredColumns } from '@/lib/supabaseClient';
import AdminStatsGrid from '@/components/admin/AdminStatsGrid';
import AdminTagsTable from '@/components/admin/AdminTagsTable';
import CreateTagDialog from '@/components/admin/CreateTagDialog';
import DeleteTagDialog from '@/components/admin/DeleteTagDialog';
import { toast } from '@/components/ui/use-toast';

export const ADMIN_USER_ID = '08c4845d-28e2-4a9a-b05d-350fac947b28'; 

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tagsWithDetails, setTagsWithDetails] = useState([]);
  const [allPetsCount, setAllPetsCount] = useState(0);
  const [allUsersCount, setAllUsersCount] = useState(0);
  const [isCreateTagDialogOpen, setIsCreateTagDialogOpen] = useState(false);
  const [isDeleteTagDialogOpen, setIsDeleteTagDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActuallyAdmin, setIsActuallyAdmin] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState(null);
  const [schemaErrors, setSchemaErrors] = useState([]);
  const [columnStatus, setColumnStatus] = useState(null);

  const testDatabase = async () => {
    try {
      const results = await testDatabaseQueries();
      setDatabaseStatus(results);
      
      // Check required columns
      const columnChecks = await checkRequiredColumns();
      setColumnStatus(columnChecks);
      
      // Show any errors
      Object.entries(results).forEach(([test, result]) => {
        if (!result.success) {
          console.error(`Database test failed for ${test}:`, result.error);
        }
      });
    } catch (error) {
      console.error('Database test error:', error);
      setDatabaseStatus({ error: error.message });
    }
  };

  const checkDatabaseSchema = async () => {
    const errors = [];
    
    try {
      // Verificar columnas requeridas
      const columnChecks = await checkRequiredColumns();
      
      if (!columnChecks.tags_user_id?.exists) {
        errors.push('Columna tags.user_id no existe o no es accesible');
      }
      
      if (!columnChecks.pets_qr_activated?.exists) {
        errors.push('Columna pets.qr_activated no existe o no es accesible');
      }
      
      if (!columnChecks.tags_created_at?.exists) {
        errors.push('Columna tags.created_at no existe o no es accesible');
      }
    } catch (error) {
      errors.push(`Error verificando esquema: ${error.message}`);
    }

    setSchemaErrors(errors);
    return errors.length === 0;
  };

  const fetchData = useCallback(async () => {
    if (!isActuallyAdmin) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    
    try {
      // Verificar esquema primero
      const schemaOk = await checkDatabaseSchema();
      
      if (!schemaOk) {
        toast({ 
          title: "Error de esquema de base de datos", 
          description: "La base de datos necesita ser actualizada. Ejecuta las migraciones pendientes.", 
          variant: "destructive" 
        });
        setIsLoading(false);
        return;
      }

      await testDatabase();
      await Promise.all([
        fetchAllTagsWithDetails(),
        fetchAllPetsCount(),
        fetchAllUsersCount()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({ title: "Error cargando datos del admin", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [isActuallyAdmin]);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true); 
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }
    
    const isAdminCheck = user.id === ADMIN_USER_ID;
    setIsActuallyAdmin(isAdminCheck);

    if (!isAdminCheck) {
      toast({ title: "Acceso Denegado", description: "No tienes permisos para acceder a esta área.", variant: "destructive" });
      navigate('/dashboard');
      setIsLoading(false);
    } else {
      fetchData();
    }
  }, [user, authLoading, navigate, fetchData]);

  const fetchAllTagsWithDetails = async () => {
    try {
      // Primero intentar consulta básica
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .order('created_at', { ascending: false });

      if (tagsError) {
        console.error('Error fetching tags:', tagsError);
        toast({ title: "Error cargando tags", description: tagsError.message, variant: "destructive" });
        setTagsWithDetails([]);
        return;
      }

      if (!tagsData || tagsData.length === 0) {
        setTagsWithDetails([]);
        return;
      }

      // Obtener IDs únicos para consultas batch
      const petIds = [...new Set(tagsData.filter(tag => tag.pet_id).map(tag => tag.pet_id))];
      const userIds = [...new Set(tagsData.filter(tag => tag.user_id).map(tag => tag.user_id))];

      // Fetch pets data si hay pet_ids
      let petsData = [];
      if (petIds.length > 0) {
        try {
          const { data: pets, error: petsError } = await supabase
            .from('pets')
            .select('id, name')
            .in('id', petIds);
          
          if (petsError) {
            console.error('Error fetching pets:', petsError);
          } else {
            petsData = pets || [];
          }
        } catch (error) {
          console.error('Error fetching pets:', error);
        }
      }

      // Para usuarios, intentar obtener emails de la tabla users
      let usersData = [];
      if (userIds.length > 0) {
        try {
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email')
            .in('id', userIds);
          
          if (!usersError && users) {
            usersData = users;
          }
        } catch (error) {
          console.log('Could not fetch from users table, using fallback');
        }
      }

      // Combinar los datos
      const combinedData = tagsData.map(tag => ({
        ...tag,
        pets: tag.pet_id ? petsData.find(pet => pet.id === tag.pet_id) || null : null,
        users: tag.user_id ? (usersData.find(user => user.id === tag.user_id) || { email: 'Usuario registrado' }) : null
      }));

      setTagsWithDetails(combinedData);
    } catch (error) {
      console.error('Unexpected error fetching tags:', error);
      toast({ title: "Error inesperado", description: "Error al cargar las Plakitas", variant: "destructive" });
      setTagsWithDetails([]);
    }
  };

  const fetchAllPetsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('pets')
        .select('id', { count: 'exact', head: true });
      
      if (error) {
        console.error('Error counting pets:', error);
        setAllPetsCount(0);
      } else {
        setAllPetsCount(count || 0);
      }
    } catch (error) {
      console.error('Unexpected error counting pets:', error);
      setAllPetsCount(0);
    }
  };
  
  const fetchAllUsersCount = async () => {
    try {
      // Contar IDs únicos de usuario desde tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('user_id')
        .not('user_id', 'is', null);

      if (tagsError) {
        throw tagsError;
      }

      // Contar IDs únicos
      const uniqueUserIds = new Set(tagsData.map(tag => tag.user_id));
      setAllUsersCount(uniqueUserIds.size);
    } catch (error) {
      console.error('Error al contar usuarios:', error);
      setAllUsersCount(0);
    }
  };

  const handleCreateTagSuccess = () => {
    fetchAllTagsWithDetails(); 
    setIsCreateTagDialogOpen(false);
  };
  
  const openDeleteConfirmDialog = (tag) => {
    setTagToDelete(tag);
    setIsDeleteTagDialogOpen(true);
  };

  const handleDeleteTagSuccess = () => {
    fetchAllTagsWithDetails(); 
    setIsDeleteTagDialogOpen(false);
    setTagToDelete(null);
  };

  if (authLoading || (isLoading && isActuallyAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isActuallyAdmin && !authLoading) { 
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/10 backdrop-blur-md p-8 rounded-lg shadow-xl">
          <AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-xl mb-6">No tienes permisos para ver esta página.</p>
          <Link to="/">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg">
              Volver al Inicio
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }
  
  if (!isActuallyAdmin) {
    return null; 
  }

  const statsData = [
    { name: 'Total Tags Generados', value: tagsWithDetails.length, icon: Tag },
    { name: 'Tags Activados', value: tagsWithDetails.filter(t => t.activated).length, icon: QrCode },
    { name: 'Total Mascotas Registradas', value: allPetsCount, icon: Heart },
    { name: 'Total Usuarios Registrados', value: allUsersCount, icon: Users },
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
          
          {/* Schema Errors Warning */}
          {schemaErrors.length > 0 && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <h3 className="text-red-300 font-semibold mb-2">⚠️ Errores de Esquema de Base de Datos</h3>
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
          
          {/* Database Status */}
          {databaseStatus && (
            <div className="mt-4 p-3 bg-white/10 rounded-lg">
              <p className="text-sm text-white/70 mb-2">Estado de la base de datos:</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {Object.entries(databaseStatus).map(([test, result]) => (
                  <span key={test} className={`inline-block text-xs px-2 py-1 rounded ${result.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {test}: {result.success ? '✓' : '✗'}
                  </span>
                ))}
              </div>
              
              {/* Column Status */}
              {columnStatus && (
                <div className="mt-2">
                  <p className="text-xs text-white/60 mb-1">Estado de columnas críticas:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(columnStatus).map(([column, status]) => (
                      <span key={column} className={`inline-block text-xs px-2 py-1 rounded ${status.exists ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {column}: {status.exists ? '✓' : '✗'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={testDatabase}
                className="ml-2 text-white hover:bg-white/20"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Probar
              </Button>
            </div>
          )}
        </motion.div>

        <AdminStatsGrid stats={statsData} />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card className="gradient-card border-purple-500/50 text-white mt-10">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl text-purple-300">Gestión de Plakitas (Tags QR)</CardTitle>
                <CardDescription className="text-white/70 mt-1">Crea y visualiza las Plakitas disponibles para activación.</CardDescription>
              </div>
              <Button 
                className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto"
                onClick={() => setIsCreateTagDialogOpen(true)}
                disabled={schemaErrors.length > 0}
              >
                <Plus className="h-4 w-4 mr-2" /> Crear Nueva Plakita
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
                <AdminTagsTable tags={tagsWithDetails} onOpenDeleteDialog={openDeleteConfirmDialog} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <CreateTagDialog
        isOpen={isCreateTagDialogOpen}
        onOpenChange={setIsCreateTagDialogOpen}
        onSuccess={handleCreateTagSuccess}
      />
      
      <DeleteTagDialog
        isOpen={isDeleteTagDialogOpen}
        onOpenChange={setIsDeleteTagDialogOpen}
        tagToDelete={tagToDelete}
        onSuccess={handleDeleteTagSuccess}
      />
    </div>
  );
};

export default AdminDashboard;