"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Shipment, User, Method } from "@/model/interface";
import { userService } from "@/lib/services/userService";
import { shipmentService } from "@/lib/services/packageService";
import { methodService } from "@/lib/services/methodTypeService";

export default function AdminDashboard() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [shippingMethods, setShippingMethods] = useState<Method[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, shipments, users, settings
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newShipment, setNewShipment] = useState<Partial<Shipment>>({
    sender: users.length > 0 ? users[0].id : undefined,
    to_address: "",
    weight: 0,
    method: shippingMethods.length > 0 ? shippingMethods[0].id : undefined,
    status: "pending",
    senderDetails: null
  });
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAdmin();
    fetchData();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) throw authError;
      
      if (!session?.user?.email) {
        router.push('/login');
        return;
      }

      const user = await userService.getUserByEmail(session.user.email);
      
      if (!user || !user.priv) {
        router.push('/user');
        return;
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch all shipments with related data
      const shipmentsData = await shipmentService.getAll();
      setShipments(shipmentsData);

      // Fetch all users
      const usersData = await userService.getAll();
      setUsers(usersData);

      // Fetch all shipping methods
      const methodsData = await methodService.getAll();
      setShippingMethods(methodsData);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (shipmentId: number, newStatus: string) => {
    try {
      const updatedShipment = await shipmentService.updateShipmentStatus(shipmentId, newStatus);
      
      if (updatedShipment) {
        setShipments(prev => prev.map(shipment =>
          shipment.id === shipmentId ? updatedShipment : shipment
        ));

        if (selectedShipment?.id === shipmentId) {
          setSelectedShipment(updatedShipment);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateShippingMethod = async (methodId: number, updates: Partial<Method>) => {
    try {
      const updatedMethod = await methodService.update(methodId, updates);
      if (updatedMethod) {
        setShippingMethods(prev => prev.map(method =>
          method.id === methodId ? updatedMethod : method
        ));
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAdminCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newShipment.sender || !newShipment.to_address || newShipment.weight === undefined || !newShipment.method) {
        setError("Please fill in all required fields for the new shipment.");
        return;
      }

      const createdShipment = await shipmentService.create(newShipment as Omit<Shipment, "id" | "created_at">);
      if (createdShipment) {
        setShipments([createdShipment, ...shipments]);
        setShowCreateModal(false);
        setNewShipment({
          sender: users.length > 0 ? users[0].id : undefined,
          to_address: "",
          weight: 0,
          method: shippingMethods.length > 0 ? shippingMethods[0].id : undefined,
          status: "pending",
          senderDetails: null
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredShipments = shipments.filter(shipment => {
    let matches = true;

    if (statusFilter !== null) {
      matches = matches && shipment.status.toLowerCase().includes(statusFilter.toLowerCase());
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matches = matches && (
        shipment.id.toString().includes(searchLower) ||
        shipment.to_address.toLowerCase().includes(searchLower) ||
        (shipment.senderDetails?.email || "").toLowerCase().includes(searchLower)
      );
    }

    if (dateRange.start && dateRange.end) {
      const shipmentDate = new Date(shipment.created_at);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      matches = matches && (shipmentDate >= startDate && shipmentDate <= endDate);
    }

    return matches;
  });

  const getDashboardStats = () => {
    return {
      totalShipments: shipments.length,
      pendingShipments: shipments.filter(shipment => shipment.status === "pending").length,
      deliveredShipments: shipments.filter(shipment => shipment.status === "delivered").length,
      totalUsers: users.length,
      totalRevenue: shipments.reduce((sum, shipment) => {
        const method = shippingMethods.find(m => m.id === shipment.method);
        return sum + (method ? method.cost : 0);
      }, 0)
    };
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // To restore event handlers
    }
  };

  const getStatusStyle = (status: string) => {
    const statusStyles: { [key: string]: string } = {
      "pending": "bg-yellow-100 text-yellow-800",
      "picked_up": "bg-blue-100 text-blue-800",
      "in_transit": "bg-purple-100 text-purple-800",
      "out_for_delivery": "bg-indigo-100 text-indigo-800",
      "delivered": "bg-green-100 text-green-800",
      "failed_delivery": "bg-orange-100 text-orange-800",
      "returned": "bg-red-100 text-red-800",
      "cancelled": "bg-gray-100 text-gray-800",
      default: "bg-gray-100 text-gray-800"
    };
    return statusStyles[status] || statusStyles.default;
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800">Admin Dashboard</h2>
        </div>
        <nav className="mt-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full px-6 py-3 text-left ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveTab('shipments')}
            className={`w-full px-6 py-3 text-left ${activeTab === 'shipments' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Shipments
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full px-6 py-3 text-left ${activeTab === 'users' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full px-6 py-3 text-left ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {activeTab === 'dashboard' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm">Total Shipments</h3>
                <p className="text-2xl font-bold">{getDashboardStats().totalShipments}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm">Pending Shipments</h3>
                <p className="text-2xl font-bold">{getDashboardStats().pendingShipments}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm">Total Users</h3>
                <p className="text-2xl font-bold">{getDashboardStats().totalUsers}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm">Total Revenue</h3>
                <p className="text-2xl font-bold">${getDashboardStats().totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shipments' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Shipments</h1>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Create New Shipment
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={statusFilter || ""}
                    onChange={(e) => setStatusFilter(e.target.value || null)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="in_transit">In Transit</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="failed_delivery">Failed Delivery</option>
                    <option value="returned">Returned</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Search</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search shipments..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Shipments Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{shipment.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(shipment.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {shipment.senderDetails ? (
                          <>
                            <div>{shipment.senderDetails.email}</div>
                            <div className="text-xs text-gray-400">{shipment.senderDetails.address}</div>
                          </>
                        ) : (
                          <span className="text-gray-400 italic">Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{shipment.to_address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shipment.weight} kg</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {shippingMethods.find(m => m.id === shipment.method)?.name || "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusStyle(shipment.status)}`}>
                          {shipment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedShipment(shipment)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </button>
                          <select
                            value={shipment.status}
                            onChange={(e) => handleUpdateStatus(shipment.id, e.target.value)}
                            className="text-sm border-gray-300 rounded"
                          >
                            <option value="pending">Pending</option>
                            <option value="picked_up">Picked Up</option>
                            <option value="in_transit">In Transit</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="failed_delivery">Failed Delivery</option>
                            <option value="returned">Returned</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Users</h1>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{user.address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs rounded-full ${user.priv ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {user.priv ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Shipping Methods</h1>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shippingMethods.map((method) => (
                    <tr key={method.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{method.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="text"
                          value={method.name}
                          onChange={(e) => handleUpdateShippingMethod(method.id, { name: e.target.value })}
                          className="border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="number"
                          value={method.cost}
                          onChange={(e) => handleUpdateShippingMethod(method.id, { cost: Number(e.target.value) })}
                          className="border-gray-300 rounded"
                          step="0.01"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleUpdateShippingMethod(method.id, { name: method.name, cost: method.cost })}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Shipment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Create New Shipment</h2>
            <form onSubmit={handleAdminCreateShipment}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Sender</label>
                <select
                  value={newShipment.sender}
                  onChange={(e) => setNewShipment({ ...newShipment, sender: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">To Address</label>
                <input
                  type="text"
                  value={newShipment.to_address}
                  onChange={(e) => setNewShipment({ ...newShipment, to_address: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                <input
                  type="number"
                  value={newShipment.weight}
                  onChange={(e) => setNewShipment({ ...newShipment, weight: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Shipping Method</label>
                <select
                  value={newShipment.method}
                  onChange={(e) => setNewShipment({ ...newShipment, method: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  {shippingMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name} - ${method.cost}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipment Details Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Shipment Details</h2>
              <button
                onClick={() => setSelectedShipment(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <p><strong>ID:</strong> {selectedShipment.id}</p>
              <p><strong>Created At:</strong> {new Date(selectedShipment.created_at).toLocaleString()}</p>
              <p><strong>Sender:</strong> {selectedShipment.senderDetails ? `${selectedShipment.senderDetails.email} (${selectedShipment.senderDetails.address})` : <span className="text-gray-400 italic">Unknown</span>}</p>
              <p><strong>To Address:</strong> {selectedShipment.to_address}</p>
              <p><strong>Weight:</strong> {selectedShipment.weight} kg</p>
              <p><strong>Method:</strong> {shippingMethods.find(m => m.id === selectedShipment.method)?.name || "Unknown"}</p>
              <p><strong>Cost:</strong> ${shippingMethods.find(m => m.id === selectedShipment.method)?.cost || 0}</p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`${getStatusStyle(selectedShipment.status)} px-2 py-1 rounded`}>
                  {selectedShipment.status}
                </span>
              </p>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Update Status</label>
                <select
                  value={selectedShipment.status}
                  onChange={(e) => handleUpdateStatus(selectedShipment.id, e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="in_transit">In Transit</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed_delivery">Failed Delivery</option>
                  <option value="returned">Returned</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}