
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

const AdminTagsTable = ({ tags, onOpenDeleteDialog }) => {
  if (tags.length === 0) {
    return <p className="text-center text-white/70 py-8">No hay Plakitas generadas todavía.</p>;
  }

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="min-w-full divide-y divide-purple-500/30">
        <thead className="bg-white/5 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">Código Plakita</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">Estado</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">Mascota Vinculada</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">Usuario Activador</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">Fecha Creación</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white/10 divide-y divide-purple-500/20">
          {tags.map((tag) => (
            <tr key={tag.id} className="hover:bg-white/20 transition-colors duration-150">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{tag.code}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  tag.activated ? 'bg-green-500/80 text-green-50' : 'bg-yellow-500/80 text-yellow-50'
                }`}>
                  {tag.activated ? 'Activado' : 'No Activado'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {tag.pets ? (
                   <Link to={`/pet/${tag.pets.id}`} className="text-purple-300 hover:underline hover:text-purple-200">{tag.pets.name}</Link>
                ) : ( <span className="text-white/50">N/A</span> )}
               </td>
               <td className="px-6 py-4 whitespace-nowrap text-sm">
                {tag.users ? (
                   <span className="text-white/80">{tag.users.email}</span> 
                ) : ( <span className="text-white/50">N/A</span> )}
               </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">{tag.created_at ? new Date(tag.created_at).toLocaleDateString() : 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-2" 
                   onClick={() => onOpenDeleteDialog(tag)} 
                   disabled={tag.activated || tag.pet_id !== null || tag.user_id !== null}
                   title={ (tag.activated || tag.pet_id !== null || tag.user_id !== null) ? "Solo se pueden eliminar tags no activados/vinculados/reclamados" : "Eliminar Tag"}
                  >
                    <Trash2 className="h-4 w-4"/>
                 </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminTagsTable;
