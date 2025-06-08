import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, syncCurrentUser } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // Sincronizar usuario con public.users si existe
      if (currentUser) {
        await syncCurrentUser(currentUser);
      }
      
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        // Sincronizar usuario con public.users en cada cambio de auth
        if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          await syncCurrentUser(currentUser);
        }
        
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    
    // Sincronizar usuario después del login
    if (data.user) {
      await syncCurrentUser(data.user);
    }
    
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });
    if (error) throw error;
    
    // La sincronización se hará automáticamente por el trigger
    // pero también la hacemos aquí por si acaso
    if (data.user) {
      await syncCurrentUser(data.user);
    }
    
    return data.user;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};