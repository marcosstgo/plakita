import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, LogOut, User, Home, ShieldCheck, Search, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

// ID correcto del usuario admin
const ADMIN_USER_ID = '3d4b3b56-fba6-4d76-866c-f38551c7a6c4';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isUserAdmin = user?.id === ADMIN_USER_ID || user?.email === 'santiago.marcos@gmail.com';

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-white" />
            <span className="text-2xl font-bold text-white">Plakita</span>
          </Link>

          <div className="flex items-center space-x-1 sm:space-x-4">
            {/* Enlace de Ayuda - visible para todos */}
            <Link to="/help">
              <Button variant="ghost" className="text-white hover:bg-white/20 p-2 sm:px-4">
                <HelpCircle className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ayuda</span>
              </Button>
            </Link>

            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" className="text-white hover:bg-white/20 p-2 sm:px-4">
                    <User className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                </Link>
                {isUserAdmin && (
                  <>
                    <Link to="/admin">
                      <Button variant="ghost" className="text-white hover:bg-purple-600/50 p-2 sm:px-4">
                        <ShieldCheck className="h-4 w-4 sm:mr-2" />
                        <span className="hidden md:inline">Admin</span>
                      </Button>
                    </Link>
                    <Link to="/verify-user">
                      <Button variant="ghost" className="text-white hover:bg-blue-600/50 p-2 sm:px-4">
                        <Search className="h-4 w-4 sm:mr-2" />
                        <span className="hidden lg:inline">Verificar</span>
                      </Button>
                    </Link>
                  </>
                )}
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="text-white hover:bg-white/20 p-2 sm:px-4"
                >
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-white hover:bg-white/20 text-sm sm:text-base px-2 sm:px-4">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-white text-purple-600 hover:bg-white/90 text-sm sm:text-base px-2 sm:px-4">
                    Registrarse
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;