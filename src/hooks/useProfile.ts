import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'pending' | 'integrador' | 'guia' | 'admin';

export type UserProfile = {
  id: string;
  email: string;
  role: UserRole;
  nombre: string;
  apellido: string;
  edad: number;
  celular: string | null;
  full_name: string | null;
  age: number | null;
  dias_disponibles: string[];
  tipo_grupo: 'chicas' | 'chicos' | 'mixto_solteros' | 'casados';
  modalidad: 'online' | 'presencial';
  address: string | null;
  phone: string | null;
  push_token: string | null;
};

const ADMIN_EMAIL = 'jdbcarrascal@gmail.com';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log('fetchProfile ');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('id, email, role, nombre, apellido, edad, celular, dias_disponibles, tipo_grupo, modalidad, full_name, age, address, phone, push_token')
        .eq('id', user.id)
        .maybeSingle();

      console.log('dbError', dbError);
      if (dbError) throw dbError;
      console.log('data', data);
      if (data) {
        // Override de rol por email del admin
        const role: UserRole = user.email === ADMIN_EMAIL ? 'admin' : data.role;
        setProfile({ ...data, role });
      } else {
        // Primera vez: crear perfil con role pending
        console.log('user.email', user.email);
        console.log('ADMIN_EMAIL', ADMIN_EMAIL);
        const newProfile: UserProfile = {
          id: user.id,
          email: user.email!,
          full_name: null,
          role: user.email === ADMIN_EMAIL ? 'admin' : 'pending',
          nombre: '',
          apellido: '',
          edad: 0,
          celular: '',
          age: null,
          dias_disponibles: [],
          tipo_grupo: 'chicas',
          modalidad: 'online',
          address: null,
          phone: null,
          push_token: null,
        };
        console.log('n SewProfile', newProfile);
        const { error: insertError } = await supabase.from('profiles').insert(newProfile).select();
        console.log('insertError', insertError);
        if (insertError) throw insertError;
        setProfile(newProfile);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, loading, error, fetchProfile };
}
