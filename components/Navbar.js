'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();

    return (
        <nav className="bg-gray-800 shadow px-6 py-4 flex items-center justify-between">
            {/* Left side: Navigation Links */}
            <div className="flex items-center gap-6">
                {/*<span className="text-xl font-bold text-blue-600">Bio-Data</span>*/}

                {user && (
                    <>
                        <Link href="/data" className="text-white hover:text-blue-600">Dashboard</Link>
                        <Link href="/devices" className="text-white hover:text-blue-600">Devices</Link>
                    </>
                )}
            </div>

            {/* Right side: Auth Links */}
            <div className="flex items-center gap-4">
                {user ? (
                    <>
                        {/*<span className="text-sm text-gray-600">Logged in as <strong>{user.username}</strong></span>*/}
                        <button
                            onClick={logout}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/login" className="text-white hover:text-blue-600">Login</Link>
                        <Link href="/register" className="text-white hover:text-blue-600">Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
}
