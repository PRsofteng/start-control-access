import React, { useState } from 'react';
import { useAccessControl } from '../contexts/AccessControlContext';
import { PlusCircle, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Pessoa } from '../services/api';

const EmployeeRegistration: React.FC = () => {
  const { employees, addEmployee, updateEmployee } = useAccessControl();
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [formData, setFormData] = useState<Omit<Pessoa, 'id' | 'criado_em'>>({
    tipo: 'funcionario',
    nome: '',
    ativo: true,
    validade_fim: undefined
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Pessoa, string>>>({});

  const validateForm = () => {
    const newErrors: Partial<Record<keyof Pessoa, string>> = {};
    
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.tipo) newErrors.tipo = 'Tipo é obrigatório';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof Pessoa]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await addEmployee(formData);
      toast.success('Funcionário cadastrado com sucesso!');
      setIsAddingEmployee(false);
      setFormData({
        tipo: 'funcionario',
        nome: '',
        ativo: true,
        validade_fim: undefined
      });
    } catch (error) {
      toast.error('Falha ao cadastrar funcionário');
    }
  };

  const toggleEmployeeStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateEmployee(id, { ativo: !currentStatus });
      toast.success(`Funcionário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error) {
      toast.error('Falha ao atualizar status do funcionário');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Cadastro de Funcionários</h1>
        <button
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          onClick={() => setIsAddingEmployee(!isAddingEmployee)}
        >
          {isAddingEmployee ? (
            <>
              <XCircle className="mr-2 h-5 w-5" />
              Cancelar
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-5 w-5" />
              Adicionar Funcionário
            </>
          )}
        </button>
      </div>

      {isAddingEmployee && (
        <div className="bg-white rounded-lg shadow-md p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Novo Funcionário</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border ${errors.nome ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.nome && (
                <p className="text-red-500 text-xs mt-1">{errors.nome}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border ${errors.tipo ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="funcionario">Funcionário</option>
                <option value="visitante">Visitante</option>
              </select>
              {errors.tipo && (
                <p className="text-red-500 text-xs mt-1">{errors.tipo}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Data de Validade
              </label>
              <input
                type="date"
                name="validade_fim"
                value={formData.validade_fim || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="ativo"
                value={formData.ativo ? 'true' : 'false'}
                onChange={(e) => handleInputChange({
                  ...e,
                  target: { ...e.target, value: e.target.value === 'true' }
                } as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Cadastrar Funcionário
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{employee.nome}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.tipo === 'funcionario' ? 'Funcionário' : 'Visitante'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.validade_fim ? new Date(employee.validade_fim).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      employee.ativo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => toggleEmployeeStatus(employee.id, employee.ativo)}
                        className={`p-1 rounded-full ${
                          employee.ativo 
                            ? 'text-red-600 hover:bg-red-100' 
                            : 'text-green-600 hover:bg-green-100'
                        }`}
                        title={employee.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {employee.ativo ? (
                          <XCircle className="h-5 w-5" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                      </button>
                      <button 
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded-full"
                        title="Editar"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    </div>
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

export default EmployeeRegistration;