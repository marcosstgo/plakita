import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Database } from 'lucide-react';
import { checkDatabaseConnection, verifyDatabaseSchema } from '@/lib/supabaseClient';

const DatabaseStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [schemaStatus, setSchemaStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    setIsChecking(true);
    
    // Check connection
    const connection = await checkDatabaseConnection();
    setConnectionStatus(connection);
    
    // Check schema
    const schema = await verifyDatabaseSchema();
    setSchemaStatus(schema);
    
    setIsChecking(false);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const getStatusIcon = (status) => {
    if (status === null) return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    if (status.connected || status.exists) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  return (
    <Card className="gradient-card border-white/20 text-white">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="h-6 w-6 mr-2" />
          Estado de la Base de Datos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Conexión a Supabase:</span>
          {getStatusIcon(connectionStatus)}
        </div>
        
        {connectionStatus?.error && (
          <div className="text-red-300 text-sm">
            Error: {connectionStatus.error}
          </div>
        )}

        {schemaStatus && (
          <div className="space-y-2">
            <h4 className="font-semibold">Estado de las Tablas:</h4>
            {Object.entries(schemaStatus).map(([table, status]) => (
              <div key={table} className="flex items-center justify-between text-sm">
                <span>{table}:</span>
                {getStatusIcon(status)}
              </div>
            ))}
          </div>
        )}

        <Button 
          onClick={checkStatus} 
          disabled={isChecking}
          className="w-full bg-white text-purple-600 hover:bg-white/90"
        >
          {isChecking ? 'Verificando...' : 'Verificar Estado'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DatabaseStatus;