import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  Shield, 
  AlertTriangle,
  BarChart
} from 'lucide-react';
import { useAccessControl } from '../contexts/AccessControlContext';
import { TimePeriod } from '../types';

const Dashboard: React.FC = () => {
  const { 
    accessEvents, 
    currentPeopleCount,
    doorStatus
  } = useAccessControl();
  
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('today');

  const getTotalAccesses = () => {
    return accessEvents.length;
  };

  const getAuthorizedAccesses = () => {
    return accessEvents.filter(event => event.status === 'allowed').length;
  };

  const getUnauthorizedAccesses = () => {
    return accessEvents.filter(event => event.status === 'denied').length;
  };

  const getRecentAccessEvents = () => {
    return [...accessEvents]
      .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
      .slice(0, 5);
  };

  const getAccessByHour = () => {
    const hours = Array(24).fill(0);
    
    accessEvents.forEach(event => {
      const hour = new Date(event.entryTime).getHours();
      hours[hour]++;
    });
    
    return hours;
  };

  const getAccessByDepartment = () => {
    const departments = new Map<string, number>();
    
    accessEvents.forEach(event => {
      const department = event.employeeId === '1' ? 'TI' : 
                        event.employeeId === '2' ? 'RH' : 'Manutenção';
      
      if (departments.has(department)) {
        departments.set(department, departments.get(department)! + 1);
      } else {
        departments.set(department, 1);
      }
    });
    
    return Array.from(departments).map(([name, count]) => ({ name, count }));
  };

  const recentEvents = getRecentAccessEvents();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Painel de Controle</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setSelectedPeriod('today')}
            className={`px-3 py-1 rounded ${selectedPeriod === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Hoje
          </button>
          <button 
            onClick={() => setSelectedPeriod('week')}
            className={`px-3 py-1 rounded ${selectedPeriod === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Semana
          </button>
          <button 
            onClick={() => setSelectedPeriod('month')}
            className={`px-3 py-1 rounded ${selectedPeriod === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Mês
          </button>
        </div>
      </div>

      {/* Cartões de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total de Acessos</p>
              <p className="text-2xl font-bold text-gray-800">{getTotalAccesses()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Autorizados</p>
              <p className="text-2xl font-bold text-green-600">{getAuthorizedAccesses()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Não Autorizados</p>
              <p className="text-2xl font-bold text-red-600">{getUnauthorizedAccesses()}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pessoas Presentes</p>
              <p className="text-2xl font-bold text-blue-800">{currentPeopleCount}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Status da Porta */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Status da Porta do Almoxarifado</h2>
        <div className="flex items-center space-x-4">
          <div className={`w-4 h-4 rounded-full ${
            doorStatus === 'open' || doorStatus === 'opening' 
              ? 'bg-green-500' 
              : 'bg-red-500'
          }`}></div>
          <p className="text-gray-700 capitalize">
            {doorStatus === 'open' ? 'Aberta' :
             doorStatus === 'opening' ? 'Abrindo' :
             doorStatus === 'closing' ? 'Fechando' :
             'Fechada'}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Acessos por Hora</h2>
          <div className="h-64 flex items-end space-x-1">
            {getAccessByHour().map((count, hour) => (
              <div key={hour} className="flex-1 flex flex-col items-center">
                <div 
                  className="bg-blue-500 w-full" 
                  style={{ 
                    height: `${Math.max(count * 5, 1)}%`,
                    maxHeight: '90%'
                  }}
                ></div>
                <span className="text-xs text-gray-500 mt-1">
                  {hour}h
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Acessos por Departamento</h2>
          <div className="space-y-4">
            {getAccessByDepartment().map(({ name, count }) => (
              <div key={name} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{name}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((count / getTotalAccesses()) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Atividades Recentes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Atividades Recentes</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Funcionário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentEvents.map((event) => (
                <tr key={event.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{event.employeeName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(event.entryTime).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      event.status === 'allowed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {event.status === 'allowed' ? 'Autorizado' : 'Negado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;