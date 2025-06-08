import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Tag, Users, QrCode, Heart, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, testDatabaseQueries } from '@/lib/supabaseClient';
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

  const testDatabase = async () => {
    try {
      const results = await testDatabaseQueries();
      setDatabaseStatus(results);
      
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

  const fetchData = useCallback(async () => {
    if (!isActuallyAdmin) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
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
      // First, get all tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('id, code, activated, created_at, pet_id, user_id')
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

      // Get unique pet_ids and user_ids for batch fetching
      const petIds = [...new Set(tagsData.filter(tag => tag.pet_id).map(tag => tag.pet_id))];
      const userIds = [...new Set(tagsData.filter(tag => tag.user_id).map(tag => tag.user_id))];

      // Fetch pets data
      let petsData = [];
      if (petIds.length > 0) {
        const { data: pets, error: petsError } = await supabase
          .from('pets')
          .select('id, name')
          .in('id', petIds);
        
        if (petsError) {
          console.error('Error fetching pets:', petsError);
        } else {
          petsData = pets || [];
        }
      }

      // Fetch users data from auth.users (this might not work directly, so we'll handle it differently)
      let usersData = [];
      if (userIds.length > 0) {
        try {
          // Try to get user emails from the users table if it exists
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email')
            .in('id', userIds);
          
          if (!usersError && users) {
            usersData = users;
          }
        } catch (error) {
          console.log('Could not fetch from users table, this is expected if using auth.users');
          // For auth.users, we can't directly query, so we'll leave user emails empty
          // or try to get them from the auth metadata if available
        }
      }

      // Combine the data
      const combinedData = tagsData.map(tag => ({
        ...tag,
        pets: tag.pet_id ? petsData.find(pet => pet.id === tag.pet_id) || null : null,
        users: tag.user_id ? usersData.find(user => user.id === tag.user_id) || { email: 'Usuario registrado' } : null
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
        toast({ title: "Error contando mascotas", description: error.message, variant: "destructive" });
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
      // Count unique user IDs from tags table as fallback
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('user_id')
        .not('user_id', 'is', null);

      if (tagsError) {
        throw tagsError;
      }

      // Count unique user IDs
      const uniqueUserIds = new Set(tagsData.map(tag => tag.user_id));
      setAllUsersCount(uniqueUserIds.size);
    } catch (error) {
      console.error('Error al contar usuarios:', error);
      setAllUsersCount(0);
      toast({
        title: "Advertencia",
        description: "No se pudo obtener el conteo exacto de usuarios.",
        variant: "destructive"
      });
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
          
          {databaseStatus && (
            <div className="mt-4 p-3 bg-white/10 rounded-lg">
              <p className="text-sm text-white/70">Estado de la base de datos:</p>
              {Object.entries(databaseStatus).map(([test, result]) => (
                <span key={test} className={`inline-block mr-3 text-xs px-2 py-1 rounded ${result.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                  {test}: {result.success ? '✓' : '✗'}
                </span>
              ))}
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
              >
                <Plus className="h-4 w-4 mr-2" /> Crear Nueva Plakita
              </Button>
            </CardHeader>
            <CardContent>
              <AdminTagsTable tags={tagsWithDetails} onOpenDeleteDialog={openDeleteConfirmDialog} />
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