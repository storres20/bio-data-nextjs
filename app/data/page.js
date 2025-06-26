'use client';

import { useEffect, useState, useRef } from 'react';
import WebSocket from 'isomorphic-ws';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

export default function DataPage() {
    const { user, token, hydrated } = useAuth();
    const [connectedUsers, setConnectedUsers] = useState(new Map());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserWarning, setSelectedUserWarning] = useState('');
    const [showInfoModal, setShowInfoModal] = useState(false);
    const ws = useRef(null);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_RAILWAY;
    //const apiBase = process.env.NEXT_PUBLIC_API_BASE_LOCAL;

    // 🔒 Redirect if not authenticated
    useEffect(() => {
        if (hydrated && !token) {
            window.location.href = '/login';
        }
    }, [hydrated, token]);

    const checkForWarnings = (latestTemp, latestHum, latestDsTemp) => {
        let message = '';
        if (latestDsTemp > 6) message += `Warning: DS18B20 Temperature (${latestDsTemp}°C) is higher than 6°C. `;
        if (latestDsTemp < 2) message += `Warning: DS18B20 Temperature (${latestDsTemp}°C) is lower than 2°C. `;
        if (latestHum > 60) message += `Warning: Humidity (${latestHum}%) is higher than 60%. `;
        if (latestHum < 30) message += `Warning: Humidity (${latestHum}%) is lower than 30%. `;
        return message;
    };

    useEffect(() => {
        const socket = new WebSocket('wss://bio-data-production.up.railway.app');
        ws.current = socket;

        socket.onopen = () => console.log('WebSocket connected.');

        socket.onmessage = async (event) => {
            const data = JSON.parse(event.data);

            let assignedDevice = null;

            try {
                const res = await fetch(`${apiBase}/api/devices/by-sensor/${data.username}`);
                if (res.ok) {
                    assignedDevice = await res.json();
                }
            } catch (err) {
                console.error('Error fetching assigned device:', err);
            }

            setConnectedUsers((prev) => {
                const updated = new Map(prev);
                const existing = updated.get(data.username) || {
                    temperatureHistory: [],
                    humidityHistory: [],
                    dsTemperatureHistory: [],
                    datetimeHistory: []
                };

                const warning = checkForWarnings(data.temperature, data.humidity, data.dsTemperature);

                updated.set(data.username, {
                    ...existing,
                    dsTemperature: data.dsTemperature,
                    temperature: data.temperature,
                    humidity: data.humidity,
                    datetime: new Date(data.datetime).toLocaleString('en-GB', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    }),
                    lastUpdate: Date.now(),
                    temperatureHistory: [...existing.temperatureHistory.slice(-99), data.temperature],
                    humidityHistory: [...existing.humidityHistory.slice(-99), data.humidity],
                    dsTemperatureHistory: [...existing.dsTemperatureHistory.slice(-99), data.dsTemperature],
                    datetimeHistory: [...existing.datetimeHistory.slice(-99), new Date(data.datetime).toLocaleString('en-GB', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })],
                    warningMessage: warning,
                    device: assignedDevice, // 👈 se incluye el dispositivo asignado
                });

                return updated;
            });
        };

        socket.onclose = () => console.log('WebSocket closed.');
        socket.onerror = (err) => console.error('WebSocket error:', err);

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [apiBase]);

    useEffect(() => {
        const interval = setInterval(() => {
            setConnectedUsers((prev) => {
                const now = Date.now();
                const active = new Map();
                prev.forEach((data, user) => {
                    if (now - data.lastUpdate < 5000) {
                        active.set(user, data);
                    }
                });
                return active;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    if (!hydrated || !user) return null;

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
            {/* Show Hospital and Area Name */}
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Welcome, {user.username}</h1>
                <p className="text-gray-700">
                    <strong>Hospital:</strong> {user?.hospital?.name || 'N/A'}<br />
                    <strong>Area:</strong> {user?.area?.name || 'N/A'}
                </p>
            </div>

            <button
                onClick={() => setShowInfoModal(true)}
                className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
            >
                ℹ️ What do these values mean?
            </button>

            {showInfoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-lg sm:max-w-2xl shadow-lg relative overflow-y-auto max-h-[90vh]">
                        <button
                            onClick={() => setShowInfoModal(false)}
                            className="absolute top-2 right-2 text-gray-500 hover:text-black text-lg"
                        >
                            ✖
                        </button>
                        <h2 className="text-xl font-bold mb-4 mt-2 sm:mt-0">Understanding the Data</h2>
                        <Image
                            src="/images/mhutemp001.png"
                            alt="MHUTEMP sensor explanation"
                            width={800}
                            height={600}
                            className="w-full h-auto rounded mb-4"
                        />

                        <p className="text-sm text-gray-700 leading-relaxed">
                            The data displayed comes from the MHUTEMP device:
                            <br /><br />
                            <strong>Temp.OUT:</strong> Temperature measured by the probe placed inside the equipment (e.g., blood bank refrigerator).<br />
                            <strong>Temp.IN:</strong> Ambient temperature measured by the DHT22 sensor.<br />
                            <strong>Hum.IN:</strong> Ambient humidity measured by the DHT22 sensor.<br /><br />
                            These readings help monitor and ensure that biomedical refrigerators and blood bank chambers remain within the appropriate ranges.
                        </p>
                    </div>
                </div>
            )}

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

                    {selectedUserWarning && (
                        <div className="bg-yellow-300 text-yellow-800 p-4 mb-4 rounded">
                            {selectedUserWarning}
                        </div>
                    )}

                    <h2 className="text-xl font-semibold mb-2">Details for {selectedUser}</h2>
                    <p><strong>Datetime:</strong> {connectedUsers.get(selectedUser)?.datetime}</p>
                    <p><strong>Temp.OUT:</strong> {connectedUsers.get(selectedUser)?.dsTemperature} °C</p>
                    <p><strong>Temp.IN:</strong> {connectedUsers.get(selectedUser)?.temperature} °C</p>
                    <p><strong>Hum.IN:</strong> {connectedUsers.get(selectedUser)?.humidity} %</p>

                    {/* Device info */}
                    {connectedUsers.get(selectedUser)?.device && (
                        <div className="mt-2 text-sm text-gray-700">
                            <p><strong>Device:</strong> {connectedUsers.get(selectedUser).device.name}</p>
                            <p><strong>Model:</strong> {connectedUsers.get(selectedUser).device.model}</p>
                            <p><strong>Brand:</strong> {connectedUsers.get(selectedUser).device.brand}</p>
                            <p><strong>Serie:</strong> {connectedUsers.get(selectedUser).device.serie}</p>
                        </div>
                    )}

                    {/* Charts */}
                    <div className="grid grid-rows-3 gap-4 h-full w-full mt-4">
                        <div className="row-span-1 h-64">
                            <Line data={getChartData("Temp.OUT (°C)", connectedUsers.get(selectedUser)?.dsTemperatureHistory, 'rgba(75, 192, 192, 1)')} options={chartOptions} />
                        </div>
                        <div className="row-span-1 h-64">
                            <Line data={getChartData("Temp.IN (°C)", connectedUsers.get(selectedUser)?.temperatureHistory, 'rgba(255, 99, 132, 1)')} options={chartOptions} />
                        </div>
                        <div className="row-span-1 h-64">
                            <Line data={getChartData("Hum.IN (%)", connectedUsers.get(selectedUser)?.humidityHistory, 'rgba(54, 162, 235, 1)')} options={chartOptions} />
                        </div>
                    </div>
                </div>
            ) : (
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
                                    <p><strong>Datetime:</strong> {data.datetime}</p>
                                    {/*<p><strong>User:</strong> {user}</p>*/}
                                    <p><strong>Temp.OUT:</strong> {data.dsTemperature} °C</p>
                                    <p><strong>Temp.IN:</strong> {data.temperature} °C</p>
                                    <p><strong>Hum.IN:</strong> {data.humidity} %</p>

                                    {data.device && (
                                        <div className="mt-2 text-sm text-gray-700">
                                            <p><strong>Device:</strong> {data.device.name}</p>
                                            <p><strong>Model:</strong> {data.device.model}</p>
                                            <p><strong>Brand:</strong> {data.device.brand}</p>
                                            <p><strong>Serie:</strong> {data.device.serie}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}
