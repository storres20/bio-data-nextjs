'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function DevicesPage() {
    const { user, token, hydrated } = useAuth();
    const [devices, setDevices] = useState([]);
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_RAILWAY;
    //const apiBase = process.env.NEXT_PUBLIC_API_BASE_LOCAL;

    useEffect(() => {
        if (hydrated && !token) {
            window.location.href = '/login';
        }
    }, [hydrated, token]);

    useEffect(() => {
        if (hydrated && user) {
            //fetch(`/api/devices/hospital/${user.hospital._id}`)
            fetch(`${apiBase}/api/devices/hospital/`+ user.hospital._id)
                .then(res => res.json())
                .then(data => setDevices(data))
                .catch(err => console.error(err));
        }
    }, [hydrated, user]);

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
                    </div>
                ))}
            </div>
        </div>
    );
}
