import React, { createContext, useContext, useState, useEffect } from 'react';
import { Pessoa, Tag, pessoaService, tagService, doorService, accessEventService } from '../services/api';
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

  const loadTags = async () => {
    try {
      const data = await tagService.listar();
      setRfidTags(data);
    } catch (err) {
      console.error('Error loading tags:', err);
      setError('Failed to load tags');
    }
  };

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