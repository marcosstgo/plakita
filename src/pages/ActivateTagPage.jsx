import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tag, PawPrint, UserCircle, Phone, Edit3, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { getTagByCode, activateTagWithPet } from '@/lib/supabaseClient';
import { validatePetForm, sanitizePetFormData } from '@/components/forms/PetFormValidation';
import FormErrorDisplay from '@/components/forms/FormErrorDisplay';

const ActivateTagPage = () => {
  const { tagCode: tagCodeFromParams } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [tagCode, setTagCode] = useState(tagCodeFromParams || '');
  const [tagInfo, setTagInfo] = useState(null);
  const [petInfo, setPetInfo] = useState(null); 
  const [isLoading, setIsLoading] = useState(!!tagCodeFromParams); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingTag, setIsFetchingTag] = useState(false);
  const [showPetForm, setShowPetForm] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '', type: '', breed: '', ownerName: '', contactInfo: '', notes: ''
  });

  useEffect(() => {
    if (tagCodeFromParams && !authLoading) { 
      setTagCode(tagCodeFromParams);
      handleFetchTagInfo(tagCodeFromParams);
    } else if (!tagCodeFromParams) {
      setIsLoading(false); 
    }
  }, [tagCodeFromParams, user, authLoading]);

  useEffect(() => {
    if (user && showPetForm) {
      setFormData(prev => ({
        ...prev,
        ownerName: prev.ownerName || user.user_metadata?.full_name || user.email || '',
        contactInfo: prev.contactInfo || user.user_metadata?.phone || user.email || '',
      }));
    }
  }, [user, showPetForm]);

  const handleFetchTagInfo = async (currentTagCode) => {
    if (!currentTagCode || currentTagCode.trim() === '') {
      toast({ title: "Entrada requerida", description: "Por favor, ingresa un código de Plakita.", variant: "default" });
      return;
    }
    setIsFetchingTag(true);
    setIsLoading(true); 
    setPetInfo(null); 
    setTagInfo(null); 
    setShowPetForm(false);
    setFormErrors({});

    const upperCaseTagCode = currentTagCode.trim().toUpperCase();

    try {
      const result = await getTagByCode(upperCaseTagCode);
      
      if (!result.success || !result.data) {
        toast({ 
          title: "Plakita no encontrada", 
          description: `No se encontró una Plakita con el código "${upperCaseTagCode}". Verifica el código o contacta soporte.`, 
          variant: "destructive" 
        });
        return;
      }

      const fetchedTagData = result.data;
      setTagInfo(fetchedTagData);
      
      // Si el tag tiene una mascota asociada
      if (fetchedTagData.pets) {
        const associatedPet = fetchedTagData.pets;
        
        // Verificar si el usuario actual es el dueño
        if (fetchedTagData.activated && associatedPet) {
          const petOwnerId = associatedPet.user_id;
          if (!user || (user && user.id !== petOwnerId)) {
            navigate(`/public/pet/${associatedPet.id}`);
            return;
          }
          // El dueño está viendo, permitir editar
          setPetInfo(associatedPet);
          setFormData({
            name: associatedPet.name || '', 
            type: associatedPet.type || '', 
            breed: associatedPet.breed || '',
            ownerName: associatedPet.owner_name || user?.user_metadata?.full_name || '',
            contactInfo: associatedPet.owner_contact || user?.email || '',
            notes: associatedPet.notes || ''
          });
          setShowPetForm(true);
          toast({ 
            title: "Plakita Encontrada", 
            description: `Editando información para ${associatedPet.name}.`, 
            variant: "default" 
          });
        } else {
          // Tag no activado pero tiene mascota asociada
          setShowPetForm(true);
          setFormData({ 
            name: '', type: '', breed: '', 
            ownerName: user?.user_metadata?.full_name || '', 
            contactInfo: user?.email || '', 
            notes: '' 
          });
          toast({ 
            title: "Plakita Disponible", 
            description: `Plakita ${upperCaseTagCode} lista para activar. Completa los datos de tu mascota.`, 
            variant: "default" 
          });
        }
      } else {
        // Tag sin mascota asociada
        if (fetchedTagData.user_id && user && fetchedTagData.user_id !== user.id) {
          toast({ 
            title: "Plakita Reclamada", 
            description: "Esta Plakita ya ha sido reclamada por otro usuario.", 
            variant: "destructive" 
          });
        } else {
          if (!user) {
            toast({ 
              title: "Autenticación Requerida", 
              description: "Inicia sesión para activar esta Plakita.", 
              variant: "default" 
            });
            const redirectTo = location.pathname + location.search;
            navigate(`/login?redirect=${encodeURIComponent(redirectTo)}`);
            return;
          }
          setShowPetForm(true); 
          setFormData({ 
            name: '', type: '', breed: '', 
            ownerName: user.user_metadata?.full_name || '', 
            contactInfo: user.email || '', 
            notes: '' 
          });
          toast({ 
            title: "Plakita Disponible", 
            description: `Plakita ${upperCaseTagCode} lista para activar. Completa los datos de tu mascota.`, 
            variant: "default" 
          });
        }
      }
    } catch (error) {
      console.error('Error fetching tag info:', error);
      toast({ 
        title: "Error", 
        description: `Error buscando Plakita: ${error.message}`, 
        variant: "destructive" 
      });
    } finally {
      setIsFetchingTag(false);
      setIsLoading(false);
    }
  };

  const handleSubmitPetInfo = async (e) => {
    e.preventDefault();
    
    // Limpiar y validar datos del formulario
    const sanitizedData = sanitizePetFormData(formData);
    const validation = validatePetForm(sanitizedData);
    
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      toast({
        title: "Errores en el formulario",
        description: "Por favor, corrige los errores antes de continuar.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    if (!user) {
      toast({ title: "Error", description: "Debes estar logueado.", variant: "destructive" });
      setIsSubmitting(false); 
      return;
    }
    if (!tagInfo) {
      toast({ title: "Error", description: "Información de la Plakita no disponible. Intenta buscarla de nuevo.", variant: "destructive" });
      setIsSubmitting(false); 
      return;
    }

    const petPayload = {
      id: petInfo?.id || null,
      name: sanitizedData.name, 
      type: sanitizedData.type, 
      breed: sanitizedData.breed,
      owner_name: sanitizedData.ownerName, 
      owner_contact: sanitizedData.contactInfo,
      notes: sanitizedData.notes
    };

    try {
      console.log('🐕 Activando tag con datos:', petPayload);
      
      const result = await activateTagWithPet(tagInfo.id, petPayload, user.id);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      toast({ 
        title: petInfo ? "¡Plakita Actualizada!" : "¡Plakita Activada!", 
        description: `Operación exitosa para ${sanitizedData.name}.` 
      });
      navigate(`/dashboard`); 

    } catch (error) {
      console.error('Error submitting pet info:', error);
      
      // Manejar errores específicos
      if (error.message.includes('row-level security')) {
        toast({ 
          title: "Error de permisos", 
          description: "No tienes permisos para realizar esta acción.", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Error en la operación", 
          description: error.message, 
          variant: "destructive" 
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const pageTitle = (tagInfo?.activated && petInfo) ? "Actualizar Información de Plakita" : "Activar Plakita";
  const submitButtonText = (tagInfo?.activated && petInfo) ? "Guardar Cambios" : "Activar y Registrar Mascota";

  if (authLoading || isLoading) { 
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg"
      >
        <Card className="gradient-card border-white/20 text-white">
          <CardHeader className="text-center">
            <div className="mx-auto bg-white/20 p-3 rounded-full inline-block mb-4">
              <Tag className="h-10 w-10 text-purple-300" />
            </div>
            <CardTitle className="text-3xl font-bold">
              {pageTitle}
            </CardTitle>
            <CardDescription className="text-white/80">
              Ingresa el código de tu Plakita para activarla o editar su información.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showPetForm && (
              <form onSubmit={(e) => { e.preventDefault(); handleFetchTagInfo(tagCode); }} className="space-y-6">
                <div>
                  <Label htmlFor="tagCodeInput" className="text-purple-300 flex items-center">
                    <Tag className="h-4 w-4 mr-2" /> Código de la Plakita
                  </Label>
                  <Input
                    id="tagCodeInput"
                    name="tagCodeInput"
                    type="text"
                    placeholder="Ej: PLK-XYZ123"
                    value={tagCode}
                    onChange={(e) => setTagCode(e.target.value.toUpperCase())}
                    className="mt-1 bg-white/10 border-white/30 placeholder:text-white/50"
                    required
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-white text-purple-600 hover:bg-purple-200 font-bold py-3 text-lg"
                  disabled={isFetchingTag}
                >
                  {isFetchingTag ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mr-2"></div>
                  ) : (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  )}
                  Buscar Plakita
                </Button>
              </form>
            )}

            {showPetForm && tagInfo && (
              <>
                <div className="my-4 p-3 bg-black/20 rounded-md">
                  <p className="text-sm text-purple-300">Plakita Seleccionada:</p>
                  <p className="font-mono text-lg text-purple-200">{tagInfo.code}</p>
                  {tagInfo.activated && petInfo && <p className="text-xs text-green-300">Esta Plakita ya está activada para <span className="font-semibold">{petInfo.name}</span>. Puedes editar los datos.</p>}
                  {tagInfo.activated && !petInfo && tagInfo.pet_id && <p className="text-xs text-yellow-300">Esta Plakita está activada pero la mascota asociada no se encontró. Completa los datos para re-vincular.</p>}
                  {!tagInfo.activated && <p className="text-xs text-yellow-300">Plakita lista para activar. Completa los datos de tu mascota.</p>}
                </div>
                
                <FormErrorDisplay errors={formErrors} className="mb-4" />
                
                <form onSubmit={handleSubmitPetInfo} className="space-y-6">
                  <div>
                    <Label htmlFor="name" className="text-purple-300 flex items-center">
                      <PawPrint className="h-4 w-4 mr-2" /> Nombre de la Mascota
                    </Label>
                    <Input 
                      id="name" 
                      name="name" 
                      type="text" 
                      placeholder="Ej: Max, Luna" 
                      value={formData.name} 
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        setFormErrors(prev => ({ ...prev, name: undefined }));
                      }} 
                      className={`mt-1 bg-white/10 border-white/30 placeholder:text-white/50 ${
                        formErrors.name ? 'border-red-500' : ''
                      }`}
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="type" className="text-purple-300 flex items-center">
                      <PawPrint className="h-4 w-4 mr-2" /> Tipo de Mascota
                    </Label>
                    <Select 
                      name="type" 
                      value={formData.type} 
                      onValueChange={(value) => {
                        setFormData({...formData, type: value});
                        setFormErrors(prev => ({ ...prev, type: undefined }));
                      }} 
                      required
                    >
                      <SelectTrigger className={`mt-1 w-full bg-white/10 border-white/30 placeholder:text-white/50 ${
                        formErrors.type ? 'border-red-500' : ''
                      }`}>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-purple-500 text-white">
                        <SelectItem value="perro" className="hover:bg-purple-600">Perro</SelectItem>
                        <SelectItem value="gato" className="hover:bg-purple-600">Gato</SelectItem>
                        <SelectItem value="ave" className="hover:bg-purple-600">Ave</SelectItem>
                        <SelectItem value="conejo" className="hover:bg-purple-600">Conejo</SelectItem>
                        <SelectItem value="otro" className="hover:bg-purple-600">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="breed" className="text-purple-300 flex items-center">
                      <PawPrint className="h-4 w-4 mr-2" /> Raza (Opcional)
                    </Label>
                    <Input 
                      id="breed" 
                      name="breed" 
                      type="text" 
                      placeholder="Ej: Labrador, Siamés" 
                      value={formData.breed} 
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })} 
                      className="mt-1 bg-white/10 border-white/30 placeholder:text-white/50" 
                    />
                  </div>
                  <hr className="border-white/20" />
                  <div>
                    <Label htmlFor="ownerName" className="text-purple-300 flex items-center">
                      <UserCircle className="h-4 w-4 mr-2" /> Nombre del Dueño
                    </Label>
                    <Input 
                      id="ownerName" 
                      name="ownerName" 
                      type="text" 
                      placeholder="Tu nombre completo" 
                      value={formData.ownerName} 
                      onChange={(e) => {
                        setFormData({ ...formData, ownerName: e.target.value });
                        setFormErrors(prev => ({ ...prev, ownerName: undefined }));
                      }} 
                      className={`mt-1 bg-white/10 border-white/30 placeholder:text-white/50 ${
                        formErrors.ownerName ? 'border-red-500' : ''
                      }`}
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactInfo" className="text-purple-300 flex items-center">
                      <Phone className="h-4 w-4 mr-2" /> Información de Contacto del Dueño
                    </Label>
                    <Input 
                      id="contactInfo" 
                      name="contactInfo" 
                      type="text" 
                      placeholder="Tu teléfono o email principal" 
                      value={formData.contactInfo} 
                      onChange={(e) => {
                        setFormData({ ...formData, contactInfo: e.target.value });
                        setFormErrors(prev => ({ ...prev, contactInfo: undefined }));
                      }} 
                      className={`mt-1 bg-white/10 border-white/30 placeholder:text-white/50 ${
                        formErrors.contactInfo ? 'border-red-500' : ''
                      }`}
                      required 
                    />
                  </div>
                  <hr className="border-white/20" />
                  <div>
                    <Label htmlFor="notes" className="text-purple-300 flex items-center">
                      <Edit3 className="h-4 w-4 mr-2" /> Notas Adicionales (Opcional)
                    </Label>
                    <Textarea 
                      id="notes" 
                      name="notes" 
                      placeholder="Alergias, medicación, etc." 
                      value={formData.notes} 
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                      className="mt-1 bg-white/10 border-white/30 placeholder:text-white/50 min-h-[100px]" 
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-white text-purple-600 hover:bg-purple-200 font-bold py-3 text-lg" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mr-2"></div>
                    ) : (
                      ((tagInfo?.activated && petInfo) ? <CheckCircle className="h-5 w-5 mr-2" /> : <Tag className="h-5 w-5 mr-2" />)
                    )}
                    {submitButtonText}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ActivateTagPage;