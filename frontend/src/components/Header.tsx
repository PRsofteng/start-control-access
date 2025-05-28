import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isAlmoxarifado = location.pathname === '/almoxarifado';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#00A0E3] to-[#1B75BC] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <img
                src="https://www.startquimica.com.br/images/start-cor-fundo-transparente@2x.png"
                alt="Start Química"
                className="h-12 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to={isAlmoxarifado ? "/" : "/almoxarifado"}
              className="text-white hover:text-blue-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {isAlmoxarifado ? "Controle de Acesso" : "Almoxarifado"}
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-blue-100 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="sr-only">Abrir menu principal</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#1B75BC]">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to={isAlmoxarifado ? "/" : "/almoxarifado"}
              className="text-white hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              {isAlmoxarifado ? "Controle de Acesso" : "Almoxarifado"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;