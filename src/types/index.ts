export type TipoGrupo = 'chicas' | 'chicos' | 'mixto_solteros' | 'casados';
export type Modalidad = 'online' | 'presencial';
export type Genero = 'masculino' | 'femenino';
export type PersonaStatus = 'en_proceso' | 'integrado' | 'desinteresado' | 'error';

export interface Profile {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  edad: number;
  tipo_grupo: TipoGrupo;
  modalidad: Modalidad;
}

export interface Persona {
  id: string;
  nombre: string;
  apellido: string;
  edad: number | null;
  celular: string | null;
  email: string | null;
  genero: Genero | null;
  dias_disponibles: string[];
  tipo_grupo: TipoGrupo | null;
  modalidad: Modalidad | null;
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
  GuiaHome: undefined;
  PersonDetail: { person: any; onDone?: () => void };
};

export type TabParamList = {
  Integrar: undefined;
  Grupos: undefined;
  Notificaciones: undefined;
  Perfil: undefined;
};
