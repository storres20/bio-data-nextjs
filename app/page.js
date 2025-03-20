'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import WebSocket from 'isomorphic-ws';

export default function Home() {
    const [warningMessage, setWarningMessage] = useState('');
    const [connectedUsers, setConnectedUsers] = useState(new Map()); // Store users with their latest data
    const [searchQuery, setSearchQuery] = useState('');
    const ws = useRef(null);

    const checkForWarnings = useCallback((latestTemp, latestHum, latestDsTemp) => {
        let message = '';

        /*if (latestDsTemp > 6) {
            message += `Warning: DS18B20 Temperature (${latestDsTemp}°C) is higher than 6°C. `;
        }
        if (latestDsTemp < 2) {
            message += `Warning: DS18B20 Temperature (${latestDsTemp}°C) is lower than 2°C. `;
        }
        if (latestHum > 60) {
            message += `Warning: Humidity (${latestHum}%) is higher than 60%. `;
        }
        if (latestHum < 30) {
            message += `Warning: Humidity (${latestHum}%) is lower than 30%. `;
        }*/

        setWarningMessage(message);
    }, []);

    useEffect(() => {
        const socket = new WebSocket('wss://bio-data-production.up.railway.app');
        ws.current = socket;

        socket.onopen = () => console.log('WebSocket connected.');

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received real-time data:', data);

            setConnectedUsers((prevUsers) => {
                const updatedUsers = new Map(prevUsers);
                updatedUsers.set(data.username, {
                    dsTemperature: data.dsTemperature,
                    temperature: data.temperature,
                    humidity: data.humidity,
                    datetime: new Date(data.datetime).toLocaleString('en-GB', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    }),
                    lastUpdate: Date.now(),
                });
                return updatedUsers;
            });

            checkForWarnings(data.temperature, data.humidity, data.dsTemperature);
        };

        socket.onclose = () => console.log('WebSocket closed.');
        socket.onerror = (error) => console.error('WebSocket error:', error);

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [checkForWarnings]);

    // Remove inactive users every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setConnectedUsers((prevUsers) => {
                const now = Date.now();
                const activeUsers = new Map();

                prevUsers.forEach((data, user) => {
                    if (now - data.lastUpdate < 5000) {
                        activeUsers.set(user, data);
                    }
                });

                return activeUsers;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col min-h-screen p-4">
            {/* Search Bar */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by username..."
                    className="p-2 border border-gray-300 rounded w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                />
            </div>

            {/* Warning Message */}
            {warningMessage && (
                <div className="bg-yellow-300 text-yellow-800 p-4 mb-4 rounded">
                    {warningMessage}
                </div>
            )}

            {/* Connected Users as Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...connectedUsers.entries()]
                    .filter(([user]) => user.toLowerCase().includes(searchQuery))
                    .map(([user, data]) => (
                        <div key={user} className="bg-white p-4 rounded shadow border border-gray-300">
                            <h2 className="text-xl font-semibold">{user}</h2>
                            <p><strong>DS18B20 Temp:</strong> {data.dsTemperature} °C</p>
                            <p><strong>Temperature:</strong> {data.temperature} °C</p>
                            <p><strong>Humidity:</strong> {data.humidity} %</p>
                            <p><strong>Datetime:</strong> {data.datetime}</p>
                        </div>
                    ))}
            </div>
        </div>
    );
}
