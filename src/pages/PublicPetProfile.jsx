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
      const result = await getPublicPetById(petId);
      
      if (!result.success || !result.data) {
        setPet(null);
        setIsLoading(false);
        return;
      }
      
      const petData = result.data;
      setPet(petData);
      
      // Extraer información del tag si existe
      if (petData.tags && petData.tags.length > 0) {
        setTag(petData.tags[0]);
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

  const handleContact = (contactInfo) => {
    if (contactInfo.includes('@')) {
      window.location.href = `mailto:${contactInfo}`;
    } else {
      window.location.href = `tel:${contactInfo.replace(/\s+/g, '')}`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 px-4">
        <Card className="gradient-card border-white/20 max-w-md mx-auto text-white">
          <CardContent className="text-center py-12">
            <ShieldAlert className="h-16 w-16 text-red-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Plakita no Encontrada</h1>
            <p className="text-white/80 mb-6">
              El código QR que escaneaste no corresponde a una Plakita registrada o válida.
            </p>
            <Link to="/">
              <Button className="bg-white text-purple-600 hover:bg-white/90">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 px-4">
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
              <Button className="bg-white text-purple-600 hover:bg-white/90">
                Ir a la Página Principal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 py-8 px-4">
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
                className="w-40 h-40 rounded-full mx-auto mb-6 object-cover border-4 border-white/50 shadow-xl"
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
                <p className="text-3xl font-bold">{pet.owner_name}</p>
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
                <h3 className="text-xl font-semibold text-white mb-4">
                  Por favor, contacta a mi dueño:
                </h3>
                <Button
                  onClick={() => handleContact(pet.owner_contact)} 
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-gray-200 text-lg px-10 py-6 rounded-full shadow-xl transform hover:scale-105 transition-transform duration-200 ease-in-out pulse-glow"
                >
                  {pet.owner_contact.includes('@') ? (
                    <>
                      <Mail className="h-6 w-6 mr-3" />
                      Enviar Email
                    </>
                  ) : (
                    <>
                      <Phone className="h-6 w-6 mr-3" />
                      Llamar Ahora
                    </>
                  )}
                </Button>
                <p className="text-white/70 text-md mt-4">
                  {pet.owner_contact}
                </p>
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