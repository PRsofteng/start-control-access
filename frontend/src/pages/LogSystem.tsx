import React, { useState } from 'react';
import { useAccessControl } from '../contexts/AccessControlContext';
import { Search, FileDown, Calendar, Filter, ArrowUp, ArrowDown } from 'lucide-react';
import { LogFilters, AccessEvent } from '../types';
import toast from 'react-hot-toast';

const LogSystem: React.FC = () => {
  const { accessEvents, employees } = useAccessControl();
  const [filters, setFilters] = useState<LogFilters>({
    startDate: '',
    endDate: '',
    employeeId: '',
    department: '',
    status: undefined
  });
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [sortField, setSortField] = useState<keyof AccessEvent>('entryTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const departments = Array.from(new Set(employees.map(emp => emp.department)));

  const handleFilterChange = (name: keyof LogFilters, value: string) => {
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      employeeId: '',
      department: '',
      status: undefined
    });
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    // In a real app, this would call an API to generate the report
    toast.success(`Exporting logs as ${format.toUpperCase()}...`);
  };

  const handleSort = (field: keyof AccessEvent) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply filters and sorting
  const filteredEvents = accessEvents.filter(event => {
    if (filters.startDate && new Date(event.entryTime) < new Date(filters.startDate)) {
      return false;
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (new Date(event.entryTime) > endDate) {
        return false;
      }
    }
    
    if (filters.employeeId && event.employeeId !== filters.employeeId) {
      return false;
    }
    
    if (filters.department) {
      const employee = employees.find(emp => emp.id === event.employeeId);
      if (!employee || employee.department !== filters.department) {
        return false;
      }
    }
    
    if (filters.status && event.status !== filters.status) {
      return false;
    }
    
    return true;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    let valueA = a[sortField];
    let valueB = b[sortField];
    
    // Handle string comparison
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      if (sortDirection === 'asc') {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    }
    
    // Handle date comparison
    if (sortField === 'entryTime' || sortField === 'exitTime') {
      const dateA = valueA ? new Date(valueA as string).getTime() : 0;
      const dateB = valueB ? new Date(valueB as string).getTime() : 0;
      
      if (sortDirection === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    }
    
    return 0;
  });

  const getEmployeeDepartment = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.department : '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Access Logs</h1>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
          >
            <Filter className="mr-2 h-5 w-5" />
            {isFilterVisible ? 'Hide Filters' : 'Show Filters'}
          </button>
          
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center px-4 py-2 border border-green-600 rounded-md bg-green-50 text-green-700 hover:bg-green-100"
          >
            <FileDown className="mr-2 h-5 w-5" />
            Export Excel
          </button>
          
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center px-4 py-2 border border-red-600 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
          >
            <FileDown className="mr-2 h-5 w-5" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      {isFilterVisible && (
        <div className="bg-white rounded-lg shadow-md p-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee
              </label>
              <select
                value={filters.employeeId}
                onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Employees</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="allowed">Authorized</option>
                <option value="denied">Denied</option>
              </select>
            </div>
            
            <div className="md:col-span-3 flex items-end justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('employeeName')}
                >
                  <div className="flex items-center">
                    Employee
                    {sortField === 'employeeName' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tag UID
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('entryTime')}
                >
                  <div className="flex items-center">
                    Entry Time
                    {sortField === 'entryTime' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('exitTime')}
                >
                  <div className="flex items-center">
                    Exit Time
                    {sortField === 'exitTime' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    {sortField === 'status' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{event.employeeName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{getEmployeeDepartment(event.employeeId)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{event.tagUid}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(event.entryTime).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {event.exitTime ? new Date(event.exitTime).toLocaleString() : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      event.status === 'allowed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {event.status === 'allowed' ? 'Authorized' : 'Denied'}
                    </span>
                  </td>
                </tr>
              ))}
              
              {sortedEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No access logs found matching the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{sortedEvents.length}</span> results
              {filteredEvents.length !== accessEvents.length && (
                <span> (filtered from <span className="font-medium">{accessEvents.length}</span> total)</span>
              )}
            </div>
            
            <div className="flex space-x-2">
              {/* Pagination would go here in a real app */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogSystem;