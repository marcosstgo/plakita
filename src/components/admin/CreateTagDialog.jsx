
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { PlusCircle } from 'lucide-react';

const CreateTagDialog = ({ isOpen, onOpenChange, onSuccess }) => {
  const [newTagCode, setNewTagCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagCode.trim()) {
      toast({ title: "Error", description: "El código del tag no puede estar vacío.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    const { data, error } = await supabase
      .from('tags')
      .insert({ 
        code: newTagCode.trim().toUpperCase(), 
        activated: false, 
        user_id: null, 
        pet_id: null   
      })
      .select()
      .single();
    
    setIsSubmitting(false);
    if (error) {
      toast({ title: "Error creando tag", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tag Creado", description: `Tag ${data.code} creado exitosamente. Está listo para ser activado por un cliente.` });
      setNewTagCode('');
      onSuccess(); 
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 text-white border-purple-500 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-purple-300 text-2xl flex items-center">
            <PlusCircle className="h-6 w-6 mr-2 text-purple-300" />
            Crear Nueva Plakita (Tag QR)
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateTag} className="space-y-6 mt-4">
          <div>
            <Label htmlFor="tagCodeDialog" className="text-purple-300 font-medium">Código Único de la Plakita</Label>
            <Input
              id="tagCodeDialog"
              value={newTagCode}
              onChange={(e) => setNewTagCode(e.target.value.toUpperCase())}
              placeholder="Ej: PLK-XYZ123"
              required
              className="mt-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1.5">Debe ser único. Se recomienda un prefijo (ej. PLK-) seguido de caracteres alfanuméricos.</p>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-gray-500 text-gray-300 hover:bg-gray-700">
                Cancelar
              </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : null}
              Crear Plakita
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTagDialog;
