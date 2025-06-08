
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Heart, Tag, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import PetCard from '@/components/dashboard/PetCard';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [petsWithTags, setPetsWithTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const loadPetsAndTags = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // Step 1: Fetch tags associated with the user that have a pet_id
    const { data: tagsData, error: tagsError } = await supabase
      .from('tags')
      .select('id, code, activated, pet_id, user_id') // Select all needed fields from tags
      .eq('user_id', user.id)
      .not('pet_id', 'is', null); // Ensure there's a pet linked

    if (tagsError) {
      toast({ title: "Error cargando Plakitas", description: tagsError.message, variant: "destructive" });
      setPetsWithTags([]);
      setIsLoading(false);
      return;
    }

    if (!tagsData || tagsData.length === 0) {
      setPetsWithTags([]); // No tags linked to pets for this user
      setIsLoading(false);
      return;
    }

    // Step 2: Extract pet_ids and fetch corresponding pets
    const petIds = tagsData.map(tag => tag.pet_id).filter(id => id !== null);
    
    if (petIds.length === 0) {
      setPetsWithTags([]); // Should not happen if previous check for pet_id not null worked
      setIsLoading(false);
      return;
    }

    const { data: petsData, error: petsError } = await supabase
      .from('pets')
      .select('id, name, type, breed, owner_name, owner_contact, notes, qr_activated, user_id')
      .in('id', petIds)
      .eq('user_id', user.id); // Ensure pet also belongs to the user
    
    if (petsError) {
      toast({ title: "Error cargando Mascotas", description: petsError.message, variant: "destructive" });
      setPetsWithTags([]);
      setIsLoading(false);
      return;
    }

    // Step 3: Combine tags and pets data
    // We iterate through petsData and find their corresponding tag from tagsData
    // This approach is slightly different from the previous one but achieves the same result:
    // an array of pets, each with its associated tag information nested.
    const combinedData = petsData.map(pet => {
      const tag = tagsData.find(t => t.pet_id === pet.id);
      if (!tag) return null; // Should not happen if data is consistent
      return {
        ...pet, // Spread pet details
        tags: { // Nest tag details
          id: tag.id,
          code: tag.code,
          activated: tag.activated,
          pet_id: tag.pet_id,
          user_id: tag.user_id
        }
      };
    }).filter(item => item !== null); // Filter out any nulls from inconsistencies

    setPetsWithTags(combinedData);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadPetsAndTags();
  }, [loadPetsAndTags]);

  const openDeleteConfirmDialog = (pet) => {
    setItemToDelete(pet);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !itemToDelete.id || !itemToDelete.tags || !itemToDelete.tags.id) {
        toast({ title: "Error", description: "No se pudo identificar la mascota o el tag a eliminar.", variant: "destructive" });
        setIsConfirmDeleteDialogOpen(false);
        return;
    }

    const petIdToDelete = itemToDelete.id;
    const tagIdToUpdate = itemToDelete.tags.id;

    try {
      // Desvincular el tag de la mascota y desactivarlo
      const { error: tagUpdateError } = await supabase
        .from('tags')
        .update({ pet_id: null, activated: false }) 
        .eq('id', tagIdToUpdate)
        .eq('user_id', user.id);

      if (tagUpdateError) {
        toast({ title: "Error desvinculando Plakita", description: tagUpdateError.message, variant: "destructive" });
        setIsConfirmDeleteDialogOpen(false); // Keep dialog open or close based on preference
        return;
      }

      // Eliminar la mascota
      const { error: petDeleteError } = await supabase
        .from('pets')
        .delete()
        .eq('id', petIdToDelete)
        .eq('user_id', user.id);

      if (petDeleteError) {
        toast({ title: "Error eliminando mascota", description: petDeleteError.message, variant: "destructive" });
        // Potentially rollback tag update or notify user of partial success
      } else {
        toast({ title: "Éxito", description: `Mascota ${itemToDelete.name} eliminada y Plakita ${itemToDelete.tags.code} desvinculada.` });
        loadPetsAndTags(); // Refresh data
      }
    } catch (error) {
      toast({ title: "Error en el proceso de eliminación", description: error.message, variant: "destructive" });
    } finally {
      setIsConfirmDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };
  

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            ¡Hola, {user?.user_metadata?.full_name || user?.email}!
          </h1>
          <p className="text-white/80 text-lg">
            Gestiona tus Plakitas y la información de tus mascotas.
          </p>
        </motion.div>

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-white">
            Mis Mascotas ({petsWithTags.length})
          </h2>
          
          <Button 
            className="bg-white text-purple-600 hover:bg-white/90"
            onClick={() => navigate('/activate-plakita')}
          >
            <Tag className="h-4 w-4 mr-2" />
            Activar Nueva Plakita
          </Button>
        </div>
        
        {petsWithTags.length === 0 && !isLoading ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16 gradient-card rounded-lg"
          >
            <Heart className="h-24 w-24 text-white/50 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-white mb-4">
              Aún no tienes mascotas con Plakita
            </h3>
            <p className="text-white/80 mb-8">
              Activa tu primera Plakita para registrar a tu mascota y protegerla.
            </p>
            <Button 
              onClick={() => navigate('/activate-plakita')}
              className="bg-white text-purple-600 hover:bg-white/90"
            >
              <Tag className="h-4 w-4 mr-2" />
              Activar Mi Primera Plakita
            </Button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {petsWithTags.map((petWithTagInfo, index) => (
              <PetCard 
                key={petWithTagInfo.id} 
                pet={petWithTagInfo} 
                index={index} 
                onEdit={() => navigate(`/pet/${petWithTagInfo.id}`)} 
                onDelete={() => openDeleteConfirmDialog(petWithTagInfo)}
              />
            ))}
          </div>
        )}
      </div>
      
      <Dialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white border-red-500">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2 text-red-400" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              ¿Estás seguro de que quieres eliminar a <span className="font-semibold">{itemToDelete?.name}</span>? 
              Su Plakita asociada ({itemToDelete?.tags?.code}) será desvinculada. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-gray-500 text-gray-300 hover:bg-gray-700">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Sí, Eliminar Mascota y Desvincular Plakita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Dashboard;
