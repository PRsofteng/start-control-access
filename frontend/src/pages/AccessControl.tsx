import React, { useState, useEffect } from 'react';
import { useAccessControl } from '../contexts/AccessControlContext';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, Unlock, Video, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const AccessControl: React.FC = () => {
  const { doorStatus, openDoor, accessEvents, currentPeopleCount } = useAccessControl();
  const { user } = useAuth();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [adminPassword] = useState('admin123'); // Para demonstração - em um app real verificaria no backend

  // Gera um número aleatório para o feed da câmera de demonstração
  const [cameraFeedId] = useState(() => Math.floor(Math.random() * 100));

  const handleOpenDoor = () => {
    setIsPasswordDialogOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === adminPassword) {
      try {
        await openDoor();
        toast.success('Comando de abertura da porta enviado com sucesso');
        setPassword('');
        setIsPasswordDialogOpen(false);
      } catch (error) {
        toast.error('Falha ao abrir a porta');
      }
    } else {
      toast.error('Senha incorreta');
    }
  };

  const getMostRecentAccessEvent = () => {
    if (accessEvents.length === 0) return null;
    
    return accessEvents.sort((a, b) => 
      new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
    )[0];
  };

  const recentEvent = getMostRecentAccessEvent();

  // Para demonstração - simula atualizações do status da porta
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Isso seria substituído por atualizações em tempo real do backend
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const getDoorStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'aberta';
      case 'opening':
        return 'abrindo';
      case 'closing':
        return 'fechando';
      case 'closed':
        return 'fechada';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Controle de Acesso</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controle da Porta */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Controle da Porta do Almoxarifado</h2>
          
          <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-gray-50 rounded-lg mb-6">
            <div className="flex items-center mb-4 md:mb-0">
              <div className={`p-4 rounded-full ${
                doorStatus === 'open' || doorStatus === 'opening'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-red-100 text-red-600'
              }`}>
                {doorStatus === 'open' || doorStatus === 'opening' ? (
                  <Unlock className="h-8 w-8" />
                ) : (
                  <Lock className="h-8 w-8" />
                )}
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Porta está {getDoorStatusText(doorStatus)}
                </h3>
                <p className="text-sm text-gray-500">
                  {doorStatus === 'open' 
                    ? 'A porta está atualmente aberta' 
                    : doorStatus === 'opening'
                    ? 'A porta está abrindo...'
                    : doorStatus === 'closing'
                    ? 'A porta está fechando...'
                    : 'A porta está atualmente fechada'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleOpenDoor}
              disabled={doorStatus !== 'closed'}
              className="flex items-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-md transition-colors"
            >
              <Shield className="mr-2 h-5 w-5" />
              Abrir Porta
            </button>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">Câmera ao Vivo</h3>
              <div className="flex items-center">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                <span className="text-xs text-gray-500">AO VIVO</span>
              </div>
            </div>
            <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
              {/* Em um app real, isso seria um stream de vídeo */}
              <img 
                src={`https://picsum.photos/seed/${cameraFeedId}/800/450`} 
                alt="Câmera do almoxarifado" 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 text-xs rounded">
                Entrada do Almoxarifado • Câmera 1
              </div>
            </div>
          </div>
        </div>

        {/* Status e Estatísticas */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Status Atual</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-md">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-gray-700">Pessoas no Interior</span>
                </div>
                <span className="text-xl font-bold text-blue-600">{currentPeopleCount}</span>
              </div>
              
              {recentEvent && (
                <div className={`flex justify-between items-center p-3 ${
                  recentEvent.status === 'allowed' ? 'bg-green-50' : 'bg-red-50'
                } rounded-md`}>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-3" />
                    <div>
                      <p className="text-gray-700">Último Acesso</p>
                      <p className="text-xs text-gray-500">
                        {new Date(recentEvent.entryTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    recentEvent.status === 'allowed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {recentEvent.status === 'allowed' ? 'Autorizado' : 'Negado'}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Alertas Recentes</h2>
            
            <div className="space-y-3">
              {accessEvents
                .filter(event => event.status === 'denied')
                .slice(0, 3)
                .map(event => (
                  <div key={event.id} className="flex items-start p-3 bg-red-50 rounded-md">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-800">{event.employeeName}</p>
                      <p className="text-sm text-gray-600">
                        {event.reason || 'Tentativa de acesso não autorizada'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.entryTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              
              {accessEvents.filter(event => event.status === 'denied').length === 0 && (
                <p className="text-gray-500 italic">Nenhum alerta recente</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Diálogo de Senha */}
      {isPasswordDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Autenticação de Administrador</h2>
            <p className="text-gray-600 mb-4">Por favor, digite sua senha de administrador para abrir a porta.</p>
            
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setPassword('');
                    setIsPasswordDialogOpen(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Autenticar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Import needed component
const Users = ({ className = "" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
};

// Import needed component
const Clock = ({ className = "" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
};

export default AccessControl;