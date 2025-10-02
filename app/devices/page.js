'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import WebSocket from 'isomorphic-ws';

export default function DevicesPage() {
    const { user, token, hydrated } = useAuth();
    const [devices, setDevices] = useState([]);
    const [connectedSensors, setConnectedSensors] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, assigned, unassigned
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_RAILWAY;

    // 🔒 Redirigir si no está autenticado
    useEffect(() => {
        if (hydrated && !token) {
            window.location.href = '/login';
        }
    }, [hydrated, token]);

    // 📥 Obtener dispositivos por hospital
    useEffect(() => {
        if (hydrated && user) {
            fetch(`${apiBase}/api/devices/hospital/${user.hospital._id}`)
                .then(res => res.json())
                .then(data => setDevices(data))
                .catch(err => console.error(err));
        }
    }, [hydrated, user, apiBase]);

    // 📡 Obtener sensores conectados en tiempo real desde WebSocket
    useEffect(() => {
        const ws = new WebSocket('wss://bio-data-production.up.railway.app');
        const connected = new Map();

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const username = data.username;
                const now = Date.now();

                connected.set(username, now);

                const filtered = Array.from(connected.entries())
                    .filter(([_, time]) => now - time < 5000)
                    .map(([username]) => username);

                setConnectedSensors(filtered);
            } catch (err) {
                console.error('Error parsing WebSocket data:', err);
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    // 🔄 Asignar sensor a un dispositivo
    const assignSensorToDevice = async (deviceId, username, deviceName) => {
        try {
            const res = await fetch(`${apiBase}/api/devices/${deviceId}/assign-sensor`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const updatedDevice = await res.json();

            setDevices((prev) =>
                prev.map((dev) => (dev._id === deviceId ? updatedDevice : dev))
            );

            // Mostrar mensaje de éxito
            setSuccessMessage(username
                ? `Sensor "${username}" assigned to "${deviceName}" successfully!`
                : `Sensor unassigned from "${deviceName}" successfully!`
            );
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 3000);
        } catch (error) {
            console.error('Error assigning sensor:', error);
        }
    };

    if (!hydrated || !user) return null;

    // Filtrar dispositivos
    const filteredDevices = devices.filter(device => {
        const matchesSearch =
            device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            device.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            device.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
            device.serie.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter =
            filterStatus === 'all' ||
            (filterStatus === 'assigned' && device.assigned_sensor_username) ||
            (filterStatus === 'unassigned' && !device.assigned_sensor_username);

        return matchesSearch && matchesFilter;
    });

    const assignedCount = devices.filter(d => d.assigned_sensor_username).length;
    const unassignedCount = devices.length - assignedCount;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                </svg>
                                Device Management
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">Configure and assign sensors to medical equipment</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hospital Info Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="font-semibold">{user.hospital.name}</span>
                        </div>
                        <div className="h-6 w-px bg-white/30"></div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm">{user.area.name}</span>
                        </div>
                        <div className="h-6 w-px bg-white/30"></div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm">{user.username}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed top-4 right-4 z-50 animate-slideDown">
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg shadow-lg flex items-start gap-3 max-w-md">
                        <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h3 className="text-green-900 font-bold">Success!</h3>
                            <p className="text-green-800 text-sm mt-1">{successMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Devices</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{devices.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Assigned</p>
                                <p className="text-3xl font-bold text-green-600 mt-1">{assignedCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Unassigned</p>
                                <p className="text-3xl font-bold text-amber-600 mt-1">{unassignedCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Sensors</p>
                                <p className="text-3xl font-bold text-cyan-600 mt-1">{connectedSensors.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center relative">
                                <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                                </svg>
                                {connectedSensors.length > 0 && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by name, brand, model, or serie..."
                                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    filterStatus === 'all'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterStatus('assigned')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    filterStatus === 'assigned'
                                        ? 'bg-green-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Assigned
                            </button>
                            <button
                                onClick={() => setFilterStatus('unassigned')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    filterStatus === 'unassigned'
                                        ? 'bg-amber-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Unassigned
                            </button>
                        </div>
                    </div>
                </div>

                {/* Devices Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDevices.map((device) => {
                        const isAssigned = !!device.assigned_sensor_username;
                        const sensorIsOnline = connectedSensors.includes(device.assigned_sensor_username);

                        return (
                            <div
                                key={device._id}
                                className={`group bg-white rounded-xl shadow-md border-2 transition-all duration-300 hover:shadow-xl overflow-hidden ${
                                    isAssigned
                                        ? 'border-green-300 hover:border-green-400'
                                        : 'border-gray-200 hover:border-blue-400'
                                }`}
                            >
                                {/* Status Badge */}
                                <div className={`h-2 ${isAssigned ? 'bg-green-500' : 'bg-amber-500'}`}></div>

                                <div className="p-6">
                                    {/* Device Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                                </svg>
                                                {device.name}
                                            </h2>
                                        </div>
                                        {isAssigned && sensorIsOnline && (
                                            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                Online
                                            </div>
                                        )}
                                        {isAssigned && !sensorIsOnline && (
                                            <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-semibold">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                                Offline
                                            </div>
                                        )}
                                    </div>

                                    {/* Device Info */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-600 w-16">Brand:</span>
                                            <span className="font-semibold text-gray-900">{device.brand}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-600 w-16">Model:</span>
                                            <span className="font-semibold text-gray-900">{device.model}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-600 w-16">Serie:</span>
                                            <span className="font-semibold text-gray-900">{device.serie}</span>
                                        </div>
                                    </div>

                                    {/* Sensor Assignment */}
                                    <div className="border-t border-gray-200 pt-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                                            </svg>
                                            Assign Sensor
                                        </label>
                                        <select
                                            value={device.assigned_sensor_username || ''}
                                            onChange={(e) => assignSensorToDevice(device._id, e.target.value, device.name)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                        >
                                            <option value="">-- Select Sensor --</option>
                                            {connectedSensors.map((username) => (
                                                <option key={username} value={username}>
                                                    {username}
                                                </option>
                                            ))}
                                        </select>

                                        {isAssigned && (
                                            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                                                <div className="flex items-start gap-2">
                                                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div>
                                                        <p className="text-sm font-semibold text-green-900">Sensor Assigned</p>
                                                        <p className="text-sm text-green-700 mt-1">
                                                            <strong>{device.assigned_sensor_username}</strong>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {filteredDevices.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                        <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Devices Found</h3>
                        <p className="text-gray-600">
                            {searchQuery || filterStatus !== 'all'
                                ? 'Try adjusting your filters or search terms'
                                : 'No devices registered for this hospital'}
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-gray-600">
                            © 2025 MHUTEMP Device Management System
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span>{connectedSensors.length} sensors online</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
