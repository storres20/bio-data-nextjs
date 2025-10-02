'use client';

import { useEffect, useState, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { useAuth } from '@/context/AuthContext';

export default function DataPage() {
    const { user, token, hydrated } = useAuth();
    const [connectedUsers, setConnectedUsers] = useState(new Map());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserWarning, setSelectedUserWarning] = useState('');
    const [showInfoModal, setShowInfoModal] = useState(false);
    const ws = useRef(null);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_RAILWAY;

    // 🔒 Redirect if not authenticated
    useEffect(() => {
        if (hydrated && !token) {
            window.location.href = '/login';
        }
    }, [hydrated, token]);

    const checkForWarnings = (latestTemp, latestHum, latestDsTemp) => {
        let message = '';
        if (latestDsTemp > 6) message += `⚠️ DS18B20 Temperature (${latestDsTemp}°C) exceeds maximum threshold (6°C). `;
        if (latestDsTemp < 2) message += `⚠️ DS18B20 Temperature (${latestDsTemp}°C) below minimum threshold (2°C). `;
        if (latestHum > 60) message += `⚠️ Humidity (${latestHum}%) exceeds maximum threshold (60%). `;
        if (latestHum < 30) message += `⚠️ Humidity (${latestHum}%) below minimum threshold (30%). `;
        return message;
    };

    useEffect(() => {
        if (!hydrated || !user?.username) return;

        const socket = new WebSocket('wss://bio-data-production.up.railway.app');
        ws.current = socket;

        socket.onopen = () => {
            console.log('WebSocket connected.');
            const intro = JSON.stringify({ username: user.username });
            socket.send(intro);
            console.log('📨 Username enviado:', user.username);
        };

        socket.onmessage = async (event) => {
            const data = JSON.parse(event.data);

            if (
                typeof data.temperature !== 'number' ||
                typeof data.humidity !== 'number' ||
                typeof data.dsTemperature !== 'number'
            ) {
                return;
            }

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

                const MAX_CHART_POINTS = 10;

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
                    temperatureHistory: [...existing.temperatureHistory.slice(-(MAX_CHART_POINTS - 1)), data.temperature],
                    humidityHistory: [...existing.humidityHistory.slice(-(MAX_CHART_POINTS - 1)), data.humidity],
                    dsTemperatureHistory: [...existing.dsTemperatureHistory.slice(-(MAX_CHART_POINTS - 1)), data.dsTemperature],
                    datetimeHistory: [...existing.datetimeHistory.slice(-(MAX_CHART_POINTS - 1)), new Date(data.datetime).toLocaleString('en-GB', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })],
                    warningMessage: warning,
                    device: assignedDevice,
                });

                return updated;
            });
        };

        socket.onclose = () => console.log('WebSocket closed.');
        socket.onerror = (err) => console.error('WebSocket error:', err);

        // Agregar intervalo de ping cada 30 segundos
        const pingInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'ping' }));
                console.log('📶 Ping enviado al servidor');
            }
        }, 30000);

        return () => {
            clearInterval(pingInterval);
            if (ws.current) ws.current.close();
        };
    }, [hydrated, user, apiBase]);

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
            backgroundColor: color,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
        }],
    });

    const chartOptions = {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    font: {
                        size: 12,
                        weight: '600'
                    },
                    padding: 15,
                    usePointStyle: true,
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
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
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                    font: {
                        size: 10
                    }
                },
            },
            y: {
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                ticks: {
                    font: {
                        size: 11
                    }
                }
            }
        },
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Blood Bank Monitoring System
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">Real-time temperature and humidity monitoring</p>
                        </div>
                        <button
                            onClick={() => setShowInfoModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            System Info
                        </button>
                    </div>
                </div>
            </div>

            {/* Hospital Info Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="font-semibold">{user.hospital.name}</span>
                        </div>
                        <div className="h-6 w-px bg-white/30"></div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm">{user.area.name}</span>
                        </div>
                        <div className="h-6 w-px bg-white/30"></div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm">{user.username}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Modal */}
            {showInfoModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-slideUp">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Understanding MHUTEMP Data
                            </h2>
                            <button
                                onClick={() => setShowInfoModal(false)}
                                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <img
                                src="/images/mhutemp001.png"
                                alt="MHUTEMP sensor explanation"
                                className="w-full h-auto rounded-lg mb-4 shadow-md border border-gray-200"
                            />
                            <div className="space-y-4 text-gray-700">
                                <p className="leading-relaxed">
                                    The MHUTEMP device provides critical monitoring data for biomedical equipment:
                                </p>
                                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r">
                                    <p className="font-semibold text-blue-900 mb-2">📊 Temp.OUT (Probe Temperature)</p>
                                    <p className="text-sm">Temperature measured by the external probe placed inside the equipment (e.g., blood bank refrigerator, vaccine storage).</p>
                                </div>
                                <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded-r">
                                    <p className="font-semibold text-green-900 mb-2">🌡️ Temp.IN (Ambient Temperature)</p>
                                    <p className="text-sm">Temperature of the surrounding environment where the device is located.</p>
                                </div>
                                <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r">
                                    <p className="font-semibold text-purple-900 mb-2">💧 Hum.IN (Ambient Humidity)</p>
                                    <p className="text-sm">Relative humidity percentage of the surrounding environment.</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-300 p-4 rounded-lg mt-4">
                                    <p className="font-semibold text-amber-900 mb-2">⚠️ Safe Operating Ranges</p>
                                    <ul className="text-sm space-y-1">
                                        <li>• <strong>Temp.OUT:</strong> 2°C - 6°C (Blood storage)</li>
                                        <li>• <strong>Humidity:</strong> 30% - 60%</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {selectedUser ? (
                    /* Detail View */
                    <div className="space-y-6">
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium text-gray-700"
                            onClick={() => {
                                setSelectedUser(null);
                                setSelectedUserWarning('');
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Overview
                        </button>

                        {selectedUserWarning && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-pulse">
                                <div className="flex items-start gap-3">
                                    <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div className="flex-1">
                                        <h3 className="text-red-900 font-bold mb-1">Critical Alert</h3>
                                        <p className="text-red-800 text-sm">{selectedUserWarning}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    {selectedUser}
                                </h2>
                            </div>

                            <div className="p-6">
                                {/* Current Readings */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Last Update</span>
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">{connectedUsers.get(selectedUser)?.datetime}</p>
                                    </div>

                                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-4 border border-cyan-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-cyan-700 uppercase tracking-wide">Temp.OUT</span>
                                            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                                            </svg>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-900">{connectedUsers.get(selectedUser)?.dsTemperature} <span className="text-xl">°C</span></p>
                                    </div>

                                    <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg p-4 border border-rose-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Temp.IN</span>
                                            <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                            </svg>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-900">{connectedUsers.get(selectedUser)?.temperature} <span className="text-xl">°C</span></p>
                                    </div>

                                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Hum.IN</span>
                                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                            </svg>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-900">{connectedUsers.get(selectedUser)?.humidity} <span className="text-xl">%</span></p>
                                    </div>
                                </div>

                                {/* Device Info */}
                                {connectedUsers.get(selectedUser)?.device && (
                                    <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                            </svg>
                                            Equipment Information
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div>
                                                <span className="text-gray-600 block">Device</span>
                                                <span className="font-semibold text-gray-900">{connectedUsers.get(selectedUser).device.name}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 block">Model</span>
                                                <span className="font-semibold text-gray-900">{connectedUsers.get(selectedUser).device.model}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 block">Brand</span>
                                                <span className="font-semibold text-gray-900">{connectedUsers.get(selectedUser).device.brand}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 block">Serie</span>
                                                <span className="font-semibold text-gray-900">{connectedUsers.get(selectedUser).device.serie}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Charts */}
                                <div className="space-y-6">
                                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                                            Temperature OUT (Probe) - Historical Data
                                        </h3>
                                        <div className="h-64">
                                            <Line data={getChartData("Temp.OUT (°C)", connectedUsers.get(selectedUser)?.dsTemperatureHistory, 'rgba(6, 182, 212, 1)')} options={chartOptions} />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                                            Temperature IN (Ambient) - Historical Data
                                        </h3>
                                        <div className="h-64">
                                            <Line data={getChartData("Temp.IN (°C)", connectedUsers.get(selectedUser)?.temperatureHistory, 'rgba(244, 63, 94, 1)')} options={chartOptions} />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                                            Humidity IN (Ambient) - Historical Data
                                        </h3>
                                        <div className="h-64">
                                            <Line data={getChartData("Hum.IN (%)", connectedUsers.get(selectedUser)?.humidityHistory, 'rgba(99, 102, 241, 1)')} options={chartOptions} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Overview Grid */
                    <>
                        <div className="mb-6">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by device name or username..."
                                    className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                                />
                            </div>
                        </div>

                        {/* Stats Overview */}
                        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Active Devices</h3>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{connectedUsers.size}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                                    </div>
                                    <span className="text-sm font-medium text-green-700">Live Monitoring</span>
                                </div>
                            </div>
                        </div>

                        {/* Device Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...connectedUsers.entries()]
                                .filter(([user]) => user.toLowerCase().includes(searchQuery))
                                .map(([user, data]) => {
                                    const hasWarning = data.warningMessage;
                                    const isCriticalTemp = data.dsTemperature > 6 || data.dsTemperature < 2;

                                    return (
                                        <div
                                            key={user}
                                            className={`group relative rounded-xl shadow-md border-2 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.02] overflow-hidden ${
                                                hasWarning
                                                    ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-400 hover:border-red-500'
                                                    : 'bg-white border-gray-200 hover:border-blue-400'
                                            }`}
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setSelectedUserWarning(data.warningMessage);
                                            }}
                                        >
                                            {/* Warning Badge */}
                                            {hasWarning && (
                                                <div className="absolute top-0 right-0 bg-red-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg flex items-center gap-1 shadow-lg animate-pulse">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    ALERT
                                                </div>
                                            )}

                                            {/* Card Content */}
                                            <div className="p-6">
                                                {/* Header */}
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                                            </svg>
                                                            {user}
                                                        </h3>
                                                        <p className="text-xs text-gray-600 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {data.datetime}
                                                        </p>
                                                    </div>
                                                    <div className={`w-3 h-3 rounded-full ${hasWarning ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
                                                </div>

                                                {/* Readings */}
                                                <div className="space-y-3 mb-4">
                                                    {/* Temp OUT */}
                                                    <div className={`rounded-lg p-3 ${isCriticalTemp ? 'bg-red-100 border border-red-300' : 'bg-cyan-50 border border-cyan-200'}`}>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-gray-700 uppercase">Temp.OUT</span>
                                                            <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                                                            </svg>
                                                        </div>
                                                        <p className={`text-2xl font-bold mt-1 ${isCriticalTemp ? 'text-red-700' : 'text-gray-900'}`}>
                                                            {data.dsTemperature} <span className="text-sm">°C</span>
                                                        </p>
                                                        {isCriticalTemp && (
                                                            <p className="text-xs text-red-700 mt-1 font-medium">⚠️ Out of range (2-6°C)</p>
                                                        )}
                                                    </div>

                                                    {/* Temp IN & Humidity */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                                                            <span className="text-xs font-semibold text-gray-700 uppercase block mb-1">Temp.IN</span>
                                                            <p className="text-xl font-bold text-gray-900">{data.temperature} <span className="text-xs">°C</span></p>
                                                        </div>
                                                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                                            <span className="text-xs font-semibold text-gray-700 uppercase block mb-1">Hum.IN</span>
                                                            <p className="text-xl font-bold text-gray-900">{data.humidity} <span className="text-xs">%</span></p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Device Info */}
                                                {data.device && (
                                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                        <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Equipment</h4>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div>
                                                                <span className="text-gray-500 block">Name</span>
                                                                <span className="font-semibold text-gray-900">{data.device.name}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 block">Model</span>
                                                                <span className="font-semibold text-gray-900">{data.device.model}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 block">Brand</span>
                                                                <span className="font-semibold text-gray-900">{data.device.brand}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 block">Serie</span>
                                                                <span className="font-semibold text-gray-900">{data.device.serie}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* View Details Arrow */}
                                                <div className="mt-4 flex items-center justify-end text-blue-600 font-medium text-sm group-hover:text-blue-700">
                                                    <span>View Details</span>
                                                    <svg className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Empty State */}
                        {connectedUsers.size === 0 && (
                            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                                <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                </svg>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Devices</h3>
                                <p className="text-gray-600">Waiting for sensor connections...</p>
                            </div>
                        )}

                        {/* No Search Results */}
                        {connectedUsers.size > 0 && [...connectedUsers.entries()].filter(([user]) => user.toLowerCase().includes(searchQuery)).length === 0 && (
                            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                                <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h3>
                                <p className="text-gray-600">Try adjusting your search terms</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-gray-600">
                            © 2025 MHUTEMP Blood Bank Monitoring System
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span>System Operational</span>
                            </div>
                            <div className="h-4 w-px bg-gray-300"></div>
                            <span>Cold Chain Management</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
