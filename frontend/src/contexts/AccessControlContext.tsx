import React, { createContext, useContext, useState, useEffect } from 'react';
<<<<<<< HEAD
import { Pessoa, pessoaService, doorService } from '../services/api';
=======
import { Pessoa, Tag, pessoaService, tagService, doorService, accessEventService } from '../services/api';
>>>>>>> origin/main
import { DoorStatus, AccessEvent } from '../types';

interface AccessControlContextType {
  employees: Pessoa[];
  accessEvents: AccessEvent[];
  doorStatus: DoorStatus;
  currentPeopleCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Employee functions
  addEmployee: (employee: Omit<Pessoa, 'id' | 'criado_em'>) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<Pessoa>) => Promise<void>;
  
  // Access Control functions
  openDoor: () => Promise<void>;

  // Load functions
  loadEmployees: () => Promise<void>;
  loadAccessEvents: () => Promise<void>;
}

const AccessControlContext = createContext<AccessControlContextType | undefined>(undefined);

<<<<<<< HEAD
// Mock data for demonstration
const mockEmployees: Pessoa[] = [
  {
    id: '1',
    tipo: 'funcionario',
    nome: 'João Silva',
    foto_url: 'https://picsum.photos/seed/1/64',
    ativo: true,
    criado_em: new Date().toISOString()
  },
  {
    id: '2',
    tipo: 'funcionario',
    nome: 'Maria Souza',
    foto_url: 'https://picsum.photos/seed/2/64',
    ativo: true,
    criado_em: new Date().toISOString()
  },
  {
    id: '3',
    tipo: 'visitante',
    nome: 'Carlos Oliveira',
    foto_url: 'https://picsum.photos/seed/3/64',
    ativo: false,
    validade_fim: new Date().toISOString(),
    criado_em: new Date().toISOString()
  }
];

// Helper function to generate mock access events
const generateMockAccessEvents = (): AccessEvent[] => {
  const events: AccessEvent[] = [];
  const now = new Date();
  
  for (let i = 0; i < 20; i++) {
    const date = new Date(now.getTime() - i * 3600000);
    const employee = mockEmployees[Math.floor(Math.random() * mockEmployees.length)];
    const tagUid = 1000 + i;

    events.push({
      id: `event-${i}`,
      employeeName: employee.nome,
      employeeId: employee.id,
      tagUid: String(tagUid),
      entryTime: new Date(date.getTime() - 3600000).toISOString(),
      exitTime: i % 3 === 0 ? null : date.toISOString(),
      status: i % 5 === 0 ? 'denied' : 'allowed',
      reason: i % 5 === 0 ? 'Unauthorized access attempt' : null
    });
  }
  
  return events;
};
=======
>>>>>>> origin/main

export const AccessControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Pessoa[]>([]);
  const [accessEvents, setAccessEvents] = useState<AccessEvent[]>([]);
  const [doorStatus, setDoorStatus] = useState<DoorStatus>('closed');
  const [currentPeopleCount, setCurrentPeopleCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load initial data
    Promise.all([
      loadEmployees(),
      loadAccessEvents()
    ]).then(() => {
      setIsLoading(false);
    }).catch(err => {
      setError('Failed to load initial data');
      setIsLoading(false);
    });
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await pessoaService.listar();
      setEmployees(data);
      setError(null);
    } catch (err) {
      console.error('Error loading employees:', err);
      setError('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

<<<<<<< HEAD
=======
  const loadTags = async () => {
    try {
      const data = await tagService.listar();
      setRfidTags(data);
    } catch (err) {
      console.error('Error loading tags:', err);
      setError('Failed to load tags');
    }
  };

>>>>>>> origin/main
  const loadAccessEvents = async () => {
    setIsLoading(true);
    try {
      const events = await accessEventService.listar();
      setAccessEvents(events);

      const peopleInside = events.filter(
        event => event.status === 'allowed' && !event.exitTime
      ).length;
      setCurrentPeopleCount(peopleInside);
      setError(null);
    } catch (err) {
      console.error('Error loading access events:', err);
      setError('Failed to load access events');
    } finally {
      setIsLoading(false);
    }
  };

  const addEmployee = async (employee: Omit<Pessoa, 'id' | 'criado_em'>) => {
    try {
      const newEmployee = await pessoaService.criar(employee);
      setEmployees([...employees, newEmployee]);
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  };

  const updateEmployee = async (id: string, employeeData: Partial<Pessoa>) => {
    // In a real app, you would call API
    setEmployees(employees.map(emp => 
      emp.id === id ? { ...emp, ...employeeData } : emp
    ));
  };


  const openDoor = async () => {
    setDoorStatus('opening');
    try {
      await doorService.open({ motivo: 'manual' });
      setDoorStatus('open');

      setTimeout(() => {
        setDoorStatus('closing');
        setTimeout(() => {
          setDoorStatus('closed');
        }, 1000);
      }, 3000);
    } catch (error) {
      console.error('Error opening door:', error);
      setDoorStatus('closed');
      throw error;
    }
  };

  return (
    <AccessControlContext.Provider
      value={{
        employees,
        accessEvents,
        doorStatus,
        currentPeopleCount,
        isLoading,
        error,
        
        addEmployee,
        updateEmployee,
        openDoor,

        loadEmployees,
        loadAccessEvents
      }}
    >
      {children}
    </AccessControlContext.Provider>
  );
};

export const useAccessControl = () => {
  const context = useContext(AccessControlContext);
  if (context === undefined) {
    throw new Error('useAccessControl must be used within an AccessControlProvider');
  }
  return context;
};