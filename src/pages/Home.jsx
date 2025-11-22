import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, QrCode, Shield, Smartphone, Tag, CheckCircle, ShoppingCart, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Home = () => {
  const scrollToPricing = (e) => {
    e.preventDefault();
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-6">
              Plakita
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
              Sistema de identificación de mascotas con tecnología QR y NFC.
              Protege a tu mejor amigo con la mejor tecnología disponible.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-white text-sky-600 hover:bg-white/90 text-lg px-8 py-4">
                  Registra tu Plakita
                </Button>
              </Link>
              <Link to="/demo">
                <Button
                  size="lg"
                  variant="outline"
                  className="!bg-transparent border-white text-white hover:bg-white hover:text-sky-600 text-lg px-8 py-4 transition-all"
                >
                  Ver Demo
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white hover:text-sky-600 text-lg px-8 py-4 transition-all"
                onClick={scrollToPricing}
              >
                Ver Precios
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="floating-animation"
          >
            <img
              className="mx-auto rounded-2xl shadow-2xl max-w-4xl w-full"
              alt="Perro con Plakita NFC en su collar"
              src="/plakita-ejemplo.webp" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              ¿Por qué elegir Plakita?
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              La forma más moderna y segura de proteger a tu mascota
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: QrCode,
                title: "QR + NFC",
                description: "Cada Plakita incluye código QR y chip NFC para identificación instantánea de tu mascota."
              },
              {
                icon: Wifi,
                title: "Tecnología Contactless",
                description: "Solo acerca tu teléfono a la Plakita y accede inmediatamente a la información de contacto."
              },
              {
                icon: Shield,
                title: "Datos Seguros",
                description: "Tú controlas la información pública. Tus datos personales están protegidos."
              },
              {
                icon: Heart,
                title: "Tranquilidad para Ti",
                description: "Aumenta las posibilidades de recuperar a tu mascota perdida de forma rápida y segura."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="gradient-card rounded-2xl p-6 text-center flex flex-col items-center"
              >
                <feature.icon className="h-12 w-12 text-white mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-white/80">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <Tag className="h-16 w-16 text-white mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Consigue tu Plakita
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Una inversión única para la seguridad y tranquilidad de tu compañero peludo.
            </p>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid md:grid-cols-3 gap-6 mb-12"
          >
            <div className="gradient-card rounded-xl p-6 text-center">
              <QrCode className="h-12 w-12 text-white mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Código QR</h3>
              <p className="text-white/80">Escaneo rápido con cualquier teléfono</p>
            </div>
            <div className="gradient-card rounded-xl p-6 text-center">
              <Wifi className="h-12 w-12 text-white mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Tecnología NFC</h3>
              <p className="text-white/80">Solo acerca tu teléfono, sin apps</p>
            </div>
            <div className="gradient-card rounded-xl p-6 text-center">
              <Shield className="h-12 w-12 text-white mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">100% Seguro</h3>
              <p className="text-white/80">Tus datos protegidos siempre</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="gradient-card rounded-3xl p-8 md:p-12 shadow-2xl"
          >
            <h3 className="text-5xl font-bold text-white mb-4">
              $10 USD
            </h3>
            <p className="text-xl text-white/80 mb-6">Pago Único / Por Plakita</p>
            
            <ul className="space-y-3 text-left mb-8 max-w-md mx-auto">
              {[
                "Placa física duradera con QR y chip NFC.",
                "Doble tecnología: escaneo visual o contactless.",
                "Perfil online personalizable para tu mascota.",
                "Activación y gestión fácil desde la app.",
                "Notificaciones si alguien escanea (próximamente).",
                "Soporte prioritario."
              ].map((benefit, index) => (
                <li key={index} className="flex items-center text-white">
                  <CheckCircle className="h-6 w-6 text-green-400 mr-3 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>

            <p className="text-lg text-white/90 mb-4">
              <strong>¿Dónde adquirirla?</strong>
            </p>
            <p className="text-md text-white/80 mb-8">
              Busca Plakita en tu veterinaria de confianza o tienda de mascotas participante.
              ¡Próximamente venta online directa!
            </p>
            
            <Link to="/register">
              <Button size="lg" className="bg-white text-sky-600 hover:bg-white/90 text-lg px-10 py-4 w-full sm:w-auto pulse-glow">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Ya tengo mi Plakita, ¡Activar!
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>


      {/* How it Works Section */}
      <section className="py-20 px-4 bg-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              ¿Cómo funciona?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Adquiere tu Plakita",
                description: "Consigue una Plakita en puntos de venta autorizados."
              },
              {
                step: "2",
                title: "Escanea y Registra",
                description: "Escanea el QR o acerca tu teléfono (NFC) y completa el perfil de tu mascota en minutos."
              },
              {
                step: "3",
                title: "¡Protección Activada!",
                description: "Tu mascota ahora cuenta con identificación inteligente. Si se pierde, quien la encuentre te contactará fácilmente."
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-white text-sky-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  {step.step}
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">
                  {step.title}
                </h3>
                <p className="text-white/80 text-lg">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              La tranquilidad no tiene precio, pero Plakita sí.
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Únete a la comunidad de dueños responsables que eligen la mejor protección.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/demo">
                <Button
                  size="lg"
                  className="bg-white text-sky-600 hover:bg-white/90 text-lg px-8 py-4 pulse-glow"
                >
                  Ver Demo del Perfil
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white hover:text-sky-600 text-lg px-8 py-4 transition-all"
                onClick={scrollToPricing}
              >
                Ver Planes y Beneficios
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;