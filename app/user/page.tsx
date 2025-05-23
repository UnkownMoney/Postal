"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Shipment, User, Method } from "@/model/interface";
import { userService } from "@/lib/services/userService";
import { shipmentService } from "@/lib/services/packageService";
import { methodService } from "@/lib/services/methodTypeService";

export default function UserDashboard() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [shippingMethods, setShippingMethods] = useState<Method[]>([]);
  const [activeTab, setActiveTab] = useState("active"); // active, history, canceled
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [shipmentToCancel, setShipmentToCancel] = useState<Shipment | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [newShipment, setNewShipment] = useState({
    to_address: "",
    weight: 0,
    method: 1
  });
  const router = useRouter();

  const statusMap = {
    "pending": { label: "Pending", style: "bg-yellow-100 text-yellow-800" },
    "picked_up": { label: "Picked Up", style: "bg-blue-100 text-blue-800" },
    "in_transit": { label: "In Transit", style: "bg-purple-100 text-purple-800" },
    "out_for_delivery": { label: "Out for Delivery", style: "bg-indigo-100 text-indigo-800" },
    "delivered": { label: "Delivered", style: "bg-green-100 text-green-800" },
    "failed_delivery": { label: "Failed Delivery", style: "bg-orange-100 text-orange-800" },
    "returned": { label: "Returned", style: "bg-red-100 text-red-800" },
    "cancelled": { label: "Cancelled", style: "bg-gray-100 text-gray-800" }
  };

  useEffect(() => {
    checkUser();
    fetchShippingMethods();
    subscribeToShipmentUpdates();
  }, []);

  const subscribeToShipmentUpdates = () => {
    if (!user) return;

    const subscription = supabase
      .channel('shipment_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'shipments',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const updatedShipment = payload.new as Shipment;
        setNotifications(prev => [`Shipment #${updatedShipment.id} status updated to ${updatedShipment.status}`, ...prev]);
        setShipments(prev => prev.map(shipment => 
          shipment.id === updatedShipment.id ? updatedShipment : shipment
        ));
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const fetchShippingMethods = async () => {
    try {
      const methods = await methodService.getAll();
      setShippingMethods(methods);
      // Set default method in newShipment if not already set
      setNewShipment(prev => ({ ...prev, method: (methods && methods.length > 0) ? methods[0].id : 1 }));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!user) return;
      
      const shipmentData = {
        sender: user.id,
        to_address: newShipment.to_address,
        weight: newShipment.weight,
        method: newShipment.method,
        user_id: user.id,
        status: "pending",
        senderDetails: null
      };

      const createdShipment = await shipmentService.create(shipmentData);
      if (createdShipment) {
        setShipments([createdShipment, ...shipments]);
        setShowCreateModal(false);
        setNewShipment({ to_address: "", weight: 0, method: 1 });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTrackShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const shipmentData = await shipmentService.getById(Number(trackingId));
      
      if (shipmentData) {
        setSelectedShipment(shipmentData);
        setShowTrackModal(false);
        setTrackingId("");
      } else {
        setError("Shipment not found");
      }
    } catch (err: any) {
      setError("Shipment not found");
    }
  };

  const checkUser = async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) throw authError;
      
      if (!session?.user?.email) {
        router.push('/login');
        return;
      }

      const userData = await userService.getUserByEmail(session.user.email);
      
      if (!userData) {
        throw new Error("User not found");
      }
      
      setUser(userData);
      
      // Fetch shipments for this user
      const shipmentsData = await shipmentService.getShipmentsByUserId(userData.id);
      setShipments(shipmentsData);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    return statusMap[status as keyof typeof statusMap]?.label || "Unknown";
  };

  const getStatusStyle = (status: string) => {
    return statusMap[status as keyof typeof statusMap]?.style || "bg-gray-100 text-gray-800";
  };

  const handleCancelShipment = async () => {
    if (!shipmentToCancel || !user) return;

    try {
      const updatedShipment = await shipmentService.updateShipmentStatus(shipmentToCancel.id, "cancelled");
      if (updatedShipment) {
        setShipments(prev => prev.map(shipment =>
          shipment.id === shipmentToCancel.id ? updatedShipment : shipment
        ));
        setShowCancelConfirm(false);
        setShipmentToCancel(null);
        setNotifications(prev => [`Shipment #${shipmentToCancel.id} has been cancelled`, ...prev]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredShipments = shipments.filter(shipment => {
    switch (activeTab) {
      case 'active':
        return shipment.status === "pending" || shipment.status === "picked_up" || shipment.status === "in_transit";
      case 'history':
        return shipment.status === "delivered" || shipment.status === "returned";
      case 'canceled':
        return shipment.status === "cancelled";
      default:
        return true;
    }
  });

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
          <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
          <div className="mt-2">
            <p className="text-gray-600">{user?.email}</p>
            <p className="text-sm text-gray-500">{user?.address}</p>
          </div>
        </div>
        <nav className="mt-6">
          <button
            onClick={() => setActiveTab("active")}
            className={`w-full px-6 py-3 text-left ${
              activeTab === "active" ? "bg-gray-100" : ""
            }`}
          >
            Active Shipments
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`w-full px-6 py-3 text-left ${
              activeTab === "history" ? "bg-gray-100" : ""
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab("canceled")}
            className={`w-full px-6 py-3 text-left ${
              activeTab === "canceled" ? "bg-gray-100" : ""
            }`}
          >
            Cancelled
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Shipments</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create New Shipment
          </button>
        </div>

        {/* Shipments List */}
        <div className="bg-white rounded-lg shadow">
          {filteredShipments.map((shipment) => (
            <div
              key={shipment.id}
              className="border-b p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Shipment #{shipment.id}</h3>
                  <p className="text-sm text-gray-600">To: {shipment.to_address}</p>
                  <p className="text-sm text-gray-600">Weight: {shipment.weight} kg</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(shipment.status)}`}>
                    {getStatusLabel(shipment.status)}
                  </span>
                  {shipment.status === "pending" && (
                    <button
                      onClick={() => {
                        setShipmentToCancel(shipment);
                        setShowCancelConfirm(true);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Shipment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Create New Shipment</h2>
            <form onSubmit={handleCreateShipment}>
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

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && shipmentToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Cancel Shipment</h2>
            <p className="mb-4">Are you sure you want to cancel shipment #{shipmentToCancel.id}?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                No, Keep It
              </button>
              <button
                onClick={handleCancelShipment}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Yes, Cancel It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 