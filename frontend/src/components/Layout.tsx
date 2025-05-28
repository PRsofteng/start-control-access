import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Tag, 
  Shield, 
  ClipboardList, 
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md hidden md:block">
        <div className="p-6">
          <h1 className="text-xl font-bold text-blue-900 flex items-center">
            <Shield className="mr-2" />
            Controle de Acesso
          </h1>
        </div>
        <nav className="mt-6">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `flex items-center py-3 px-6 ${isActive ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' : 'text-gray-600 hover:bg-gray-100'}`
            }
            end
          >
            <LayoutDashboard className="mr-3 h-5 w-5" />
            Dashboard
          </NavLink>
          <NavLink 
            to="/employees" 
            className={({ isActive }) => 
              `flex items-center py-3 px-6 ${isActive ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' : 'text-gray-600 hover:bg-gray-100'}`
            }
          >
            <Users className="mr-3 h-5 w-5" />
            Funcionários
          </NavLink>
          <NavLink 
            to="/tags" 
            className={({ isActive }) => 
              `flex items-center py-3 px-6 ${isActive ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' : 'text-gray-600 hover:bg-gray-100'}`
            }
          >
            <Tag className="mr-3 h-5 w-5" />
            Tags RFID
          </NavLink>
          <NavLink 
            to="/access" 
            className={({ isActive }) => 
              `flex items-center py-3 px-6 ${isActive ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' : 'text-gray-600 hover:bg-gray-100'}`
            }
          >
            <Shield className="mr-3 h-5 w-5" />
            Controle de Acesso
          </NavLink>
          <NavLink 
            to="/logs" 
            className={({ isActive }) => 
              `flex items-center py-3 px-6 ${isActive ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' : 'text-gray-600 hover:bg-gray-100'}`
            }
          >
            <ClipboardList className="mr-3 h-5 w-5" />
            Registros
          </NavLink>
        </nav>
        <div className="absolute bottom-0 w-64 border-t border-gray-200">
          <button 
            onClick={logout}
            className="flex items-center py-3 px-6 text-gray-600 hover:bg-gray-100 w-full text-left"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-md w-full fixed top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-blue-900 flex items-center">
            <Shield className="mr-2" />
            Controle de Acesso
          </h1>
          <button className="text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-6">
        <div className="md:hidden h-16"></div> {/* Spacer for mobile header */}
        {children}
      </main>
    </div>
  );
};

export default Layout;