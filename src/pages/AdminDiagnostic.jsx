import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, XCircle, AlertTriangle, RefreshCw, User, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { verifyAdminUser, syncAdminUser } from '@/utils/adminVerification';
import { supabase } from '@/lib/supabaseClient';

const AdminDiagnostic = () => {
  const { user } = useAuth();
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (user) {
      runDiagnostic();
    }
  }, [user]);

  const runDiagnostic = async () => {
    setIsLoading(true);
    try {
      const result = await verifyAdminUser();
      setDiagnosticResult(result);
      
      if (result.success) {
        toast({
          title: "Diagnóstico completado",
          description: "Revisa los resultados abajo"
        });
      } else {
        toast({
          title: "Error en diagnóstico",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error inesperado",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncAdminUser();
      
      if (result.success) {
        toast({
          title: "Sincronización exitosa",
          description: "Usuario sincronizado en public.users"
        });
        // Volver a ejecutar diagnóstico
        await runDiagnostic();
      } else {
        toast({
          title: "Error en sincronización",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error inesperado",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const StatusIcon = ({ status }) => {
    if (status === 'success') return <CheckCircle className="h-5 w-5 text-green-400" />;
    if (status === 'warning') return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
    return <XCircle className="h-5 w-5 text-red-400" />;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p>Debes estar autenticado para ver esta página</p>
      </div>
    );
  }

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
            Diagnóstico de Usuario Admin
          </h1>
          <p className="text-white/80 text-lg">
            Verificación del estado del usuario administrador y sincronización de datos.
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Información del usuario actual */}
          <Card className="gradient-card border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-6 w-6 mr-2 text-purple-300" />
                Usuario Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/70">Email:</p>
                  <p className="font-semibold">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">ID:</p>
                  <p className="font-mono text-sm break-all">{user.id}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Fecha de creación:</p>
                  <p className="text-sm">{new Date(user.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Nombre completo:</p>
                  <p className="text-sm">{user.user_metadata?.full_name || 'No especificado'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controles */}
          <div className="flex gap-4">
            <Button
              onClick={runDiagnostic}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Ejecutar Diagnóstico
            </Button>

            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSyncing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Sincronizar Usuario
            </Button>
          </div>

          {/* Resultados del diagnóstico */}
          {diagnosticResult && (
            <Card className="gradient-card border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-6 w-6 mr-2 text-purple-300" />
                  Resultados del Diagnóstico
                </CardTitle>
                <CardDescription className="text-white/70">
                  Estado actual del usuario administrador
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {diagnosticResult.success ? (
                  <>
                    {/* Estado de admin */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-purple-300">Estado de Administrador</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <StatusIcon status={diagnosticResult.adminStatus.isAdminByEmail ? 'success' : 'error'} />
                          <span>Admin por email: {diagnosticResult.adminStatus.isAdminByEmail ? 'Sí' : 'No'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusIcon status={diagnosticResult.adminStatus.isAdminById ? 'success' : 'warning'} />
                          <span>Admin por ID: {diagnosticResult.adminStatus.isAdminById ? 'Sí' : 'No'}</span>
                        </div>
                      </div>
                      
                      {!diagnosticResult.adminStatus.idMatches && (
                        <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                          <p className="text-yellow-300 text-sm">
                            <strong>ID no coincide:</strong><br />
                            Esperado: {diagnosticResult.adminStatus.expectedAdminId}<br />
                            Actual: {diagnosticResult.adminStatus.actualId}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Estado en public.users */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-purple-300">Estado en public.users</h3>
                      <div className="flex items-center space-x-2">
                        <StatusIcon status={diagnosticResult.publicUser ? 'success' : 'error'} />
                        <span>Usuario en public.users: {diagnosticResult.publicUser ? 'Sí' : 'No'}</span>
                      </div>
                      
                      {diagnosticResult.publicUser && (
                        <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                          <p className="text-green-300 text-sm">
                            <strong>Datos en public.users:</strong><br />
                            Email: {diagnosticResult.publicUser.email}<br />
                            Nombre: {diagnosticResult.publicUser.full_name || 'No especificado'}<br />
                            Creado: {new Date(diagnosticResult.publicUser.created_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Recomendaciones */}
                    {diagnosticResult.recommendations.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-purple-300">Recomendaciones</h3>
                        <div className="space-y-2">
                          {diagnosticResult.recommendations.map((rec, index) => (
                            <div 
                              key={index}
                              className={`p-3 rounded-lg border ${
                                rec.type === 'success' ? 'bg-green-500/20 border-green-500/50' :
                                rec.type === 'warning' ? 'bg-yellow-500/20 border-yellow-500/50' :
                                'bg-red-500/20 border-red-500/50'
                              }`}
                            >
                              <div className="flex items-start space-x-2">
                                <StatusIcon status={rec.type} />
                                <p className={`text-sm ${
                                  rec.type === 'success' ? 'text-green-300' :
                                  rec.type === 'warning' ? 'text-yellow-300' :
                                  'text-red-300'
                                }`}>
                                  {rec.message}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-300">
                      Error en el diagnóstico: {diagnosticResult.error}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDiagnostic;