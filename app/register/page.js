'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Register() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [hospitals, setHospitals] = useState([]);
    const [areas, setAreas] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState('');
    const [selectedArea, setSelectedArea] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'
    const [isLoading, setIsLoading] = useState(false);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_RAILWAY;

    useEffect(() => {
        // Fetch hospitals and areas from backend
        fetch(`${apiBase}/api/auth/hospitals`)
            .then((res) => res.json())
            .then((data) => setHospitals(data))
            .catch((err) => console.error('Error fetching hospitals:', err));

        fetch(`${apiBase}/api/auth/areas`)
            .then((res) => res.json())
            .then((data) => setAreas(data))
            .catch((err) => console.error('Error fetching areas:', err));
    }, [apiBase]);

    const handleRegister = async () => {
        setIsLoading(true);
        setMessage('');
        setMessageType('');

        try {
            const response = await fetch(`${apiBase}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    password,
                    hospital_id: selectedHospital,
                    area_id: selectedArea
                }),
            });

            if (response.ok) {
                setMessage('Registration successful! You can now login.');
                setMessageType('success');
                // Clear form
                setUsername('');
                setPassword('');
                setSelectedHospital('');
                setSelectedArea('');
            } else {
                const errorData = await response.json();
                setMessage(errorData.message || 'Registration failed. Please try again.');
                setMessageType('error');
            }
        } catch (error) {
            setMessage('Connection error. Please try again.');
            setMessageType('error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && username && password && selectedHospital && selectedArea) {
            handleRegister();
        }
    };

    const isFormValid = username && password && selectedHospital && selectedArea;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                    <p className="text-gray-600">Blood Bank Monitoring System</p>
                </div>

                {/* Registration Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                    <div className="p-8">
                        {/* Message Alert */}
                        {message && (
                            <div className={`${
                                messageType === 'success'
                                    ? 'bg-green-50 border-green-500'
                                    : 'bg-red-50 border-red-500'
                            } border-l-4 p-4 rounded-r-lg mb-6 animate-pulse`}>
                                <div className="flex items-start gap-3">
                                    <svg
                                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                                            messageType === 'success' ? 'text-green-600' : 'text-red-600'
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        {messageType === 'success' ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        )}
                                    </svg>
                                    <p className={`text-sm font-medium ${
                                        messageType === 'success' ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                        {message}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Registration Form */}
                        <div className="space-y-5">
                            {/* Username Input */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Username
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Choose a username"
                                        className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-sm"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="Create a password"
                                        className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-sm"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Hospital Select */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Hospital
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <select
                                        className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-sm appearance-none bg-white cursor-pointer"
                                        value={selectedHospital}
                                        onChange={(e) => setSelectedHospital(e.target.value)}
                                        disabled={isLoading}
                                    >
                                        <option value="">Select a Hospital</option>
                                        {hospitals.map((hospital) => (
                                            <option key={hospital._id} value={hospital._id}>
                                                {hospital.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Area Select */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Area
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <select
                                        className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-sm appearance-none bg-white cursor-pointer"
                                        value={selectedArea}
                                        onChange={(e) => setSelectedArea(e.target.value)}
                                        disabled={isLoading}
                                    >
                                        <option value="">Select an Area</option>
                                        {areas.map((area) => (
                                            <option key={area._id} value={area._id}>
                                                {area.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Register Button */}
                            <button
                                onClick={handleRegister}
                                disabled={isLoading || !isFormValid}
                                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 focus:ring-4 focus:ring-green-300 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Create Account
                                    </>
                                )}
                            </button>

                            {/* Login Link */}
                            <div className="text-center pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    Already have an account?{' '}
                                    <Link
                                        href="/login"
                                        className="text-green-600 hover:text-green-700 font-semibold transition-colors"
                                    >
                                        Sign In
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-sm text-gray-600">
                    <p>MHUTEMP Blood Bank Monitoring System</p>
                    <p className="text-xs text-gray-500 mt-1">Secure registration for authorized personnel</p>
                </div>
            </div>
        </div>
    );
}
