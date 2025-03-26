'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            window.location.href = '/data';
        } else {
            window.location.href = '/login';
        }
    }, [user]);

    return null; // Prevent flicker
}
