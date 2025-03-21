'use client';

import { useEffect, useState } from 'react';

export default function Register() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [hospitals, setHospitals] = useState([]);
    const [areas, setAreas] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState('');
    const [selectedArea, setSelectedArea] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Fetch hospitals and areas from backend
        fetch('https://bio-data-production.up.railway.app/api/auth/hospitals')
            .then((res) => res.json())
            .then((data) => setHospitals(data));

        fetch('https://bio-data-production.up.railway.app/api/auth/areas')
            .then((res) => res.json())
            .then((data) => setAreas(data));
    }, []);

    const handleRegister = async () => {
        const response = await fetch('https://bio-data-production.up.railway.app/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, hospital_id: selectedHospital, area_id: selectedArea }),
        });

        if (response.ok) {
            setMessage('Registration successful! You can now login.');
        } else {
            const errorData = await response.json();
            setMessage(errorData.message);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Register</h1>
            {message && <p className="text-red-500">{message}</p>}
            <input
                type="text"
                placeholder="Username"
                className="p-2 border border-gray-300 rounded w-64 mb-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                className="p-2 border border-gray-300 rounded w-64 mb-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <select
                className="p-2 border border-gray-300 rounded w-64 mb-2"
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
            >
                <option value="">Select a Hospital</option>
                {hospitals.map((hospital) => (
                    <option key={hospital._id} value={hospital._id}>{hospital.name}</option>
                ))}
            </select>
            <select
                className="p-2 border border-gray-300 rounded w-64 mb-2"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
            >
                <option value="">Select an Area</option>
                {areas.map((area) => (
                    <option key={area._id} value={area._id}>{area.name}</option>
                ))}
            </select>
            <button
                onClick={handleRegister}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700"
            >
                Register
            </button>
        </div>
    );
}
