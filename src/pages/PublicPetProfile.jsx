import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Phone, Mail, MessageCircle, ShieldAlert, QrCode, Wifi, AlertCircle, Award, Shield, MapPin } from 'lucide-react';
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
  const [showContactInfo, setShowContactInfo] = useState(false);

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

  const getFirstName = (fullName) => {
    if (!fullName) return 'Mi dueño';
    const names = fullName.trim().split(' ');
    return names[0];
  };

  const isEmail = (contact) => {
    return contact && contact.includes('@');
  };

  const isPhone = (contact) => {
    return contact && /^[\+]?[\d\s\-\(\)]+$/.test(contact);
  };

  const handlePhoneContact = (phone) => {
    const cleanPhone = phone.replace(/\s+/g, '').replace(/\D/g, '');
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleEmailContact = (email) => {
    window.location.href = `mailto:${email}`;
  };

  const handleWhatsAppContact = (phone) => {
    const cleanPhone = phone.replace(/\s+/g, '').replace(/\D/g, '');
    const message = encodeURIComponent(`Hola! Encontré a ${pet.name}. ¿Podrías ayudarme a reunirlos?`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleContactClick = () => {
    setShowContactInfo(true);
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
      <div className="min-h-screen flex items-center justify-center py-8 px-4">
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

  if (!pet.qr_activated || !tag?.activated) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8 px-4">
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
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Pet Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="gradient-card border-white/20 overflow-hidden">
            {/* Header with Pet Image */}
            <div className="relative h-64 md:h-80 overflow-hidden">
              <img
                src="/plakita-Rottweiler copy.webp"
                alt={pet.name}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              {/* Pet Name Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Heart className="h-8 w-8 text-red-400 animate-pulse" />
                  <h1 className="text-4xl md:text-5xl font-bold text-white">
                    {pet.name}
                  </h1>
                </div>
                <p className="text-xl text-white/90">
                  {pet.type} {pet.breed && `• ${pet.breed}`}
                </p>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Alert - Pet Lost Status */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-amber-500/20 border border-amber-400/50 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-amber-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-1">
                      ¿Encontraste a {pet.name}?
                    </h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      Si has encontrado a esta mascota, por favor contacta al dueño lo antes posible
                      usando la información de contacto más abajo. ¡Gracias por ayudar!
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Pet Details */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Award className="h-6 w-6 text-cyan-300" />
                  Información de {pet.name}
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  {pet.age && (
                    <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <p className="text-white/70 text-sm mb-1">Edad</p>
                      <p className="text-white text-lg font-semibold">{pet.age}</p>
                    </div>
                  )}

                  {pet.color && (
                    <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <p className="text-white/70 text-sm mb-1">Color</p>
                      <p className="text-white text-lg font-semibold">{pet.color}</p>
                    </div>
                  )}

                  {pet.location && (
                    <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <p className="text-white/70 text-sm mb-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Ubicación
                      </p>
                      <p className="text-white text-lg font-semibold">{pet.location}</p>
                    </div>
                  )}

                  {pet.created_at && (
                    <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <p className="text-white/70 text-sm mb-1">Plakita Activada</p>
                      <p className="text-white text-lg font-semibold">
                        {new Date(pet.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {pet.notes && (
                  <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-cyan-300" />
                      Notas Importantes
                    </h3>
                    <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                      {pet.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Contact Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-6 w-6 text-green-400" />
                  <h2 className="text-2xl font-bold text-white">
                    Información de Contacto
                  </h2>
                </div>

                {!showContactInfo ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-lg p-6 text-center"
                  >
                    <Phone className="h-12 w-12 text-green-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Contacta al Dueño
                    </h3>
                    <p className="text-white/80 mb-4">
                      Haz clic aquí para ver la información de contacto del dueño
                    </p>
                    <Button
                      onClick={handleContactClick}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                      size="lg"
                    >
                      <Phone className="h-5 w-5 mr-2" />
                      Mostrar Contacto
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <p className="text-white/70 text-sm mb-2">Nombre del Dueño</p>
                      <p className="text-white text-lg font-semibold">{pet.owner_name}</p>
                    </div>

                    {(pet.owner_phone || (pet.owner_contact && isPhone(pet.owner_contact))) && (
                      <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                        <p className="text-white/70 text-sm mb-2 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Teléfono
                        </p>
                        <a
                          href={`tel:${pet.owner_phone || pet.owner_contact}`}
                          className="text-cyan-300 text-lg font-semibold hover:text-cyan-200 transition-colors"
                        >
                          {pet.owner_phone || pet.owner_contact}
                        </a>
                        <div className="space-y-2 mt-3">
                          <Button
                            onClick={() => handlePhoneContact(pet.owner_phone || pet.owner_contact)}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Llamar Ahora
                          </Button>
                          <Button
                            onClick={() => handleWhatsAppContact(pet.owner_phone || pet.owner_contact)}
                            variant="outline"
                            className="w-full border-green-400 text-green-400 hover:bg-green-400 hover:text-white"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                          </Button>
                        </div>
                      </div>
                    )}

                    {(pet.owner_contact && isEmail(pet.owner_contact)) && (
                      <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                        <p className="text-white/70 text-sm mb-2 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </p>
                        <a
                          href={`mailto:${pet.owner_contact}`}
                          className="text-cyan-300 text-lg font-semibold hover:text-cyan-200 transition-colors break-all"
                        >
                          {pet.owner_contact}
                        </a>
                        <Button
                          onClick={() => handleEmailContact(pet.owner_contact)}
                          className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Enviar Email
                        </Button>
                      </div>
                    )}

                    <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4">
                      <p className="text-green-200 text-sm text-center">
                        ✓ Información de contacto verificada y protegida por Plakita
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* NFC Badge */}
              {tag?.has_nfc && (
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-green-300">
                    <Wifi className="h-5 w-5" />
                    <span className="text-sm font-semibold">Esta Plakita tiene tecnología NFC</span>
                  </div>
                  <p className="text-xs text-green-200 mt-1 text-center">
                    Puedes acercar tu teléfono a la Plakita para abrir este perfil instantáneamente
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-8 flex flex-col items-center"
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
