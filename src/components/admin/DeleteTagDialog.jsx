
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { AlertTriangle, Trash2 } from 'lucide-react';

const DeleteTagDialog = ({ isOpen, onOpenChange, tagToDelete, onSuccess }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteTag = async () => {
    if (!tagToDelete) return;

    if (tagToDelete.activated || tagToDelete.pet_id || tagToDelete.user_id) {
        toast({ title: "Acción no permitida", description: "Solo se pueden eliminar tags no activados, no vinculados a mascotas y no reclamados por usuarios.", variant: "destructive" });
        onOpenChange(false);
        return;
    }
    setIsDeleting(true);
    const { error } = await supabase.from('tags').delete().eq('id', tagToDelete.id);
    setIsDeleting(false);
    if (error) {
        toast({ title: "Error eliminando tag", description: error.message, variant: "destructive" });
    } else {
        toast({ title: "Tag Eliminado", description: `El tag ${tagToDelete.code} ha sido eliminado.` });
        onSuccess();
    }
    onOpenChange(false); 
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white border-red-500 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-red-400 flex items-center text-2xl">
            <AlertTriangle className="h-6 w-6 mr-2 text-red-400" />
            Confirmar Eliminación
          </DialogTitle>
          <DialogDescription className="text-gray-300 pt-2">
            ¿Estás seguro de que quieres eliminar la Plakita con código <span className="font-semibold text-purple-300">{tagToDelete?.code}</span>? 
            Esta acción no se puede deshacer y solo es posible si la Plakita no ha sido activada, vinculada a una mascota, ni reclamada por un usuario.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-gray-500 text-gray-300 hover:bg-gray-700">
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={confirmDeleteTag} className="bg-red-600 hover:bg-red-700 text-white" disabled={isDeleting}>
            {isDeleting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <Trash2 className="h-4 w-4 mr-2"/>}
            Sí, Eliminar Plakita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteTagDialog;
