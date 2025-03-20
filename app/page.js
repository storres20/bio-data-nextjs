'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import WebSocket from 'isomorphic-ws';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

export default function Home() {
    const [connectedUsers, setConnectedUsers] = useState(new Map()); // Store users with latest data
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null); // Track selected user for details view
    const [selectedUserWarning, setSelectedUserWarning] = useState('');
    const ws = useRef(null);

    const checkForWarnings = (latestTemp, latestHum, latestDsTemp) => {
        let message = '';

        if (latestDsTemp > 6) {
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
        }

        return message;
    };

    useEffect(() => {
        const socket = new WebSocket('wss://bio-data-production.up.railway.app');
        ws.current = socket;

        socket.onopen = () => console.log('WebSocket connected.');

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received real-time data:', data);

            setConnectedUsers((prevUsers) => {
                const updatedUsers = new Map(prevUsers);
                const existingData = updatedUsers.get(data.username) || { temperatureHistory: [], humidityHistory: [], dsTemperatureHistory: [], datetimeHistory: [] };

                const warningMessage = checkForWarnings(data.temperature, data.humidity, data.dsTemperature);

                updatedUsers.set(data.username, {
                    ...existingData,
                    dsTemperature: data.dsTemperature,
                    temperature: data.temperature,
                    humidity: data.humidity,
                    datetime: new Date(data.datetime).toLocaleString('en-GB', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    }),
                    lastUpdate: Date.now(),
                    temperatureHistory: [...existingData.temperatureHistory.slice(-99), data.temperature],
                    humidityHistory: [...existingData.humidityHistory.slice(-99), data.humidity],
                    dsTemperatureHistory: [...existingData.dsTemperatureHistory.slice(-99), data.dsTemperature],
                    datetimeHistory: [...existingData.datetimeHistory.slice(-99), new Date(data.datetime).toLocaleString('en-GB', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })],
                    warningMessage: warningMessage, // Store the warning message per user
                });

                return updatedUsers;
            });
        };

        socket.onclose = () => console.log('WebSocket closed.');
        socket.onerror = (error) => console.error('WebSocket error:', error);

        return () => {
            if (ws.current) ws.current.close();
        };
    }, []);

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

    // Chart data for selected user
    const getChartData = (label, data, color) => ({
        labels: connectedUsers.get(selectedUser)?.datetimeHistory || [],
        datasets: [{
            label: label,
            data: data,
            fill: false,
            borderColor: color,
            tension: 0.1,
        }],
    });

    const chartOptions = {
        maintainAspectRatio: false,
        plugins: {
            tooltip: {
                callbacks: {
                    label: (tooltipItem) => {
                        const label = tooltipItem.dataset.label || '';
                        const value = tooltipItem.parsed.y;
                        return `${label}: ${value}`;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    maxRotation: 90,
                    minRotation: 45,
                },
            },
        },
    };

    return (
        <div className="flex flex-col min-h-screen p-4">
            {/* Search Bar */}
            {!selectedUser && (
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search by username..."
                        className="p-2 border border-gray-300 rounded w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                    />
                </div>
            )}

            {/* Selected User View */}
            {selectedUser ? (
                <div className="p-4 bg-white rounded shadow border border-gray-300">
                    <button
                        className="mb-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                        onClick={() => {
                            setSelectedUser(null);
                            setSelectedUserWarning('');
                        }}
                    >
                        ← Back
                    </button>

                    {/* Show warning message at the top only for selected user */}
                    {selectedUserWarning && (
                        <div className="bg-yellow-300 text-yellow-800 p-4 mb-4 rounded">
                            {selectedUserWarning}
                        </div>
                    )}

                    <h2 className="text-xl font-semibold mb-2">Details for {selectedUser}</h2>
                    <p><strong>DS18B20 Temp:</strong> {connectedUsers.get(selectedUser)?.dsTemperature} °C</p>
                    <p><strong>Temperature:</strong> {connectedUsers.get(selectedUser)?.temperature} °C</p>
                    <p><strong>Humidity:</strong> {connectedUsers.get(selectedUser)?.humidity} %</p>
                    <p><strong>Datetime:</strong> {connectedUsers.get(selectedUser)?.datetime}</p>

                    {/* Charts */}
                    <div className="grid grid-rows-3 gap-4 h-full w-full mt-4">
                        <div className="row-span-1 h-64">
                            <Line data={getChartData("DS18B20 Temperature (°C)", connectedUsers.get(selectedUser)?.dsTemperatureHistory, 'rgba(75, 192, 192, 1)')} options={chartOptions} />
                        </div>
                        <div className="row-span-1 h-64">
                            <Line data={getChartData("Temperature (°C)", connectedUsers.get(selectedUser)?.temperatureHistory, 'rgba(255, 99, 132, 1)')} options={chartOptions} />
                        </div>
                        <div className="row-span-1 h-64">
                            <Line data={getChartData("Humidity (%)", connectedUsers.get(selectedUser)?.humidityHistory, 'rgba(54, 162, 235, 1)')} options={chartOptions} />
                        </div>
                    </div>
                </div>
            ) : (
                // Connected Users as Cards
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...connectedUsers.entries()]
                        .filter(([user]) => user.toLowerCase().includes(searchQuery))
                        .map(([user, data]) => {
                            const hasWarning = data.warningMessage;
                            return (
                                <div key={user}
                                     className={`p-4 rounded shadow border cursor-pointer hover:bg-gray-100 ${hasWarning ? 'bg-yellow-300 border-yellow-500' : 'bg-white border-gray-300'}`}
                                     onClick={() => {
                                         setSelectedUser(user);
                                         setSelectedUserWarning(data.warningMessage);
                                     }}>
                                    <h2 className="text-xl font-semibold">{user}</h2>
                                    <p><strong>DS18B20 Temp:</strong> {data.dsTemperature} °C</p>
                                    <p><strong>Temperature:</strong> {data.temperature} °C</p>
                                    <p><strong>Humidity:</strong> {data.humidity} %</p>
                                    <p><strong>Datetime:</strong> {data.datetime}</p>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}
