import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Download, QrCode, Tag } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from '@/components/ui/use-toast';

const PetCard = ({ pet, index, onEdit, onDelete }) => {

  const downloadActivationQR = async (petToDownload) => {
    if (!petToDownload.tags || !petToDownload.tags.code) {
      toast({ title: "Error", description: "Esta mascota no tiene un código de tag asociado.", variant: "destructive" });
      return;
    }
    try {
      const url = `${window.location.origin}/activate-tag/${petToDownload.tags.code}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      
      const link = document.createElement('a');
      link.download = `plakita-activate-${petToDownload.tags.code}.png`;
      link.href = qrDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "QR de Activación Descargado",
        description: `El QR para activar el tag ${petToDownload.tags.code} ha sido descargado.`
      });
    } catch (error) {
      toast({ title: "Error generando QR", description: error.message, variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Card className="pet-card border-white/20 text-white overflow-hidden h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <Link to={`/pet/${pet.id}`} className="hover:text-cyan-300 transition-colors text-xl font-bold">
              {pet.name}
            </Link>
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(pet)}
                className="text-white hover:bg-white/20 p-1"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(pet)}
                className="text-white hover:bg-red-500/50 hover:text-red-300 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription className="text-white/80">
            {pet.type} {pet.breed && `• ${pet.breed}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between">
          <div className="space-y-3">
            {pet.tags && (
              <div className="flex items-center space-x-2 bg-black/20 p-2 rounded-md">
                <Tag className="h-5 w-5 text-cyan-300" />
                <span className="font-mono text-sm text-cyan-300">{pet.tags.code}</span>
              </div>
            )}
            <div>
              <p className="text-sm text-white/80">Dueño:</p>
              <p className="font-medium">{pet.owner_name}</p>
            </div>
            <div>
              <p className="text-sm text-white/80">Contacto:</p>
              <p className="font-medium">{pet.owner_contact}</p>
            </div>
          </div>
          
          <div className="pt-4 mt-auto space-y-2">
            {pet.qr_activated && pet.tags?.activated ? (
              <div className="text-center p-2 rounded-md bg-green-500/20 text-green-300 text-sm">
                <QrCode className="h-4 w-4 mr-2 inline" />
                Plakita Activada
              </div>
            ) : (
              <div className="text-center p-2 rounded-md bg-yellow-500/20 text-yellow-300 text-sm">
                <QrCode className="h-4 w-4 mr-2 inline" />
                Plakita Pendiente de Activación
              </div>
            )}
            <Button
              onClick={() => downloadActivationQR(pet)}
              className="w-full bg-white text-sky-600 hover:bg-white/90"
              disabled={!pet.tags || !pet.tags.code}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar QR de Activación
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PetCard;