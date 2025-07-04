'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const { login } = useAuth();

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_RAILWAY;
    //const apiBase = process.env.NEXT_PUBLIC_API_BASE_LOCAL;

    const handleLogin = async () => {
        const response = await fetch(`${apiBase}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            const data = await response.json();
            login(data.user, data.token);
            window.location.href = '/data'; // Redirect to data page
        } else {
            const errorData = await response.json();
            setErrorMessage(errorData.message);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Login</h1>

            {/* Demo account message */}
            <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-3 rounded mb-4 text-sm w-80">
                <p className="font-semibold">Demo Access</p>
                <p>You can log in using the following demo credentials:</p>
                <p>Username: <span className="font-mono">doctor03</span></p>
                <p>Password: <span className="font-mono">123456</span></p>
            </div>

            {errorMessage && <p className="text-red-500 mb-2">{errorMessage}</p>}

            <input
                type="text"
                placeholder="Username"
                className="p-2 border rounded w-64 mb-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                className="p-2 border rounded w-64 mb-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button
                onClick={handleLogin}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
            >
                Login
            </button>
        </div>
    );
}
