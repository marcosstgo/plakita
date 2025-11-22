import React, { useState, useEffect } from 'react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const PetForm = ({ isOpen, setIsOpen, initialData, onSubmit, isEditing }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    type: '',
    breed: '',
    ownerName: '',
    contactInfo: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        name: '',
        type: '',
        breed: '',
        ownerName: '',
        contactInfo: '',
        notes: ''
      });
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData); 
  };

  return (
    <DialogContent className="max-w-md bg-gray-800 text-white border-cyan-500">
      <DialogHeader>
        <DialogTitle className="text-sky-400">
          {isEditing ? 'Editar Mascota' : 'Registrar Mascota y Nuevo Tag'}
        </DialogTitle>
        <DialogDescription className="text-gray-400">
          {isEditing ? 'Actualiza la información de tu mascota.' : 'Completa la información para tu mascota. Se generará un nuevo Tag QR.'}
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-cyan-300">Nombre de la mascota</Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={handleChange}
            placeholder="Ej: Max"
            required
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type" className="text-cyan-300">Tipo de mascota</Label>
          <Select 
            value={formData.type || ''} 
            onValueChange={(value) => handleSelectChange('type', value)} 
            required
          >
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600 text-white">
              <SelectItem value="perro" className="hover:bg-sky-600">Perro</SelectItem>
              <SelectItem value="gato" className="hover:bg-sky-600">Gato</SelectItem>
              <SelectItem value="ave" className="hover:bg-sky-600">Ave</SelectItem>
              <SelectItem value="conejo" className="hover:bg-sky-600">Conejo</SelectItem>
              <SelectItem value="otro" className="hover:bg-sky-600">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="breed" className="text-cyan-300">Raza (opcional)</Label>
          <Input
            id="breed"
            value={formData.breed || ''}
            onChange={handleChange}
            placeholder="Ej: Golden Retriever"
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerName" className="text-cyan-300">Nombre del dueño</Label>
          <Input
            id="ownerName"
            value={formData.ownerName || ''}
            onChange={handleChange}
            placeholder="Tu nombre"
            required
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactInfo" className="text-cyan-300">Información de contacto</Label>
          <Input
            id="contactInfo" 
            value={formData.contactInfo || ''}
            onChange={handleChange}
            placeholder="Teléfono o email"
            required
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-cyan-300">Notas adicionales (opcional)</Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            placeholder="Información médica, comportamiento, etc."
            rows={3}
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
          />
        </div>

        <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white mt-6">
          {isEditing ? 'Actualizar Mascota' : 'Guardar Mascota y Crear Tag'}
        </Button>
      </form>
    </DialogContent>
  );
};

export default PetForm;