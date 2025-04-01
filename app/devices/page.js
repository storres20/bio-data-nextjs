'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import WebSocket from 'isomorphic-ws';
import { useRef } from 'react';


export default function DevicesPage() {
    const { user, token, hydrated } = useAuth();
    const [devices, setDevices] = useState([]);
    const [connectedSensors, setConnectedSensors] = useState([]);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_RAILWAY;
    //const apiBase = process.env.NEXT_PUBLIC_API_BASE_LOCAL; // ✅ LOCAL para desarrollo

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
    }, [hydrated, user]);

    // 📡 Obtener sensores conectados en tiempo real desde WebSocket
    useEffect(() => {
        const ws = new WebSocket('wss://bio-data-production.up.railway.app');
        const connected = new Map(); // temporal map for connected sensors

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const username = data.username;
                const now = Date.now();

                connected.set(username, now);

                // Filtra usuarios conectados en los últimos 5 segundos
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
    const assignSensorToDevice = async (deviceId, username) => {
        try {
            const res = await fetch(`${apiBase}/api/devices/${deviceId}/assign-sensor`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const updatedDevice = await res.json();

            // Actualizar el estado local
            setDevices((prev) =>
                prev.map((dev) => (dev._id === deviceId ? updatedDevice : dev))
            );
        } catch (error) {
            console.error('Error assigning sensor:', error);
        }
    };

    if (!hydrated || !user) return null;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Devices for {user.hospital.name}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.map((device) => (
                    <div key={device._id} className="bg-white p-4 rounded shadow border">
                        <h2 className="text-xl font-semibold">{device.name}</h2>
                        <p><strong>Brand:</strong> {device.brand}</p>
                        <p><strong>Model:</strong> {device.model}</p>
                        <p><strong>Serie:</strong> {device.serie}</p>

                        <div className="mt-2">
                            <label className="block mb-1 text-sm font-medium text-gray-700">Assign Sensor:</label>
                            <select
                                value={device.assigned_sensor_username || ''}
                                onChange={(e) => assignSensorToDevice(device._id, e.target.value)}
                                className="w-full p-2 border rounded"
                            >
                                <option value="">-- Select Sensor --</option>
                                {connectedSensors.map((username) => (
                                    <option key={username} value={username}>
                                        {username}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {device.assigned_sensor_username && (
                            <p className="mt-2 text-sm text-green-600">
                                ✅ Assigned to: <strong>{device.assigned_sensor_username}</strong>
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
