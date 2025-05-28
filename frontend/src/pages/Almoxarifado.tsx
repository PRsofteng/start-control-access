import React from 'react';
import { Package } from 'lucide-react';

const Almoxarifado: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Package className="h-8 w-8 text-blue-600 mr-3" />
        <h1 className="text-3xl font-bold text-gray-800">Sistema de Almoxarifado</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">
          Bem-vindo ao Sistema de Almoxarifado da Start Química.
          Esta é a página inicial do sistema de gerenciamento de estoque e materiais.
        </p>
      </div>
    </div>
  );
};

export default Almoxarifado;