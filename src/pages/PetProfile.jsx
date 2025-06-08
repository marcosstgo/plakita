
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, QrCode, Download, Share2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const PetProfile = () => {
  const { id: petId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pet, setPet] = useState(null);
  const [tagInfo, setTagInfo] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [activationQrDataUrl, setActivationQrDataUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadPetAndTag = useCallback(async () => {
    setIsLoading(true);
    if (!user || !petId) {
      setIsLoading(false);
      toast({ title: "Error", description: "No se pudo cargar la información.", variant: "destructive" });
      navigate('/dashboard');
      return;
    }

    // 1. Fetch Pet
    const { data: petData, error: petError } = await supabase
      .from('pets')
      .select('*')
      .eq('id', petId)
      .eq('user_id', user.id)
      .single();

    if (petError || !petData) {
      toast({ title: "Error", description: "Mascota no encontrada o no tienes permiso.", variant: "destructive" });
      navigate('/dashboard');
      setIsLoading(false);
      return;
    }
    setPet(petData);

    // 2. Fetch associated Tag
    const { data: tagData, error: tagError } = await supabase
      .from('tags')
      .select('code, activated') // Only select needed fields from tags
      .eq('pet_id', petData.id) // Link through pet_id
      .eq('user_id', user.id)   // Ensure tag also belongs to the user for consistency
      .maybeSingle(); 

    if (tagError && tagError.code !== 'PGRST116') { 
        toast({ title: "Error", description: `Error buscando tag asociado: ${tagError.message}`, variant: "destructive" });
    }
    setTagInfo(tagData || null); 

    setIsLoading(false);
  }, [petId, user, navigate]);


  useEffect(() => {
    loadPetAndTag();
  }, [loadPetAndTag]);

  useEffect(() => {
    if (pet && pet.qr_activated && tagInfo?.activated) {
      generatePublicQR();
    }
    if (tagInfo?.code) {
      generateActivationQRImage();
    }
  }, [pet, tagInfo]);

  const generatePublicQR = async () => {
    if(!pet) return;
    try {
      const url = `${window.location.origin}/public/pet/${pet.id}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating public QR:', error);
      toast({ title: "Error", description: "No se pudo generar el QR público.", variant: "destructive" });
    }
  };
  
  const generateActivationQRImage = async () => {
    if (!tagInfo?.code) return;
    try {
      const url = `${window.location.origin}/activate-tag/${tagInfo.code}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 200, 
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      setActivationQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating activation QR image:', error);
      toast({ title: "Error", description: "No se pudo generar la imagen del QR de activación.", variant: "destructive" });
    }
  };


  const downloadActivationQR = async () => {
    if (!tagInfo?.code) {
       toast({ title: "Error", description: "Esta mascota no tiene un código de tag asociado.", variant: "destructive" });
       return;
    }
    try {
      const url = `${window.location.origin}/activate-tag/${tagInfo.code}`;
      const qrDataUrlToDownload = await QRCode.toDataURL(url, {
        width: 300, 
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      
      const link = document.createElement('a');
      link.download = `plakita-activate-${tagInfo.code}.png`;
      link.href = qrDataUrlToDownload;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "QR de Activación Descargado",
        description: `El QR para el tag ${tagInfo.code} ha sido descargado. Escanéalo para activar/modificar.`
      });
    } catch (error) {
      toast({ title: "Error generando QR de activación para descarga", description: error.message, variant: "destructive" });
    }
  };


  const shareProfile = async () => {
    if (!pet) return;
    const url = `${window.location.origin}/public/pet/${pet.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Perfil de ${pet.name}`,
          text: `Información de contacto para ${pet.name}`,
          url: url,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Enlace copiado", description: "El enlace del perfil público ha sido copiado." });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-center">
        <h2 className="text-2xl font-bold mb-4">Mascota no encontrada</h2>
        <Button onClick={() => navigate('/dashboard')}>Volver al Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="text-white hover:bg-white/20 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="gradient-card border-white/20 text-white">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl">{pet.name}</CardTitle>
                    <CardDescription className="text-white/80">
                      {pet.type} {pet.breed && `• ${pet.breed}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {tagInfo?.code && (
                  <div className="flex items-center space-x-2 bg-black/30 p-3 rounded-lg">
                    <Tag className="h-6 w-6 text-purple-300" />
                    <div>
                      <p className="text-xs text-purple-400">Código de Plakita (Tag)</p>
                      <p className="font-mono text-lg text-purple-300">{tagInfo.code}</p>
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-white/90">Dueño:</h3>
                  <p>{pet.owner_name}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white/90">Contacto:</h3>
                  <p>{pet.owner_contact}</p>
                </div>
                {pet.notes && (
                  <div>
                    <h3 className="font-semibold text-white/90">Notas Adicionales:</h3>
                    <p className="text-white/80 whitespace-pre-wrap">{pet.notes}</p>
                  </div>
                )}
                <div className="pt-4 space-y-3">
                   {pet.qr_activated && tagInfo?.activated ? (
                     <p className="text-center p-2 rounded-md bg-green-500/30 text-green-200 text-sm">
                       <QrCode className="h-4 w-4 mr-2 inline" />
                       Plakita Activada y Pública
                     </p>
                   ) : (
                     <p className="text-center p-2 rounded-md bg-yellow-500/30 text-yellow-200 text-sm">
                       <QrCode className="h-4 w-4 mr-2 inline" />
                       Plakita Pendiente de Activación
                     </p>
                   )}
                  <Button
                    onClick={shareProfile}
                    className="w-full bg-white text-purple-600 hover:bg-white/90"
                    disabled={!pet.qr_activated || !tagInfo?.activated}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartir Perfil Público
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="qr-card border-white/20 text-white">
              <CardHeader>
                <CardTitle className="text-2xl">Códigos QR</CardTitle>
                <CardDescription className="text-white/80">
                  Usa estos QRs para tu Plakita.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">QR de Activación / Modificación</h3>
                  <p className="text-sm text-white/80 mb-3">Escanea este QR para activar o modificar los datos de esta Plakita.</p>
                   {tagInfo?.code && activationQrDataUrl ? (
                    <div className="bg-white p-3 rounded-lg inline-block shadow-lg">
                       <img  
                        alt={`QR de activación para ${tagInfo.code}`} 
                        className="w-40 h-40 mx-auto" 
                        src={activationQrDataUrl} />
                    </div>
                  ) : (
                    <p className="text-sm text-amber-300">No hay tag asociado o error al generar QR de activación.</p>
                  )}
                  <Button
                    onClick={downloadActivationQR}
                    className="w-full mt-3 bg-white text-blue-600 hover:bg-white/90"
                    disabled={!tagInfo?.code}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar QR de Activación
                  </Button>
                </div>
                <hr className="border-white/20"/>
                <div>
                   <h3 className="text-lg font-semibold mb-2">QR del Perfil Público</h3>
                   <p className="text-sm text-white/80 mb-3">Este es el QR que redirige al perfil público si la Plakita está activada.</p>
                  {pet.qr_activated && tagInfo?.activated && qrDataUrl ? (
                    <div className="bg-white p-3 rounded-lg inline-block shadow-lg">
                      <img src={qrDataUrl} alt={`QR Público para ${pet.name}`} className="w-40 h-40 mx-auto" />
                    </div>
                  ) : (
                    <p className="text-sm text-amber-300">La Plakita no está activada o no se pudo generar el QR público.</p>
                  )}
                   <Link to={`/public/pet/${pet.id}`} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      className="w-full mt-3 border-white text-white hover:bg-white/20"
                      disabled={!pet.qr_activated || !tagInfo?.activated}
                    >
                      Ver Perfil Público
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PetProfile;
