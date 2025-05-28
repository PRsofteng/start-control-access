import React, { createContext, useContext, useState, useEffect } from 'react';
import { Pessoa, Tag, pessoaService, tagService, doorService } from '../services/api';
import { DoorStatus, AccessEvent } from '../types';

interface AccessControlContextType {
  employees: Pessoa[];
  rfidTags: Tag[];
  accessEvents: AccessEvent[];
  doorStatus: DoorStatus;
  currentPeopleCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Employee functions
  addEmployee: (employee: Omit<Pessoa, 'id' | 'criado_em'>) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<Pessoa>) => Promise<void>;
  
  // RFID Tag functions
  assignTag: (tagUid: string, employeeId: string) => Promise<void>;
  unassignTag: (tagUid: string) => Promise<void>;
  
  // Access Control functions
  openDoor: () => Promise<void>;
  
  // Load functions
  loadEmployees: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadAccessEvents: () => Promise<void>;
}

const AccessControlContext = createContext<AccessControlContextType | undefined>(undefined);

// Mock data for demonstration
const mockEmployees: Pessoa[] = [
  { 
    id: '1', 
    tipo: 'funcionario',
    nome: 'João Silva',
    ativo: true,
    criado_em: new Date().toISOString()
  },
  { 
    id: '2', 
    tipo: 'funcionario',
    nome: 'Maria Souza',
    ativo: true,
    criado_em: new Date().toISOString()
  },
  { 
    id: '3', 
    tipo: 'visitante',
    nome: 'Carlos Oliveira',
    ativo: false,
    validade_fim: new Date().toISOString(),
    criado_em: new Date().toISOString()
  }
];

const mockRfidTags: Tag[] = [
  { uid: 1234567890, pessoa_id: '1', bloqueada: false, criado_em: new Date().toISOString() },
  { uid: 987654321, pessoa_id: '2', bloqueada: false, criado_em: new Date().toISOString() },
  { uid: 567890123, pessoa_id: undefined, bloqueada: false, criado_em: new Date().toISOString() }
];

// Helper function to generate mock access events
const generateMockAccessEvents = (): AccessEvent[] => {
  const events: AccessEvent[] = [];
  const now = new Date();
  
  for (let i = 0; i < 20; i++) {
    const date = new Date(now.getTime() - i * 3600000);
    const employee = mockEmployees[Math.floor(Math.random() * mockEmployees.length)];
    const tag = mockRfidTags.find(tag => tag.pessoa_id === employee.id) || mockRfidTags[0];
    
    events.push({
      id: `event-${i}`,
      employeeName: employee.nome,
      employeeId: employee.id,
      tagUid: tag.uid.toString(),
      entryTime: new Date(date.getTime() - 3600000).toISOString(),
      exitTime: i % 3 === 0 ? null : date.toISOString(),
      status: i % 5 === 0 ? 'denied' : 'allowed',
      reason: i % 5 === 0 ? 'Unauthorized access attempt' : null
    });
  }
  
  return events;
};

export const AccessControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Pessoa[]>([]);
  const [rfidTags, setRfidTags] = useState<Tag[]>([]);
  const [accessEvents, setAccessEvents] = useState<AccessEvent[]>([]);
  const [doorStatus, setDoorStatus] = useState<DoorStatus>('closed');
  const [currentPeopleCount, setCurrentPeopleCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load initial data
    Promise.all([
      loadEmployees(),
      loadTags(),
      loadAccessEvents()
    ]).then(() => {
      setIsLoading(false);
    }).catch(err => {
      setError('Failed to load initial data');
      setIsLoading(false);
    });
  }, []);

  const loadEmployees = async () => {
    // In a real app, you would fetch from API
    setEmployees(mockEmployees);
    return Promise.resolve();
  };

  const loadTags = async () => {
    // In a real app, you would fetch from API
    setRfidTags(mockRfidTags);
    return Promise.resolve();
  };

  const loadAccessEvents = async () => {
    // In a real app, you would fetch from API
    const events = generateMockAccessEvents();
    setAccessEvents(events);
    
    // Calculate current people count
    const peopleInside = events.filter(
      event => event.status === 'allowed' && !event.exitTime
    ).length;
    setCurrentPeopleCount(peopleInside);
    
    return Promise.resolve();
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

  const assignTag = async (tagUid: string, employeeId: string) => {
    try {
      await tagService.criar({
        uid: parseInt(tagUid),
        pessoa_id: employeeId,
        bloqueada: false
      });
      
      setRfidTags(tags => tags.map(tag => 
        tag.uid === parseInt(tagUid)
          ? { ...tag, pessoa_id: employeeId } 
          : tag
      ));
    } catch (error) {
      console.error('Error assigning tag:', error);
      throw error;
    }
  };

  const unassignTag = async (tagUid: string) => {
    try {
      await tagService.criar({
        uid: parseInt(tagUid),
        pessoa_id: undefined,
        bloqueada: false
      });
      
      setRfidTags(tags => tags.map(tag => 
        tag.uid === parseInt(tagUid)
          ? { ...tag, pessoa_id: undefined } 
          : tag
      ));
    } catch (error) {
      console.error('Error unassigning tag:', error);
      throw error;
    }
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
        rfidTags,
        accessEvents,
        doorStatus,
        currentPeopleCount,
        isLoading,
        error,
        
        addEmployee,
        updateEmployee,
        assignTag,
        unassignTag,
        openDoor,
        
        loadEmployees,
        loadTags,
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