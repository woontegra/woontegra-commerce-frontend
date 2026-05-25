import React, { useState, useEffect } from 'react';
import type { CustomerGroup, Customer } from '../../types/b2b';
import { b2bService } from '../../services/b2b.service';

const AdminCustomerAssignment: React.FC = () => {
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [unassignedCustomers, setUnassignedCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, unassignedData] = await Promise.all([
        b2bService.getCustomerGroups(),
        b2bService.getCustomersWithoutGroup()
      ]);
      
      setGroups(groupsData);
      setUnassignedCustomers(unassignedData);
      
      if (groupsData.length > 0) {
        setSelectedGroup(groupsData[0].id);
        await loadGroupCustomers(groupsData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupCustomers = async (groupId: string) => {
    try {
      const data = await b2bService.getCustomersByGroup(groupId);
      setCustomers(data);
    } catch (error) {
      console.error('Error loading group customers:', error);
    }
  };

  const handleGroupChange = async (groupId: string) => {
    setSelectedGroup(groupId);
    await loadGroupCustomers(groupId);
  };

  const handleAssignCustomer = async (customerId: string) => {
    try {
      await b2bService.assignCustomerToGroup(customerId, selectedGroup);
      loadData();
    } catch (error) {
      console.error('Error assigning customer:', error);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedCustomers.length === 0) return;
    
    try {
      await b2bService.bulkAssignCustomersToGroup(selectedCustomers, selectedGroup);
      setSelectedCustomers([]);
      loadData();
    } catch (error) {
      console.error('Error bulk assigning customers:', error);
    }
  };

  const handleRemoveCustomer = async (customerId: string) => {
    try {
      await b2bService.assignCustomerToGroup(customerId, '');
      loadData();
    } catch (error) {
      console.error('Error removing customer:', error);
    }
  };

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const toggleAllCustomers = () => {
    if (selectedCustomers.length === unassignedCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(unassignedCustomers.map(c => c.id));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Müşteri Grup Atama</h1>
        <p className="text-gray-600 mt-2">Müşterileri gruplara atayın ve yönetin</p>
      </div>

      {/* Group Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Müşteri Grubu
        </label>
        <select
          value={selectedGroup}
          onChange={(e) => handleGroupChange(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name} ({group._count?.customers || 0} müşteri)
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unassigned Customers */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Grupsuz Müşteriler ({unassignedCustomers.length})
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={toggleAllCustomers}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedCustomers.length === unassignedCustomers.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                </button>
                {selectedCustomers.length > 0 && (
                  <button
                    onClick={handleBulkAssign}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Seçilileri Ata ({selectedCustomers.length})
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {unassignedCustomers.map((customer) => (
              <div key={customer.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={() => toggleCustomerSelection(customer.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {customer.firstName} {customer.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{customer.email}</div>
                      {customer.phone && (
                        <div className="text-sm text-gray-500">{customer.phone}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssignCustomer(customer.id)}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Ata
                  </button>
                </div>
              </div>
            ))}
            
            {unassignedCustomers.length === 0 && (
              <div className="px-6 py-12 text-center text-gray-500">
                Grupsuz müşteri bulunmuyor
              </div>
            )}
          </div>
        </div>

        {/* Group Customers */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Grup Müşterileri ({customers.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {customers.map((customer) => (
              <div key={customer.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {customer.firstName} {customer.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{customer.email}</div>
                    {customer.phone && (
                      <div className="text-sm text-gray-500">{customer.phone}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {customer._count?.orders || 0} sipariş
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCustomer(customer.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Kaldır
                  </button>
                </div>
              </div>
            ))}
            
            {customers.length === 0 && (
              <div className="px-6 py-12 text-center text-gray-500">
                Bu grupta müşteri bulunmuyor
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCustomerAssignment;
