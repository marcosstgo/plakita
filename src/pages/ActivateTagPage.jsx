import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tag, PawPrint, UserCircle, Phone, Mail, Edit3, AlertTriangle, CheckCircle, Bug, TestTube, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { getTagByCode, activateTagWithPet, debugTagSearch, createTestTags } from '@/lib/supabaseClient';
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
  const [debugInfo, setDebugInfo] = useState(null);
  const [isCreatingTestTags, setIsCreatingTestTags] = useState(false);

  const [formData, setFormData] = useState({
    name: '', 
    type: '', 
    breed: '', 
    ownerName: '', 
    ownerPhone: '', 
    ownerEmail: '', 
    notes: ''
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
        ownerEmail: prev.ownerEmail || user.email || '',
        ownerPhone: prev.ownerPhone || user.user_metadata?.phone || '',
      }));
    }
  }, [user, showPetForm]);

  const handleDebugSearch = async (currentTagCode) => {
    console.log('🐛 Iniciando debug para código:', currentTagCode);
    try {
      const debugResult = await debugTagSearch(currentTagCode);
      setDebugInfo(debugResult.debug);
      console.log('🐛 Resultado del debug:', debugResult);
      
      toast({
        title: "Debug completado",
        description: `Se encontraron ${debugResult.debug?.totalTags || 0} tags en total. Ver consola para detalles.`
      });
    } catch (error) {
      console.error('🐛 Error en debug:', error);
      toast({
        title: "Error en debug",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCreateTestTags = async () => {
    setIsCreatingTestTags(true);
    
    try {
      const result = await createTestTags(5); // Crear 5 tags de prueba
      
      if (result.success) {
        toast({
          title: "Tags de prueba creados",
          description: `Se crearon ${result.created} tags de prueba. Prueba con PLK-TEST01.`
        });
        
        // Actualizar debug info
        await handleDebugSearch(tagCode || 'PLK-TEST01');
        
        // Si no hay código ingresado, sugerir uno de prueba
        if (!tagCode.trim()) {
          setTagCode('PLK-TEST01');
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error creando tags de prueba",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreatingTestTags(false);
    }
  };

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
    setDebugInfo(null);

    const upperCaseTagCode = currentTagCode.trim().toUpperCase();
    console.log('🔍 Buscando tag:', upperCaseTagCode);

    try {
      const result = await getTagByCode(upperCaseTagCode);
      console.log('📋 Resultado de búsqueda:', result);
      
      if (!result.success || !result.data) {
        console.log('❌ Tag no encontrado, ejecutando debug...');
        
        // Ejecutar debug automáticamente cuando no se encuentra el tag
        await handleDebugSearch(upperCaseTagCode);
        
        let errorMessage = `No se encontró una Plakita con el código "${upperCaseTagCode}".`;
        
        if (result.availableTags && result.availableTags.length > 0) {
          const availableCodes = result.availableTags.map(t => t.code).join(', ');
          errorMessage += ` Códigos disponibles: ${availableCodes}`;
        } else {
          errorMessage += ' No hay tags en la base de datos.';
        }
        
        toast({ 
          title: "Plakita no encontrada", 
          description: errorMessage, 
          variant: "destructive" 
        });
        return;
      }

      const fetchedTagData = result.data;
      setTagInfo(fetchedTagData);
      console.log('✅ Tag encontrado:', fetchedTagData);
      
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
            ownerPhone: associatedPet.owner_phone || user?.user_metadata?.phone || '',
            ownerEmail: associatedPet.owner_contact || user?.email || '',
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
            ownerPhone: user?.user_metadata?.phone || '',
            ownerEmail: user?.email || '', 
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
          // CAMBIO: Si no hay usuario autenticado, redirigir a registro en lugar de login
          if (!user) {
            toast({ 
              title: "Registro Requerido", 
              description: "Regístrate para activar esta Plakita y proteger a tu mascota.", 
              variant: "default" 
            });
            const redirectTo = location.pathname + location.search;
            navigate(`/register?redirect=${encodeURIComponent(redirectTo)}`);
            return;
          }
          setShowPetForm(true); 
          setFormData({ 
            name: '', type: '', breed: '', 
            ownerName: user.user_metadata?.full_name || '', 
            ownerPhone: user.user_metadata?.phone || '',
            ownerEmail: user.email || '', 
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
      console.error('💥 Error fetching tag info:', error);
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
    
    // Validar que al menos teléfono o email esté presente
    if (!formData.ownerPhone && !formData.ownerEmail) {
      setFormErrors({ contact: 'Debes proporcionar al menos un teléfono o email de contacto' });
      toast({
        title: "Información de contacto requerida",
        description: "Proporciona al menos un teléfono o email para contactarte.",
        variant: "destructive"
      });
      return;
    }
    
    // Limpiar y validar datos del formulario
    const sanitizedData = sanitizePetFormData({
      ...formData,
      contactInfo: formData.ownerEmail || formData.ownerPhone // Para compatibilidad con validación existente
    });
    
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
      owner_contact: formData.ownerEmail, // Email como contacto principal
      owner_phone: formData.ownerPhone, // Teléfono separado
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
              <Tag className="h-10 w-10 text-cyan-300" />
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
                  <Label htmlFor="tagCodeInput" className="text-cyan-300 flex items-center">
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
                
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-white text-sky-600 hover:bg-cyan-200 font-bold py-3 text-lg"
                    disabled={isFetchingTag}
                  >
                    {isFetchingTag ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-600 mr-2"></div>
                    ) : (
                      <CheckCircle className="h-5 w-5 mr-2" />
                    )}
                    Buscar Plakita
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={() => handleDebugSearch(tagCode)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4"
                    disabled={!tagCode.trim()}
                    title="Debug: Ver información de la base de datos"
                  >
                    <Bug className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Información de debug */}
                {debugInfo && (
                  <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                    <h4 className="text-yellow-300 font-semibold mb-2 flex items-center">
                      <Bug className="h-4 w-4 mr-2" />
                      Información de Debug:
                    </h4>
                    <div className="text-yellow-200 text-sm space-y-1">
                      <p>• Conexión: {debugInfo.connectionTest ? '✅' : '❌'}</p>
                      <p>• Total de tags en DB: {debugInfo.totalTags}</p>
                      <p>• Código buscado: {debugInfo.searchCode}</p>
                      <p>• Tag encontrado: {debugInfo.foundTag ? '✅' : '❌'}</p>
                      {debugInfo.searchError && <p>• Error: {debugInfo.searchError}</p>}
                      {debugInfo.allTags && debugInfo.allTags.length > 0 && (
                        <div>
                          <p>• Códigos disponibles:</p>
                          <div className="ml-2 max-h-20 overflow-y-auto">
                            {debugInfo.allTags.map((tag, i) => (
                              <button
                                key={i}
                                onClick={() => setTagCode(tag.code)}
                                className="block font-mono text-xs text-yellow-100 hover:text-white underline cursor-pointer"
                              >
                                - {tag.code}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Botón para crear tags de prueba si no hay ninguno */}
                {debugInfo && debugInfo.totalTags === 0 && (
                  <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                    <h4 className="text-blue-300 font-semibold mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      No hay tags en la base de datos
                    </h4>
                    <p className="text-blue-200 text-sm mb-3">
                      Parece que no hay Plakitas creadas. Crea algunas de prueba para comenzar.
                    </p>
                    <Button
                      type="button"
                      onClick={handleCreateTestTags}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isCreatingTestTags}
                    >
                      {isCreatingTestTags ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Crear Tags de Prueba
                    </Button>
                  </div>
                )}
              </form>
            )}

            {showPetForm && tagInfo && (
              <>
                <div className="my-4 p-3 bg-black/20 rounded-md">
                  <p className="text-sm text-cyan-300">Plakita Seleccionada:</p>
                  <p className="font-mono text-lg text-cyan-200">{tagInfo.code}</p>
                  {tagInfo.activated && petInfo && <p className="text-xs text-green-300">Esta Plakita ya está activada para <span className="font-semibold">{petInfo.name}</span>. Puedes editar los datos.</p>}
                  {tagInfo.activated && !petInfo && tagInfo.pet_id && <p className="text-xs text-yellow-300">Esta Plakita está activada pero la mascota asociada no se encontró. Completa los datos para re-vincular.</p>}
                  {!tagInfo.activated && <p className="text-xs text-yellow-300">Plakita lista para activar. Completa los datos de tu mascota.</p>}
                </div>
                
                <FormErrorDisplay errors={formErrors} className="mb-4" />
                
                <form onSubmit={handleSubmitPetInfo} className="space-y-6">
                  <div>
                    <Label htmlFor="name" className="text-cyan-300 flex items-center">
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
                    <Label htmlFor="type" className="text-cyan-300 flex items-center">
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
                      <SelectContent className="bg-gray-800 border-cyan-500 text-white">
                        <SelectItem value="perro" className="hover:bg-sky-600">Perro</SelectItem>
                        <SelectItem value="gato" className="hover:bg-sky-600">Gato</SelectItem>
                        <SelectItem value="ave" className="hover:bg-sky-600">Ave</SelectItem>
                        <SelectItem value="conejo" className="hover:bg-sky-600">Conejo</SelectItem>
                        <SelectItem value="otro" className="hover:bg-sky-600">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="breed" className="text-cyan-300 flex items-center">
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
                    <Label htmlFor="ownerName" className="text-cyan-300 flex items-center">
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
                    <Label htmlFor="ownerPhone" className="text-cyan-300 flex items-center">
                      <Phone className="h-4 w-4 mr-2" /> Teléfono del Dueño (Opcional)
                    </Label>
                    <Input 
                      id="ownerPhone" 
                      name="ownerPhone" 
                      type="tel" 
                      placeholder="Ej: +1 787 123 4567" 
                      value={formData.ownerPhone} 
                      onChange={(e) => {
                        setFormData({ ...formData, ownerPhone: e.target.value });
                        setFormErrors(prev => ({ ...prev, contact: undefined }));
                      }} 
                      className="mt-1 bg-white/10 border-white/30 placeholder:text-white/50"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="ownerEmail" className="text-cyan-300 flex items-center">
                      <Mail className="h-4 w-4 mr-2" /> Email del Dueño (Opcional)
                    </Label>
                    <Input 
                      id="ownerEmail" 
                      name="ownerEmail" 
                      type="email" 
                      placeholder="tu@email.com" 
                      value={formData.ownerEmail} 
                      onChange={(e) => {
                        setFormData({ ...formData, ownerEmail: e.target.value });
                        setFormErrors(prev => ({ ...prev, contact: undefined }));
                      }} 
                      className="mt-1 bg-white/10 border-white/30 placeholder:text-white/50"
                    />
                  </div>
                  
                  {formErrors.contact && (
                    <p className="text-red-300 text-sm">• {formErrors.contact}</p>
                  )}
                  
                  <hr className="border-white/20" />
                  
                  <div>
                    <Label htmlFor="notes" className="text-cyan-300 flex items-center">
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
                    className="w-full bg-white text-sky-600 hover:bg-cyan-200 font-bold py-3 text-lg" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-600 mr-2"></div>
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