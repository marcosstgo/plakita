import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Wifi, Smartphone, CheckCircle, AlertCircle, QrCode, ArrowRight, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const NFCGuide = () => {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="mx-auto bg-white/20 p-4 rounded-full inline-block mb-6">
            <Wifi className="h-12 w-12 text-white animate-pulse" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Cómo Usar tu Plakita con NFC
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Guía completa para activar y usar tu Plakita con tecnología contactless
          </p>
        </motion.div>

        {/* What is NFC Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Card className="gradient-card border-white/20 text-white">
            <CardHeader>
              <CardTitle className="text-3xl font-bold flex items-center">
                <Wifi className="h-8 w-8 mr-3 text-cyan-300" />
                ¿Qué es NFC?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-white/90 text-lg leading-relaxed">
                NFC (Near Field Communication) es una tecnología que permite la comunicación
                inalámbrica entre dispositivos a corta distancia. Es la misma tecnología que
                usas para pagos móviles como Apple Pay o Google Pay.
              </p>
              <div className="bg-white/10 p-4 rounded-lg">
                <p className="text-white/90">
                  <strong className="text-cyan-300">Ventaja principal:</strong> Solo necesitas
                  <strong> acercar tu teléfono</strong> a la Plakita y automáticamente se abre
                  el perfil de tu mascota. No necesitas abrir la cámara ni escanear nada.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Compatibility Check */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <Card className="gradient-card border-white/20 text-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center">
                <Smartphone className="h-7 w-7 mr-3 text-cyan-300" />
                ¿Mi teléfono es compatible?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* iPhone */}
                <div className="bg-white/10 p-5 rounded-lg border border-white/20">
                  <h3 className="text-xl font-semibold mb-3 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                    iPhone (iOS)
                  </h3>
                  <ul className="space-y-2 text-white/90">
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span>iPhone 7 o superior</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span>iOS 11 o superior</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span>Safari o Chrome</span>
                    </li>
                  </ul>
                  <div className="mt-4 p-3 bg-blue-500/20 rounded border border-blue-400/30">
                    <p className="text-sm text-blue-200">
                      <strong>Nota:</strong> En iPhone, NFC funciona automáticamente.
                      No necesitas apps adicionales.
                    </p>
                  </div>
                </div>

                {/* Android */}
                <div className="bg-white/10 p-5 rounded-lg border border-white/20">
                  <h3 className="text-xl font-semibold mb-3 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                    Android
                  </h3>
                  <ul className="space-y-2 text-white/90">
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span>Android 4.4 o superior</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span>Chip NFC (mayoría de modelos)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span>Chrome o navegador moderno</span>
                    </li>
                  </ul>
                  <div className="mt-4 p-3 bg-blue-500/20 rounded border border-blue-400/30">
                    <p className="text-sm text-blue-200">
                      <strong>Tip:</strong> Verifica que NFC esté activado en
                      Configuración → Conexiones → NFC
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* How to Activate with NFC */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-8"
        >
          <Card className="gradient-card border-white/20 text-white">
            <CardHeader>
              <CardTitle className="text-3xl font-bold flex items-center">
                <Tag className="h-8 w-8 mr-3 text-cyan-300" />
                Cómo Activar tu Plakita con NFC
              </CardTitle>
              <CardDescription className="text-white/80 text-lg">
                Sigue estos pasos simples para registrar tu mascota
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      1
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2 text-white">
                      Ve a la Página de Activación
                    </h3>
                    <p className="text-white/80 mb-3">
                      Abre tu navegador y ve a la página de activación de Plakita.
                      Puedes hacer esto de dos formas:
                    </p>
                    <div className="bg-white/10 p-3 rounded-lg space-y-2">
                      <p className="text-white/90">
                        <strong>Opción A:</strong> Ir directamente a la sección "Activar Plakita"
                        desde el menú del sitio web.
                      </p>
                      <p className="text-white/90">
                        <strong>Opción B:</strong> Escanear el código QR de tu Plakita una vez.
                      </p>
                    </div>
                    <Link to="/activate-tag">
                      <Button className="mt-3 bg-cyan-600 hover:bg-cyan-700">
                        Ir a Activar Plakita
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="border-l-2 border-white/20 ml-6 h-8"></div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      2
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2 text-white">
                      Acerca tu Plakita al Teléfono
                    </h3>
                    <p className="text-white/80 mb-3">
                      Una vez en la página de activación, verás un indicador que dice
                      "Escaneo NFC activo". Simplemente acerca tu Plakita a la parte
                      trasera de tu teléfono.
                    </p>
                    <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-400/30">
                      <div className="flex items-start gap-3">
                        <Smartphone className="h-6 w-6 text-blue-300 flex-shrink-0 mt-1" />
                        <div>
                          <p className="text-blue-200 font-semibold mb-1">
                            Ubicación del chip NFC:
                          </p>
                          <p className="text-blue-100 text-sm">
                            En la mayoría de teléfonos, el chip NFC está en la parte
                            trasera central o superior del dispositivo. No necesitas
                            quitar la funda del teléfono.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-l-2 border-white/20 ml-6 h-8"></div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      3
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2 text-white">
                      ¡Código Detectado Automáticamente!
                    </h3>
                    <p className="text-white/80 mb-3">
                      Verás una notificación que dice "¡Tag NFC detectado!" y el código
                      de tu Plakita se completará automáticamente en el formulario.
                    </p>
                    <div className="bg-green-500/20 p-3 rounded-lg border border-green-400/30">
                      <p className="text-green-200 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        El código se detecta en menos de 1 segundo
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-l-2 border-white/20 ml-6 h-8"></div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      4
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2 text-white">
                      Completa el Registro de tu Mascota
                    </h3>
                    <p className="text-white/80 mb-3">
                      Ahora solo necesitas:
                    </p>
                    <ul className="space-y-2 text-white/90">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Crear tu cuenta o iniciar sesión</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Ingresar los datos de tu mascota (nombre, foto, etc.)</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Agregar tu información de contacto</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="border-l-2 border-white/20 ml-6 h-8"></div>

                {/* Step 5 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      ✓
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2 text-white">
                      ¡Listo! Tu Mascota Está Protegida
                    </h3>
                    <p className="text-white/80 mb-3">
                      Tu Plakita está activada. Ahora, cualquier persona que acerque su
                      teléfono a la placa verá instantáneamente el perfil de tu mascota
                      y podrá contactarte.
                    </p>
                    <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 p-4 rounded-lg border border-green-400/30">
                      <p className="text-white font-semibold">
                        🎉 ¡Felicidades! Tu mejor amigo ahora tiene protección inteligente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Troubleshooting */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-8"
        >
          <Card className="gradient-card border-white/20 text-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center">
                <AlertCircle className="h-7 w-7 mr-3 text-yellow-400" />
                ¿No funciona el NFC?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-white/90 text-lg">
                  Si tienes problemas para usar NFC, prueba estas soluciones:
                </p>

                <div className="space-y-3">
                  <div className="bg-white/10 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <span className="text-yellow-400 mr-2">1.</span>
                      Verifica que NFC esté activado
                    </h4>
                    <p className="text-white/80 text-sm">
                      <strong>iPhone:</strong> NFC está siempre activo, no requiere configuración.<br />
                      <strong>Android:</strong> Ve a Configuración → Conexiones → NFC y actívalo.
                    </p>
                  </div>

                  <div className="bg-white/10 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <span className="text-yellow-400 mr-2">2.</span>
                      Acerca correctamente la Plakita
                    </h4>
                    <p className="text-white/80 text-sm">
                      El chip NFC está en el centro de la Plakita. Acércala a la parte
                      trasera de tu teléfono y mantenla ahí por 2-3 segundos.
                    </p>
                  </div>

                  <div className="bg-white/10 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <span className="text-yellow-400 mr-2">3.</span>
                      Usa el código QR como alternativa
                    </h4>
                    <p className="text-white/80 text-sm">
                      Si tu teléfono no tiene NFC o no funciona, siempre puedes escanear
                      el código QR de tu Plakita con la cámara. ¡Funciona exactamente igual!
                    </p>
                  </div>

                  <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-400/30">
                    <h4 className="font-semibold text-blue-200 mb-2 flex items-center">
                      <QrCode className="h-5 w-5 mr-2" />
                      Siempre tienes el QR disponible
                    </h4>
                    <p className="text-blue-100 text-sm">
                      Todas las Plakitas tienen QR y NFC. Si uno no funciona, usa el otro.
                      Ambos te llevan al mismo lugar.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center"
        >
          <Card className="gradient-card border-white/20 text-white">
            <CardContent className="py-8">
              <h3 className="text-2xl font-bold mb-4 text-white">
                ¿Listo para activar tu Plakita?
              </h3>
              <p className="text-white/80 mb-6 max-w-2xl mx-auto">
                Comienza ahora y protege a tu mascota con la mejor tecnología disponible.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/activate-tag">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    <Wifi className="h-5 w-5 mr-2" />
                    Activar con NFC
                  </Button>
                </Link>
                <Link to="/help">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-sky-600 transition-all"
                  >
                    Ver Más Ayuda
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default NFCGuide;
