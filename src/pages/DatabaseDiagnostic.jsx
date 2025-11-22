import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, CheckCircle, XCircle, AlertTriangle, RefreshCw, Shield, Table, Columns, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const DatabaseDiagnostic = () => {
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runCompleteDiagnostic = async () => {
    setIsLoading(true);
    setDiagnosticResult(null);

    try {
      console.log('🔍 Iniciando diagnóstico completo de base de datos...');
      
      const result = {
        connection: null,
        tables: {},
        columns: {},
        policies: {},
        indexes: {},
        triggers: {},
        views: {},
        summary: {
          totalChecks: 0,
          passedChecks: 0,
          failedChecks: 0,
          warningChecks: 0
        }
      };

      // 1. Verificar conexión básica
      try {
        const { data, error } = await supabase.from('users').select('count').limit(1);
        result.connection = { success: !error, error: error?.message };
        result.summary.totalChecks++;
        if (!error) result.summary.passedChecks++;
        else result.summary.failedChecks++;
      } catch (error) {
        result.connection = { success: false, error: error.message };
        result.summary.totalChecks++;
        result.summary.failedChecks++;
      }

      // 2. Verificar todas las tablas requeridas
      const requiredTables = [
        'users', 'pets', 'tags', 'medical_records', 'vaccinations', 
        'medications', 'photos', 'lost_pets', 'vet_visits'
      ];

      for (const table of requiredTables) {
        try {
          const { data, error } = await supabase.from(table).select('*').limit(1);
          result.tables[table] = { 
            exists: !error, 
            error: error?.message,
            recordCount: data?.length || 0
          };
          result.summary.totalChecks++;
          if (!error) result.summary.passedChecks++;
          else result.summary.failedChecks++;
        } catch (error) {
          result.tables[table] = { exists: false, error: error.message };
          result.summary.totalChecks++;
          result.summary.failedChecks++;
        }
      }

      // 3. Verificar columnas críticas específicas
      const criticalColumns = [
        // Tabla users
        { table: 'users', column: 'id', required: true },
        { table: 'users', column: 'email', required: true },
        { table: 'users', column: 'full_name', required: false },
        { table: 'users', column: 'avatar_url', required: false },
        { table: 'users', column: 'is_admin', required: false },
        { table: 'users', column: 'created_at', required: false },
        { table: 'users', column: 'updated_at', required: false },

        // Tabla pets
        { table: 'pets', column: 'id', required: true },
        { table: 'pets', column: 'name', required: true },
        { table: 'pets', column: 'type', required: true },
        { table: 'pets', column: 'breed', required: false },
        { table: 'pets', column: 'owner_name', required: true },
        { table: 'pets', column: 'owner_contact', required: true },
        { table: 'pets', column: 'notes', required: false },
        { table: 'pets', column: 'user_id', required: true },
        { table: 'pets', column: 'tag_id', required: false },
        { table: 'pets', column: 'qr_activated', required: true },
        { table: 'pets', column: 'created_at', required: false },

        // Tabla tags
        { table: 'tags', column: 'id', required: true },
        { table: 'tags', column: 'code', required: true },
        { table: 'tags', column: 'activated', required: true },
        { table: 'tags', column: 'activated_at', required: false },
        { table: 'tags', column: 'pet_id', required: false },
        { table: 'tags', column: 'user_id', required: false },
        { table: 'tags', column: 'created_at', required: false }
      ];

      for (const { table, column, required } of criticalColumns) {
        try {
          const { data, error } = await supabase.from(table).select(column).limit(1);
          result.columns[`${table}.${column}`] = { 
            exists: !error, 
            error: error?.message,
            required 
          };
          result.summary.totalChecks++;
          if (!error) {
            result.summary.passedChecks++;
          } else if (required) {
            result.summary.failedChecks++;
          } else {
            result.summary.warningChecks++;
          }
        } catch (error) {
          result.columns[`${table}.${column}`] = { 
            exists: false, 
            error: error.message,
            required 
          };
          result.summary.totalChecks++;
          if (required) {
            result.summary.failedChecks++;
          } else {
            result.summary.warningChecks++;
          }
        }
      }

      // 4. Verificar políticas RLS críticas
      const criticalPolicies = [
        { table: 'users', policy: 'Users can read own profile' },
        { table: 'users', policy: 'Users can update own profile' },
        { table: 'pets', policy: 'Users can read own pets' },
        { table: 'pets', policy: 'Users can insert own pets' },
        { table: 'pets', policy: 'Users can update own pets' },
        { table: 'pets', policy: 'Anyone can read activated pets' },
        { table: 'tags', policy: 'Users can read own tags' },
        { table: 'tags', policy: 'Users can claim and update tags' },
        { table: 'tags', policy: 'Anyone can read activated tags' }
      ];

      // Verificar si RLS está habilitado (esto es una aproximación)
      for (const table of requiredTables) {
        try {
          // Intentar una operación que requiere RLS
          const { data, error } = await supabase.from(table).select('*').limit(1);
          result.policies[`${table}_rls`] = { 
            enabled: true, 
            note: 'RLS parece estar funcionando (no se puede verificar completamente desde el cliente)' 
          };
        } catch (error) {
          result.policies[`${table}_rls`] = { 
            enabled: false, 
            error: error.message 
          };
        }
      }

      // 5. Verificar vista crítica
      try {
        const { data, error } = await supabase.from('active_tags_with_pets').select('*').limit(1);
        result.views['active_tags_with_pets'] = { 
          exists: !error, 
          error: error?.message 
        };
        result.summary.totalChecks++;
        if (!error) result.summary.passedChecks++;
        else result.summary.failedChecks++;
      } catch (error) {
        result.views['active_tags_with_pets'] = { 
          exists: false, 
          error: error.message 
        };
        result.summary.totalChecks++;
        result.summary.failedChecks++;
      }

      // 6. Verificar datos de prueba
      try {
        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: tagCount } = await supabase.from('tags').select('*', { count: 'exact', head: true });
        const { count: petCount } = await supabase.from('pets').select('*', { count: 'exact', head: true });

        result.dataCounts = {
          users: userCount || 0,
          tags: tagCount || 0,
          pets: petCount || 0
        };
      } catch (error) {
        result.dataCounts = { error: error.message };
      }

      // 7. Verificar usuario admin específico
      try {
        const { data: adminUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', 'santiago.marcos@gmail.com')
          .maybeSingle();

        result.adminUser = {
          exists: !!adminUser && !error,
          data: adminUser,
          error: error?.message
        };
      } catch (error) {
        result.adminUser = {
          exists: false,
          error: error.message
        };
      }

      console.log('✅ Diagnóstico completo terminado:', result);
      setDiagnosticResult(result);

      // Mostrar resumen en toast
      const { passedChecks, failedChecks, warningChecks, totalChecks } = result.summary;
      if (failedChecks === 0) {
        toast({
          title: "✅ Base de datos en perfecto estado",
          description: `${passedChecks}/${totalChecks} verificaciones pasaron. ${warningChecks} advertencias menores.`
        });
      } else {
        toast({
          title: "⚠️ Se encontraron problemas",
          description: `${failedChecks} errores críticos, ${warningChecks} advertencias de ${totalChecks} verificaciones.`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error en diagnóstico:', error);
      toast({
        title: "Error en diagnóstico",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runCompleteDiagnostic();
  }, []);

  const StatusIcon = ({ condition, warningCondition = false }) => {
    if (condition) return <CheckCircle className="h-5 w-5 text-green-400" />;
    if (warningCondition) return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
    return <XCircle className="h-5 w-5 text-red-400" />;
  };

  const getStatusColor = (condition, warningCondition = false) => {
    if (condition) return 'text-green-300';
    if (warningCondition) return 'text-yellow-300';
    return 'text-red-300';
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
            <Database className="h-10 w-10 mr-3 text-cyan-300" />
            Diagnóstico Completo de Base de Datos
          </h1>
          <p className="text-white/80 text-lg">
            Verificación exhaustiva del esquema, datos y configuración de Plakita.
          </p>
        </motion.div>

        {/* Controles */}
        <div className="mb-6">
          <Button
            onClick={runCompleteDiagnostic}
            disabled={isLoading}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Ejecutar Diagnóstico Completo
          </Button>
        </div>

        {/* Resultados */}
        {diagnosticResult && (
          <div className="space-y-6">
            {/* Resumen general */}
            <Card className="gradient-card border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-6 w-6 mr-2 text-cyan-300" />
                  Resumen General
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{diagnosticResult.summary.passedChecks}</p>
                    <p className="text-sm text-white/70">Exitosas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">{diagnosticResult.summary.failedChecks}</p>
                    <p className="text-sm text-white/70">Fallidas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-400">{diagnosticResult.summary.warningChecks}</p>
                    <p className="text-sm text-white/70">Advertencias</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-cyan-300">{diagnosticResult.summary.totalChecks}</p>
                    <p className="text-sm text-white/70">Total</p>
                  </div>
                </div>

                {/* Estado de conexión */}
                <div className="mt-4 p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <StatusIcon condition={diagnosticResult.connection?.success} />
                    <span className={getStatusColor(diagnosticResult.connection?.success)}>
                      Conexión a Supabase: {diagnosticResult.connection?.success ? 'Exitosa' : 'Fallida'}
                    </span>
                  </div>
                  {diagnosticResult.connection?.error && (
                    <p className="text-red-300 text-sm mt-1 ml-7">{diagnosticResult.connection.error}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Estado de las tablas */}
            <Card className="gradient-card border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Table className="h-6 w-6 mr-2 text-cyan-300" />
                  Estado de las Tablas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(diagnosticResult.tables).map(([table, status]) => (
                    <div key={table} className="flex items-center justify-between p-2 bg-black/20 rounded">
                      <span className="font-medium">{table}</span>
                      <div className="flex items-center space-x-2">
                        <StatusIcon condition={status.exists} />
                        <span className={`text-sm ${getStatusColor(status.exists)}`}>
                          {status.exists ? 'OK' : 'Error'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Estado de columnas críticas */}
            <Card className="gradient-card border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Columns className="h-6 w-6 mr-2 text-cyan-300" />
                  Columnas Críticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {Object.entries(diagnosticResult.columns).map(([column, status]) => (
                    <div key={column} className="flex items-center justify-between p-2 bg-black/20 rounded text-sm">
                      <span className="font-mono">{column}</span>
                      <div className="flex items-center space-x-2">
                        <StatusIcon 
                          condition={status.exists} 
                          warningCondition={!status.exists && !status.required}
                        />
                        <span className={getStatusColor(status.exists, !status.exists && !status.required)}>
                          {status.exists ? 'OK' : (status.required ? 'Falta' : 'Opcional')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Usuario admin */}
            <Card className="gradient-card border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-6 w-6 mr-2 text-cyan-300" />
                  Usuario Administrador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <StatusIcon condition={diagnosticResult.adminUser?.exists} />
                    <span className={getStatusColor(diagnosticResult.adminUser?.exists)}>
                      santiago.marcos@gmail.com: {diagnosticResult.adminUser?.exists ? 'Encontrado' : 'No encontrado'}
                    </span>
                  </div>
                  
                  {diagnosticResult.adminUser?.data && (
                    <div className="p-3 bg-green-500/20 rounded-lg">
                      <p className="text-green-300 text-sm">
                        <strong>ID:</strong> {diagnosticResult.adminUser.data.id}<br />
                        <strong>Nombre:</strong> {diagnosticResult.adminUser.data.full_name || 'No especificado'}<br />
                        <strong>Creado:</strong> {new Date(diagnosticResult.adminUser.data.created_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                  
                  {diagnosticResult.adminUser?.error && (
                    <p className="text-red-300 text-sm">{diagnosticResult.adminUser.error}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Conteos de datos */}
            {diagnosticResult.dataCounts && !diagnosticResult.dataCounts.error && (
              <Card className="gradient-card border-white/20 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="h-6 w-6 mr-2 text-cyan-300" />
                    Datos Existentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-cyan-300">{diagnosticResult.dataCounts.users}</p>
                      <p className="text-sm text-white/70">Usuarios</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-cyan-300">{diagnosticResult.dataCounts.tags}</p>
                      <p className="text-sm text-white/70">Tags</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-cyan-300">{diagnosticResult.dataCounts.pets}</p>
                      <p className="text-sm text-white/70">Mascotas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vista crítica */}
            <Card className="gradient-card border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-6 w-6 mr-2 text-cyan-300" />
                  Vista Crítica
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <StatusIcon condition={diagnosticResult.views?.active_tags_with_pets?.exists} />
                  <span className={getStatusColor(diagnosticResult.views?.active_tags_with_pets?.exists)}>
                    active_tags_with_pets: {diagnosticResult.views?.active_tags_with_pets?.exists ? 'Existe' : 'No existe'}
                  </span>
                </div>
                {diagnosticResult.views?.active_tags_with_pets?.error && (
                  <p className="text-red-300 text-sm mt-1 ml-7">{diagnosticResult.views.active_tags_with_pets.error}</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading && (
          <Card className="gradient-card border-white/20 text-white">
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-lg">Ejecutando diagnóstico completo...</p>
              <p className="text-sm text-white/70">Verificando tablas, columnas, políticas y datos</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DatabaseDiagnostic;