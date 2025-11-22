import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, MessageCircle, Phone, Mail, ChevronDown, ChevronUp, Tag, Heart, Shield, Users, Wifi } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const Help = () => {
  const [openFAQ, setOpenFAQ] = useState(null);

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent("Hola, necesito ayuda con mi Plakita. ¿Pueden asistirme?");
    window.open(`https://wa.me/17872439670?text=${message}`, '_blank');
  };

  const faqData = [
    {
      question: "¿Qué es una Plakita?",
      answer: "Plakita es una placa inteligente con código QR y chip NFC que se coloca en el collar de tu mascota. Con solo escanear el QR o acercar tu teléfono (NFC), cualquier persona puede ver el perfil de tu mascota y contactarte en caso de que se pierda.",
      icon: Tag
    },
    {
      question: "¿Qué diferencia hay entre QR y NFC?",
      answer: "El código QR requiere que abras la cámara y apuntes a la placa. Con NFC (Near Field Communication), solo acercas tu teléfono a la Plakita y automáticamente se abre el perfil - sin necesidad de abrir apps. Ambas tecnologías funcionan igual de bien, NFC es simplemente más rápido.",
      icon: Wifi
    },
    {
      question: "¿Cómo activo mi Plakita?",
      answer: "Escanea el código QR de tu Plakita o acerca tu teléfono si tiene NFC. Si aún no está activada, verás un formulario para registrarte. Solo tienes que crear tu cuenta, ingresar el código de activación que viene con la placa, y completar el perfil de tu mascota.",
      icon: HelpCircle
    },
    {
      question: "¿Dónde encuentro el código de activación?",
      answer: "El código de activación está impreso en el empaque o tarjeta que recibiste con tu Plakita. Es un código alfanumérico (por ejemplo: PKL001002) que necesitas para enlazar la placa con tu cuenta.",
      icon: Tag
    },
    {
      question: "¿Qué hago si perdí el código de activación?",
      answer: "Escríbenos por WhatsApp al 1-787-243-9670 con una foto clara de tu Plakita (mostrando el QR). Verificaremos el estado de la placa y te ayudaremos a recuperarlo.",
      icon: MessageCircle
    },
    {
      question: "¿Qué pasa si pierdo la Plakita?",
      answer: "Si pierdes la placa, comunícate con nosotros lo antes posible para desactivar el perfil asociado. Puedes solicitar una nueva Plakita y reactivarla con tu misma cuenta.",
      icon: Shield
    },
    {
      question: "¿Puedo editar la información de mi mascota después de activarla?",
      answer: "Sí. Una vez activada, puedes iniciar sesión en tu cuenta y actualizar los datos de tu mascota en cualquier momento.",
      icon: HelpCircle
    },
    {
      question: "¿La información de mi mascota es pública?",
      answer: "Solo el perfil básico que ayuda a identificar a tu mascota (nombre, foto, y datos de contacto) es visible para quien escanee el QR o use NFC. No mostramos información sensible ni direcciones exactas.",
      icon: Shield
    },
    {
      question: "¿Puedo usar la misma cuenta para varias Plakitas?",
      answer: "¡Claro! Puedes añadir múltiples mascotas a tu cuenta y asociar cada una a una Plakita diferente.",
      icon: Users
    },
    {
      question: "¿Cómo contacto al equipo de Plakita para soporte o preguntas?",
      answer: "Puedes escribirnos directamente por WhatsApp al 1-787-243-9670, o utilizar el formulario de contacto en nuestro sitio web.",
      icon: Phone
    }
  ];

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
            <HelpCircle className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Centro de Ayuda
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Encuentra respuestas a las preguntas más frecuentes sobre Plakita y cómo proteger a tu mascota.
          </p>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12"
        >
          <Card className="gradient-card border-white/20 text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold flex items-center justify-center">
                <Heart className="h-8 w-8 mr-3 text-cyan-300" />
                Preguntas Frecuentes (FAQ)
              </CardTitle>
              <CardDescription className="text-white/80 text-lg">
                Todo lo que necesitas saber sobre tu Plakita
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqData.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="border border-white/20 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full p-4 text-left bg-white/5 hover:bg-white/10 transition-colors duration-200 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <faq.icon className="h-5 w-5 text-cyan-300 mr-3 flex-shrink-0" />
                      <span className="font-semibold text-white">{faq.question}</span>
                    </div>
                    {openFAQ === index ? (
                      <ChevronUp className="h-5 w-5 text-white/70" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-white/70" />
                    )}
                  </button>
                  {openFAQ === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="p-4 bg-white/10 border-t border-white/20"
                    >
                      <p className="text-white/90 leading-relaxed">{faq.answer}</p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* WhatsApp Contact */}
          <Card className="gradient-card border-white/20 text-white">
            <CardHeader className="text-center">
              <div className="mx-auto bg-green-500/20 p-3 rounded-full inline-block mb-4">
                <MessageCircle className="h-8 w-8 text-green-300" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Soporte por WhatsApp
              </CardTitle>
              <CardDescription className="text-white/80">
                Contacto directo para resolver tus dudas
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-white/10 p-4 rounded-lg">
                <p className="text-sm text-white/70 mb-2">Número de WhatsApp:</p>
                <p className="text-2xl font-bold text-green-300">1-787-243-9670</p>
              </div>
              <p className="text-white/80 text-sm">
                Horario de atención: Lunes a Viernes, 9:00 AM - 6:00 PM (AST)
              </p>
              <Button
                onClick={handleWhatsAppContact}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Escribir por WhatsApp
              </Button>
            </CardContent>
          </Card>

          {/* Email Contact */}
          <Card className="gradient-card border-white/20 text-white">
            <CardHeader className="text-center">
              <div className="mx-auto bg-blue-500/20 p-3 rounded-full inline-block mb-4">
                <Mail className="h-8 w-8 text-blue-300" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Contacto por Email
              </CardTitle>
              <CardDescription className="text-white/80">
                Para consultas detalladas y soporte técnico
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-white/10 p-4 rounded-lg">
                <p className="text-sm text-white/70 mb-2">Email de soporte:</p>
                <p className="text-lg font-semibold text-blue-300">soporte@plakita.com</p>
              </div>
              <p className="text-white/80 text-sm">
                Tiempo de respuesta: 24-48 horas hábiles
              </p>
              <Button
                onClick={() => window.location.href = 'mailto:soporte@plakita.com?subject=Consulta sobre Plakita'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
              >
                <Mail className="h-5 w-5 mr-2" />
                Enviar Email
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Additional Help */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <Card className="gradient-card border-white/20 text-white">
            <CardContent className="py-8">
              <Heart className="h-12 w-12 text-cyan-300 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-4">
                ¿No encontraste lo que buscabas?
              </h3>
              <p className="text-white/80 mb-6 max-w-2xl mx-auto">
                Nuestro equipo está aquí para ayudarte. No dudes en contactarnos por WhatsApp 
                para recibir asistencia personalizada con tu Plakita.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  onClick={handleWhatsAppContact}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contactar Soporte
                </Button>
                <Button
                  onClick={() => window.location.href = '/demo'}
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-sky-600 transition-all"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Ver Demo
                </Button>
                <Button
                  onClick={() => window.location.href = '/nfc-guide'}
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-sky-600 transition-all"
                >
                  <Wifi className="h-4 w-4 mr-2" />
                  Guía NFC
                </Button>
                <Button
                  onClick={() => window.location.href = '/activate-plakita'}
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-sky-600 transition-all"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Activar Plakita
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Help;