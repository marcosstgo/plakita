import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, User, Shield, Tag, Heart, CheckCircle, XCircle, AlertTriangle, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { adminVerifyUser, listAllUsers } from '@/utils/verifyUserPermissions';

const UserVerification = () => {
  const [email, setEmail] = useState('santiago.marcos@gmail.com');
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState(null);
  const [allUsers, setAllUsers] = useState(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

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
      
      if (result.error || !result.found) {
        setError(result.error || 'Usuario no encontrado');
        setUserInfo(result); // Incluir sugerencias si las hay
        toast({ 
          title: "Usuario no encontrado", 
          description: result.error || 'El usuario no existe en el sistema', 
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

  const handleLoadAllUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const result = await listAllUsers();
      if (result.error) {
        toast({ 
          title: "Error cargando usuarios", 
          description: result.error, 
          variant: "destructive" 
        });
      } else {
        setAllUsers(result.users);
        toast({ 
          title: "Usuarios cargados", 
          description: `Se encontraron ${result.users.length} usuarios` 
        });
      }
    } catch (error) {
      toast({ 
        title: "Error inesperado", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoadingUsers(false);
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
      <div className="max-w-6xl mx-auto">
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

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Panel izquierdo - Búsqueda individual */}
          <div className="space-y-6">
            {/* Formulario de búsqueda */}
            <Card className="gradient-card border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-6 w-6 mr-2 text-purple-300" />
                  Buscar Usuario Específico
                </CardTitle>
                <CardDescription className="text-white/70">
                  Ingresa el email del usuario para verificar sus permisos y datos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyUser} className="space-y-4">
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
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Verificar Usuario
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Error o sugerencias */}
            {error && userInfo && !userInfo.found && (
              <Card className="error-state border-red-500/50 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-start">
                    <AlertTriangle className="h-6 w-6 text-red-400 mr-3 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-300 mb-2">Usuario No Encontrado</h3>
                      <p className="text-red-200 mb-4">{error}</p>
                      
                      {userInfo.suggestions && (
                        <div className="space-y-3">
                          {userInfo.suggestions.similarEmails?.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-red-300 mb-2">Emails similares encontrados:</p>
                              <div className="space-y-1">
                                {userInfo.suggestions.similarEmails.map((user, index) => (
                                  <button
                                    key={index}
                                    onClick={() => setEmail(user.email)}
                                    className="block text-sm text-red-200 hover:text-white underline"
                                  >
                                    {user.email} {user.full_name && `(${user.full_name})`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <p className="text-sm text-red-200">
                            {userInfo.suggestions.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Información del usuario encontrado */}
            {userInfo && userInfo.found && (
              <div className="space-y-4">
                {/* Información básica */}
                <Card className="gradient-card border-white/20 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-6 w-6 mr-2 text-purple-300" />
                      Información del Usuario
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
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
                        <p className="font-mono text-xs break-all">{userInfo.user.id}</p>
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
                <div className="grid grid-cols-2 gap-3">
                  <Card className="gradient-card border-white/20 text-white">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{userInfo.stats.totalTags}</p>
                        <p className="text-xs text-white/70">Tags Totales</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="gradient-card border-white/20 text-white">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{userInfo.stats.activatedTags}</p>
                        <p className="text-xs text-white/70">Tags Activados</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="gradient-card border-white/20 text-white">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{userInfo.stats.totalPets}</p>
                        <p className="text-xs text-white/70">Mascotas</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="gradient-card border-white/20 text-white">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{userInfo.stats.activatedPets}</p>
                        <p className="text-xs text-white/70">Activas</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tags del usuario */}
                {userInfo.tags.length > 0 && (
                  <Card className="gradient-card border-white/20 text-white">
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Tag className="h-5 w-5 mr-2 text-purple-300" />
                        Tags ({userInfo.tags.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {userInfo.tags.slice(0, 3).map((tag) => (
                          <div key={tag.id} className="flex items-center justify-between p-2 bg-black/20 rounded text-sm">
                            <span className="font-mono">{tag.code}</span>
                            <StatusIcon 
                              condition={tag.activated} 
                              trueIcon={CheckCircle} 
                              falseIcon={XCircle} 
                            />
                          </div>
                        ))}
                        {userInfo.tags.length > 3 && (
                          <p className="text-xs text-white/70 text-center">
                            ... y {userInfo.tags.length - 3} más
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Panel derecho - Lista de todos los usuarios */}
          <div className="space-y-6">
            <Card className="gradient-card border-white/20 text-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Users className="h-6 w-6 mr-2 text-purple-300" />
                    Todos los Usuarios
                  </CardTitle>
                  <Button
                    onClick={handleLoadAllUsers}
                    disabled={isLoadingUsers}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isLoadingUsers ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Cargar
                  </Button>
                </div>
                <CardDescription className="text-white/70">
                  Lista de todos los usuarios registrados en el sistema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allUsers ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    {allUsers.map((user) => (
                      <div 
                        key={user.id} 
                        className="p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors cursor-pointer"
                        onClick={() => setEmail(user.email)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.email}</p>
                            {user.full_name && (
                              <p className="text-sm text-white/70 truncate">{user.full_name}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 ml-2">
                            <div className="text-center">
                              <p className="text-xs font-bold">{user.stats.totalTags}</p>
                              <p className="text-xs text-white/60">Tags</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold">{user.stats.totalPets}</p>
                              <p className="text-xs text-white/60">Pets</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                          Registrado: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/70 text-center py-8">
                    Haz clic en "Cargar" para ver todos los usuarios
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserVerification;