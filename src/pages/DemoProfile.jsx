import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Phone, Mail, AlertCircle, MapPin, Calendar, Award, Shield, Eye, QrCode, Wifi, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DemoProfile = () => {
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Datos de demostración
  const demoPet = {
    name: "Max",
    type: "Perro",
    breed: "Golden Retriever",
    age: "3 años",
    color: "Dorado",
    notes: "Max es muy amigable con personas y otros perros. Le encanta jugar con pelotas y nadar. Si lo encuentras, por favor contáctame de inmediato.",
    imageUrl: "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800",
    ownerName: "María González",
    ownerPhone: "+1 (787) 555-1234",
    ownerEmail: "maria.gonzalez@email.com",
    location: "San Juan, Puerto Rico",
    activatedDate: "15 de Enero, 2024"
  };

  const handleContactClick = () => {
    setShowContactInfo(true);
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Demo Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Eye className="h-6 w-6 text-blue-300" />
                  <div>
                    <p className="text-white font-semibold">Vista Previa - Perfil de Demostración</p>
                    <p className="text-white/70 text-sm">Así es como se verá el perfil de tu mascota</p>
                  </div>
                </div>
                <Link to="/">
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/20">
                    Volver al Inicio
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pet Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="gradient-card border-white/20 overflow-hidden">
            {/* Header with Pet Image */}
            <div className="relative h-64 md:h-80 overflow-hidden">
              <img
                src={demoPet.imageUrl}
                alt={demoPet.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              {/* Pet Name Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Heart className="h-8 w-8 text-red-400 animate-pulse" />
                  <h1 className="text-4xl md:text-5xl font-bold text-white">
                    {demoPet.name}
                  </h1>
                </div>
                <p className="text-xl text-white/90">
                  {demoPet.type} • {demoPet.breed}
                </p>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Alert - Pet Lost Status */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="bg-amber-500/20 border border-amber-400/50 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-amber-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-1">
                      ¿Encontraste a {demoPet.name}?
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
                  Información de {demoPet.name}
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                    <p className="text-white/70 text-sm mb-1">Edad</p>
                    <p className="text-white text-lg font-semibold">{demoPet.age}</p>
                  </div>

                  <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                    <p className="text-white/70 text-sm mb-1">Color</p>
                    <p className="text-white text-lg font-semibold">{demoPet.color}</p>
                  </div>

                  <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                    <p className="text-white/70 text-sm mb-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Ubicación
                    </p>
                    <p className="text-white text-lg font-semibold">{demoPet.location}</p>
                  </div>

                  <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                    <p className="text-white/70 text-sm mb-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Plakita Activada
                    </p>
                    <p className="text-white text-lg font-semibold">{demoPet.activatedDate}</p>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-cyan-300" />
                    Notas Importantes
                  </h3>
                  <p className="text-white/90 leading-relaxed">
                    {demoPet.notes}
                  </p>
                </div>
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
                      <p className="text-white text-lg font-semibold">{demoPet.ownerName}</p>
                    </div>

                    <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <p className="text-white/70 text-sm mb-2 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Teléfono
                      </p>
                      <a
                        href={`tel:${demoPet.ownerPhone}`}
                        className="text-cyan-300 text-lg font-semibold hover:text-cyan-200 transition-colors"
                      >
                        {demoPet.ownerPhone}
                      </a>
                      <Button
                        onClick={() => window.location.href = `tel:${demoPet.ownerPhone}`}
                        className="mt-3 w-full bg-green-600 hover:bg-green-700"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Llamar Ahora
                      </Button>
                    </div>

                    <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <p className="text-white/70 text-sm mb-2 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </p>
                      <a
                        href={`mailto:${demoPet.ownerEmail}`}
                        className="text-cyan-300 text-lg font-semibold hover:text-cyan-200 transition-colors break-all"
                      >
                        {demoPet.ownerEmail}
                      </a>
                      <Button
                        onClick={() => window.location.href = `mailto:${demoPet.ownerEmail}`}
                        className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar Email
                      </Button>
                    </div>

                    <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4">
                      <p className="text-green-200 text-sm text-center">
                        ✓ Información de contacto verificada y protegida por Plakita
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* How It Works - CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8"
        >
          <Card className="gradient-card border-white/20">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-white mb-2">
                ¿Te gusta lo que ves?
              </CardTitle>
              <CardDescription className="text-white/80 text-lg">
                Así se verá el perfil de tu mascota cuando actives tu Plakita
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-lg p-4 border border-white/20 text-center">
                  <QrCode className="h-8 w-8 text-cyan-300 mx-auto mb-3" />
                  <h3 className="text-white font-semibold mb-2">Código QR</h3>
                  <p className="text-white/70 text-sm">
                    Escaneo rápido con cualquier teléfono
                  </p>
                </div>

                <div className="bg-white/10 rounded-lg p-4 border border-white/20 text-center">
                  <Wifi className="h-8 w-8 text-cyan-300 mx-auto mb-3" />
                  <h3 className="text-white font-semibold mb-2">Tecnología NFC</h3>
                  <p className="text-white/70 text-sm">
                    Solo acerca tu teléfono, sin apps
                  </p>
                </div>

                <div className="bg-white/10 rounded-lg p-4 border border-white/20 text-center">
                  <Shield className="h-8 w-8 text-cyan-300 mx-auto mb-3" />
                  <h3 className="text-white font-semibold mb-2">100% Seguro</h3>
                  <p className="text-white/70 text-sm">
                    Tus datos protegidos siempre
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link to="/register">
                  <Button size="lg" className="bg-white text-sky-600 hover:bg-white/90 w-full sm:w-auto">
                    <Heart className="h-5 w-5 mr-2" />
                    Consigue tu Plakita
                  </Button>
                </Link>
                <Link to="/nfc-guide">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/20 w-full sm:w-auto"
                  >
                    <Wifi className="h-5 w-5 mr-2" />
                    Cómo Funciona NFC
                  </Button>
                </Link>
                <Link to="/help">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/20 w-full sm:w-auto"
                  >
                    Ver Preguntas Frecuentes
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
              </div>

              {/* Additional Info */}
              <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 text-center">
                <p className="text-white/90">
                  <strong className="text-cyan-300">$10 USD</strong> por Plakita • Pago único • Sin suscripciones
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DemoProfile;
