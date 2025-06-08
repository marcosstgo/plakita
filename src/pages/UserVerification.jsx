import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, User, Shield, Tag, Heart, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { adminVerifyUser } from '@/utils/verifyUserPermissions';

const UserVerification = () => {
  const [email, setEmail] = useState('santiago.marcos@gmail.com');
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState(null);

  const handleVerifyUser = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Error", description: "Ingresa un email válido", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setError(null);
    setUserInfo(null);

    try {
      const result = await adminVerifyUser(email.trim());
      
      if (result.error) {
        setError(result.error);
        toast({ 
          title: "Error en verificación", 
          description: result.error, 
          variant: "destructive" 
        });
      } else {
        setUserInfo(result);
        toast({ 
          title: "Usuario verificado", 
          description: `Información cargada para ${email}` 
        });
      }
    } catch (error) {
      setError(error.message);
      toast({ 
        title: "Error inesperado", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const StatusIcon = ({ condition, trueIcon: TrueIcon, falseIcon: FalseIcon }) => {
    return condition ? (
      <TrueIcon className="h-5 w-5 text-green-400" />
    ) : (
      <FalseIcon className="h-5 w-5 text-red-400" />
    );
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
            <Shield className="h-10 w-10 mr-3 text-purple-300" />
            Verificación de Usuario
          </h1>
          <p className="text-white/80 text-lg">
            Verifica permisos y estado de cualquier usuario en el sistema.
          </p>
        </motion.div>

        {/* Formulario de búsqueda */}
        <Card className="gradient-card border-white/20 text-white mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-6 w-6 mr-2 text-purple-300" />
              Buscar Usuario
            </CardTitle>
            <CardDescription className="text-white/70">
              Ingresa el email del usuario para verificar sus permisos y datos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyUser} className="flex gap-4">
              <Input
                type="email"
                placeholder="usuario@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                required
              />
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Verificar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="error-state border-red-500/50 text-white mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 text-red-400 mr-3" />
                <div>
                  <h3 className="font-semibold text-red-300">Error de Verificación</h3>
                  <p className="text-red-200">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información del usuario */}
        {userInfo && userInfo.found && (
          <div className="space-y-6">
            {/* Información básica */}
            <Card className="gradient-card border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-6 w-6 mr-2 text-purple-300" />
                  Información del Usuario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-white/70">Email:</p>
                    <p className="font-semibold">{userInfo.user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">Nombre completo:</p>
                    <p className="font-semibold">{userInfo.user.full_name || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">ID de usuario:</p>
                    <p className="font-mono text-sm">{userInfo.user.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">Fecha de registro:</p>
                    <p className="text-sm">{new Date(userInfo.user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Estado de admin */}
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-black/20">
                  <StatusIcon 
                    condition={userInfo.isAdmin} 
                    trueIcon={Shield} 
                    falseIcon={User} 
                  />
                  <span className={userInfo.isAdmin ? 'text-green-300 font-semibold' : 'text-white/80'}>
                    {userInfo.isAdmin ? 'Administrador' : 'Usuario Regular'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Estadísticas */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="gradient-card border-white/20 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{userInfo.stats.totalTags}</p>
                      <p className="text-sm text-white/70">Tags Totales</p>
                    </div>
                    <Tag className="h-8 w-8 text-purple-300" />
                  </div>
                </CardContent>
              </Card>

              <Card className="gradient-card border-white/20 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{userInfo.stats.activatedTags}</p>
                      <p className="text-sm text-white/70">Tags Activados</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="gradient-card border-white/20 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{userInfo.stats.totalPets}</p>
                      <p className="text-sm text-white/70">Mascotas</p>
                    </div>
                    <Heart className="h-8 w-8 text-pink-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="gradient-card border-white/20 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{userInfo.stats.activatedPets}</p>
                      <p className="text-sm text-white/70">Mascotas Activas</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Permisos */}
            <Card className="gradient-card border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-6 w-6 mr-2 text-purple-300" />
                  Permisos del Usuario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(userInfo.permissions).map(([permission, hasPermission]) => (
                    <div key={permission} className="flex items-center space-x-3">
                      <StatusIcon 
                        condition={hasPermission} 
                        trueIcon={CheckCircle} 
                        falseIcon={XCircle} 
                      />
                      <span className={hasPermission ? 'text-green-300' : 'text-red-300'}>
                        {permission.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tags del usuario */}
            {userInfo.tags.length > 0 && (
              <Card className="gradient-card border-white/20 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Tag className="h-6 w-6 mr-2 text-purple-300" />
                    Tags del Usuario ({userInfo.tags.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userInfo.tags.map((tag) => (
                      <div key={tag.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                        <div>
                          <p className="font-mono font-semibold">{tag.code}</p>
                          <p className="text-sm text-white/70">
                            {tag.pets ? `Vinculado a: ${tag.pets.name} (${tag.pets.type})` : 'Sin mascota vinculada'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusIcon 
                            condition={tag.activated} 
                            trueIcon={CheckCircle} 
                            falseIcon={XCircle} 
                          />
                          <span className={tag.activated ? 'text-green-300' : 'text-yellow-300'}>
                            {tag.activated ? 'Activado' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mascotas del usuario */}
            {userInfo.pets.length > 0 && (
              <Card className="gradient-card border-white/20 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Heart className="h-6 w-6 mr-2 text-pink-400" />
                    Mascotas del Usuario ({userInfo.pets.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {userInfo.pets.map((pet) => (
                      <div key={pet.id} className="p-4 bg-black/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-lg">{pet.name}</h4>
                          <StatusIcon 
                            condition={pet.qr_activated} 
                            trueIcon={CheckCircle} 
                            falseIcon={XCircle} 
                          />
                        </div>
                        <p className="text-white/70 text-sm">{pet.type} {pet.breed && `• ${pet.breed}`}</p>
                        <p className="text-white/70 text-sm">Dueño: {pet.owner_name}</p>
                        <p className="text-white/70 text-sm">Contacto: {pet.owner_contact}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserVerification;