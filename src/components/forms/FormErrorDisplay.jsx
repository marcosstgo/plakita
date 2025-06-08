import React from 'react';
import { AlertTriangle } from 'lucide-react';

const FormErrorDisplay = ({ errors, className = '' }) => {
  if (!errors || Object.keys(errors).length === 0) {
    return null;
  }

  return (
    <div className={`bg-red-500/20 border border-red-500/50 rounded-lg p-3 ${className}`}>
      <div className="flex items-start space-x-2">
        <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-red-300 font-semibold text-sm mb-1">
            Errores en el formulario:
          </h4>
          <ul className="text-red-200 text-sm space-y-1">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>• {error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FormErrorDisplay;