import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { notifyAdminsNewUser, notifyUserPendingRole } from '../lib/notifications';

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

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('id, email, role, nombre, apellido, edad, celular, dias_disponibles, tipo_grupo, modalidad, full_name, age, address, phone, push_token')
        .eq('id', user.id)
        .maybeSingle();

      if (dbError) throw dbError;

      if (data) {
        setProfile(data);
      } else {
        // Primera vez: crear perfil con role pending
        const newProfile: UserProfile = {
          id: user.id,
          email: user.email!,
          full_name: null,
          role: 'pending',
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
        const { error: insertError } = await supabase.from('profiles').insert(newProfile).select();
        if (insertError) throw insertError;
        setProfile(newProfile);

        // Notificar admins y al propio usuario si su rol es pending
        if (newProfile.role === 'pending') {
          notifyAdminsNewUser(user.email!).catch(() => {});
          notifyUserPendingRole(user.id).catch(() => {});
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, loading, error, fetchProfile };
}
