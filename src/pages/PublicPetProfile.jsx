import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Phone, Mail, MessageCircle, ShieldAlert, QrCode } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPublicPetById } from '@/lib/supabaseClient';
import QRCode from 'qrcode';

const PublicPetProfile = () => {
  const { petId } = useParams();
  const [pet, setPet] = useState(null);
  const [tag, setTag] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    loadPetAndTag();
  }, [petId]);

  useEffect(() => {
    if (pet && pet.qr_activated && tag?.activated) {
      generateQR();
    }
  }, [pet, tag]);

  const loadPetAndTag = async () => {
    setIsLoading(true);
    
    try {
      console.log('🔍 Cargando perfil público para pet ID:', petId);
      const result = await getPublicPetById(petId);
      
      if (!result.success || !result.data) {
        console.log('❌ No se encontró la mascota o no está activada');
        setPet(null);
        setIsLoading(false);
        return;
      }
      
      const petData = result.data;
      console.log('✅ Mascota encontrada:', petData);
      setPet(petData);
      
      // Extraer información del tag si existe
      if (petData.tags && petData.tags.length > 0) {
        setTag(petData.tags[0]);
        console.log('🏷️ Tag asociado:', petData.tags[0]);
      }
      
    } catch (error) {
      console.error("Error cargando mascota pública:", error);
      setPet(null);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQR = async () => {
    if (!pet) return;
    try {
      const url = `${window.location.origin}/public/pet/${pet.id}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 128, 
        margin: 1,
        color: { dark: '#FFFFFF', light: '#00000000' } 
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('Error generating QR for public profile:', err);
    }
  };

  // Función para extraer solo el primer nombre
  const getFirstName = (fullName) => {
    if (!fullName) return 'Mi dueño';
    const names = fullName.trim().split(' ');
    return names[0];
  };

  // Función para determinar si un contacto es email o teléfono
  const isEmail = (contact) => {
    return contact && contact.includes('@');
  };

  const isPhone = (contact) => {
    return contact && /^[\+]?[\d\s\-\(\)]+$/.test(contact);
  };

  // Función para manejar contacto por teléfono
  const handlePhoneContact = (phone) => {
    const cleanPhone = phone.replace(/\s+/g, '').replace(/\D/g, '');
    window.location.href = `tel:${cleanPhone}`;
  };

  // Función para manejar contacto por email
  const handleEmailContact = (email) => {
    window.location.href = `mailto:${email}`;
  };

  // Función para WhatsApp (si el teléfono es válido)
  const handleWhatsAppContact = (phone) => {
    const cleanPhone = phone.replace(/\s+/g, '').replace(/\D/g, '');
    const message = encodeURIComponent(`Hola! Encontré a ${pet.name}. ¿Podrías ayudarme a reunirlos?`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-400 via-emerald-500 to-red-500">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-400 via-emerald-500 to-red-500 px-4">
        <Card className="gradient-card border-white/20 max-w-md mx-auto text-white">
          <CardContent className="text-center py-12">
            <ShieldAlert className="h-16 w-16 text-red-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Plakita no Encontrada</h1>
            <p className="text-white/80 mb-6">
              El código QR que escaneaste no corresponde a una Plakita registrada o válida.
            </p>
            <Link to="/">
              <Button className="bg-white text-sky-600 hover:bg-white/90">
                Ir a la Página Principal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // CAMBIO: Verificar tanto qr_activated como tag.activated para mostrar el perfil
  if (!pet.qr_activated || !tag?.activated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-400 via-emerald-500 to-red-500 px-4">
        <Card className="gradient-card border-white/20 max-w-md mx-auto text-white">
          <CardContent className="text-center py-12">
            <QrCode className="h-16 w-16 text-yellow-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Plakita no Activada</h1>
            <p className="text-white/80 mb-6">
              Esta Plakita aún no ha sido activada por el dueño. Por favor, informa al dueño para que complete el registro.
            </p>
            {tag?.code && (
              <p className="text-sm text-white/70 mb-6">Código de Tag: <span className="font-mono">{tag.code}</span></p>
            )}
            <Link to="/">
              <Button className="bg-white text-sky-600 hover:bg-white/90">
                Ir a la Página Principal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-emerald-500 to-orange-500 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <Heart className="h-16 w-16 text-white mx-auto mb-4" />
          <h1 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">
            ¡Hola! Soy {pet.name}
          </h1>
          <p className="text-white/90 text-xl drop-shadow-md">
            Parece que me he perdido. ¿Puedes ayudarme a volver a casa?
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="gradient-card border-white/20 mb-6 shadow-2xl">
            <CardHeader className="text-center pt-8">
              <img 
                className="w-40 h-40 rounde-full mx-auto mb-6 object-cover border-4 border-white/50 shadow-xl"
                alt={`${pet.name} - ${pet.type}`}
                src="https://images.unsplash.com/photo-1703386194257-ea34a51282d6" />
              <CardTitle className="text-white text-4xl font-bold drop-shadow-md">
                {pet.name}
              </CardTitle>
              <CardDescription className="text-white/80 text-lg">
                {pet.type} {pet.breed && `• ${pet.breed}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-white space-y-6 px-6 pb-8">
              <div className="text-center bg-white/10 p-4 rounded-lg">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Mi dueño es:
                </h2>
                <p className="text-3xl font-bold">{getFirstName(pet.owner_name)}</p>
              </div>

              {pet.notes && (
                <div className="bg-white/10 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white/90 mb-2">
                    Información importante:
                  </h3>
                  <p className="text-white/80 whitespace-pre-wrap">{pet.notes}</p>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-6">
                  Por favor, contacta a mi dueño:
                </h3>
                
                <div className="space-y-4">
                  {/* Botón de teléfono - priorizar owner_phone si existe, sino usar owner_contact si es teléfono */}
                  {(pet.owner_phone || (pet.owner_contact && isPhone(pet.owner_contact))) && (
                    <div className="space-y-2">
                      <Button
                        onClick={() => handlePhoneContact(pet.owner_phone || pet.owner_contact)} 
                        size="lg"
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-lg px-10 py-6 rounded-full shadow-xl transform hover:scale-105 transition-transform duration-200 ease-in-out"
                      >
                        <Phone className="h-6 w-6 mr-3" />
                        Llamar Ahora
                      </Button>
                      <p className="text-white/70 text-sm">
                        {pet.owner_phone || pet.owner_contact}
                      </p>
                      
                      {/* Botón de WhatsApp adicional */}
                      <Button
                        onClick={() => handleWhatsAppContact(pet.owner_phone || pet.owner_contact)}
                        size="lg"
                        variant="outline"
                        className="w-full border-green-400 text-green-400 hover:bg-green-400 hover:text-white text-lg px-10 py-4 rounded-full shadow-lg transform hover:scale-105 transition-transform duration-200 ease-in-out"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        WhatsApp
                      </Button>
                    </div>
                  )}

                  {/* Botón de email - usar owner_contact si es email */}
                  {(pet.owner_contact && isEmail(pet.owner_contact)) && (
                    <div className="space-y-2">
                      <Button
                        onClick={() => handleEmailContact(pet.owner_contact)} 
                        size="lg"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg px-10 py-6 rounded-full shadow-xl transform hover:scale-105 transition-transform duration-200 ease-in-out"
                      >
                        <Mail className="h-6 w-6 mr-3" />
                        Enviar Email
                      </Button>
                      <p className="text-white/70 text-sm">
                        {pet.owner_contact}
                      </p>
                    </div>
                  )}

                  {/* Fallback si no hay teléfono ni email válidos */}
                  {!pet.owner_phone && 
                   !isPhone(pet.owner_contact) && 
                   !isEmail(pet.owner_contact) && 
                   pet.owner_contact && (
                    <div className="space-y-2">
                      <Button
                        onClick={() => {
                          // Intentar determinar el tipo de contacto
                          if (pet.owner_contact.includes('@')) {
                            handleEmailContact(pet.owner_contact);
                          } else {
                            handlePhoneContact(pet.owner_contact);
                          }
                        }} 
                        size="lg"
                        className="w-full bg-sky-600 hover:bg-sky-700 text-white text-lg px-10 py-6 rounded-full shadow-xl transform hover:scale-105 transition-transform duration-200 ease-in-out pulse-glow"
                      >
                        <Phone className="h-6 w-6 mr-3" />
                        Contactar
                      </Button>
                      <p className="text-white/70 text-sm">
                        {pet.owner_contact}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-white/20 text-white shadow-xl">
            <CardContent className="text-center py-8 px-6">
              <MessageCircle className="h-12 w-12 text-white mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">
                ¡Gracias por tu ayuda!
              </h2>
              <p className="text-white/80 text-lg">
                Mi familia y yo te agradecemos mucho que me hayas encontrado.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-10 flex flex-col items-center"
        >
          {qrDataUrl && (
            <div className="bg-black/30 p-2 rounded-lg inline-block mb-2">
              <img src={qrDataUrl} alt="Plakita QR Code" className="w-16 h-16" />
            </div>
          )}
          <p className="text-white/70 text-sm">
            Plakita - Identificación Inteligente de Mascotas
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PublicPetProfile;