import React, { useState } from 'react';
import { useAccessControl } from '../contexts/AccessControlContext';
import { Search, LinkIcon, Unlink, ShieldAlert, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const TagManagement: React.FC = () => {
  const { employees, rfidTags, assignTag, unassignTag } = useAccessControl();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [newTagUid, setNewTagUid] = useState('');

  const filteredEmployees = searchQuery 
    ? employees.filter(emp => 
        emp.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : employees;

  const handleAssignTag = async () => {
    if (!selectedEmployee || !newTagUid) {
      toast.error('Please select an employee and enter a tag UID');
      return;
    }

    try {
      await assignTag(newTagUid, selectedEmployee);
      toast.success('Tag assigned successfully');
      setNewTagUid('');
    } catch (error) {
      toast.error('Failed to assign tag');
    }
  };

  const handleUnassignTag = async (tagUid: string) => {
    try {
      await unassignTag(tagUid);
      toast.success('Tag unassigned successfully');
    } catch (error) {
      toast.error('Failed to unassign tag');
    }
  };

  const getEmployeeById = (id: string | null) => {
    if (!id) return null;
    return employees.find(emp => emp.id === id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">RFID Tag Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employee Selection */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Employee</h2>
          
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="overflow-y-auto max-h-64 border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr 
                    key={employee.id} 
                    className={`hover:bg-gray-50 cursor-pointer ${selectedEmployee === employee.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedEmployee(employee.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <span className="text-gray-500 font-medium">
                            {employee.nome.charAt(0)}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">{employee.nome}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        employee.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.ativo ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tag Assignment */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Assign RFID Tag</h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Selected Employee:</p>
            {selectedEmployee ? (
              <div className="flex items-center p-3 border border-blue-200 bg-blue-50 rounded-md">
                <div className="mr-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500 font-medium">
                      {getEmployeeById(selectedEmployee)?.nome.charAt(0)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="font-medium">{getEmployeeById(selectedEmployee)?.nome}</p>
                  <p className="text-sm text-gray-500">{getEmployeeById(selectedEmployee)?.id}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">No employee selected</p>
            )}
          </div>
          
          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              placeholder="Enter Tag UID"
              value={newTagUid}
              onChange={(e) => setNewTagUid(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAssignTag}
              disabled={!selectedEmployee || !newTagUid}
              className="flex items-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
            >
              <LinkIcon className="mr-2 h-5 w-5" />
              Assign
            </button>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Associated Tags</h3>
            <div className="space-y-2">
              {rfidTags
                .filter(tag => tag.pessoa_id === selectedEmployee)
                .map(tag => (
                  <div key={tag.uid} className="flex justify-between items-center p-3 border border-gray-200 rounded-md">
                    <div>
                      <div className="font-medium">{tag.uid}</div>
                      <div className="text-xs text-gray-500">
                        {tag.criado_em ? `Assigned: ${new Date(tag.criado_em).toLocaleString()}` : ''}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {tag.bloqueada ? (
                        <div className="flex items-center text-red-500">
                          <ShieldAlert className="h-5 w-5 mr-1" />
                          <span className="text-sm">Blocked</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-green-500">
                          <ShieldCheck className="h-5 w-5 mr-1" />
                          <span className="text-sm">Active</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleUnassignTag(tag.uid.toString())}
                        className="p-1 text-red-600 hover:bg-red-100 rounded-full"
                        title="Unassign Tag"
                      >
                        <Unlink className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              
              {selectedEmployee && rfidTags.filter(tag => tag.pessoa_id === selectedEmployee).length === 0 && (
                <p className="text-gray-500 italic">No tags assigned to this employee</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Available Tags */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Available Tags</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tag UID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned At</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rfidTags.map((tag) => {
                const assignedEmployee = getEmployeeById(tag.pessoa_id || null);
                
                return (
                  <tr key={tag.uid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tag.uid}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tag.bloqueada 
                          ? 'bg-red-100 text-red-800' 
                          : tag.pessoa_id 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {tag.bloqueada 
                          ? 'Blocked' 
                          : tag.pessoa_id 
                            ? 'Assigned'
                            : 'Available'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {assignedEmployee ? (
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                            <span className="text-gray-500 font-medium">
                              {assignedEmployee.nome.charAt(0)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-900">{assignedEmployee.nome}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tag.criado_em ? new Date(tag.criado_em).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {tag.pessoa_id ? (
                        <button
                          onClick={() => handleUnassignTag(tag.uid.toString())}
                          className="text-red-600 hover:text-red-900"
                        >
                          Unassign
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedEmployee(null);
                            setNewTagUid(tag.uid.toString());
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TagManagement;