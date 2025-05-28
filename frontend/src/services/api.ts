import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Tipos
export interface Pessoa {
  id: string;
  tipo: 'funcionario' | 'visitante';
  nome: string;
  ativo: boolean;
  validade_fim?: string;
  criado_em: string;
}

export interface Tag {
  uid: number;
  pessoa_id?: string;
  bloqueada: boolean;
  criado_em: string;
}

export interface AccessEvent {
  id: string;
  employeeName: string;
  employeeId: string;
  tagUid: string;
  entryTime: string;
  exitTime: string | null;
  status: 'allowed' | 'denied';
  reason: string | null;
}

export interface VerifyResponse {
  allowed: boolean;
  pessoa_id?: string;
  motivo: string;
}

export interface DoorOpenRequest {
  motivo?: string;
}

// Serviços de API
export const pessoaService = {
  listar: async () => {
    const response = await api.get<Pessoa[]>('/pessoa');
    return response.data;
  },
  criar: async (data: Omit<Pessoa, 'id' | 'criado_em'>) => {
    const response = await api.post<Pessoa>('/pessoa', data);
    return response.data;
  },

  obter: async (id: string) => {
    const response = await api.get<Pessoa>(`/pessoa/${id}`);
    return response.data;
  }
};

export const tagService = {
  listar: async () => {
    const response = await api.get<Tag[]>('/tag');
    return response.data;
  },
  criar: async (data: Omit<Tag, 'criado_em'>) => {
    const response = await api.post<Tag>('/tag', data);
    return response.data;
  },

  obter: async (uid: number) => {
    const response = await api.get<Tag>(`/tag/${uid}`);
    return response.data;
  },

  verificar: async (uid: number, leitor_id: string) => {
    const response = await api.post<VerifyResponse>('/verify-tag', { uid, leitor_id });
    return response.data;
  }
};

export const doorService = {
  open: async (data: DoorOpenRequest = {}) => {
    await api.post('/door/open', data);
  }
};

export const accessEventService = {
  listar: async () => {
    const response = await api.get<AccessEvent[]>('/access-events');
    return response.data;
  }
};