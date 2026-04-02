export type TipoGrupo = 'chicas' | 'chicos' | 'mixto_solteros' | 'casados';
export type Modalidad = 'online' | 'presencial';
export type Genero = 'masculino' | 'femenino';
export type PersonaStatus = 'en_proceso' | 'integrado' | 'desinteresado' | 'error';

export interface Profile {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
}

export interface Persona {
  id: string;
  nombre: string;
  apellido: string;
  edad: number;
  celular: string | null;
  email: string | null;
  genero: Genero;
  dias_disponibles: string[];
  tipo_grupo: TipoGrupo;
  modalidad: Modalidad;
  status: PersonaStatus;
  grupo_id: string | null;
  created_at: string;
}

export interface Grupo {
  id: string;
  nombre: string;
  tipo_grupo: TipoGrupo;
  modalidad: Modalidad;
  edad_min: number;
  edad_max: number;
  capacidad: number;
  descripcion: string | null;
}

export interface Notificacion {
  id: string;
  user_id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

export type RootStackParamList = {
  Login: undefined;
  EmailLogin: undefined;
  Main: undefined;
  Form: undefined;
  IntegrationList: undefined;
  ContactDetail: { contact: any; onDone?: () => void };
};

export type TabParamList = {
  Integrar: undefined;
  Grupos: undefined;
  Notificaciones: undefined;
  Perfil: undefined;
};
