'use client'

import { useEffect, useState, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import WebSocket from 'isomorphic-ws';

export default function Home() {
    const [temperatureData, setTemperatureData] = useState([]);
    const [humidityData, setHumidityData] = useState([]);
    const [dsTemperatureData, setDsTemperatureData] = useState([]);
    const [labels, setLabels] = useState([]);
    const [warningMessage, setWarningMessage] = useState('');
    const [connectedUsers, setConnectedUsers] = useState([]); // Store connected users dynamically
    const [selectedUsername, setSelectedUsername] = useState('');
    const [datetimeLabels, setDatetimeLabels] = useState([]);

    const ws = useRef(null);

    const checkForWarnings = useCallback((latestTemp, latestHum, latestDsTemp) => {
        let message = '';

        if (latestTemp > 25) {
            message += `Warning: Temperature (${latestTemp}°C) is higher than 25°C. `;
        }

        if (latestDsTemp > 25) {
            message += `Warning: DS18B20 Temperature (${latestDsTemp}°C) is higher than 25°C. `;
        }

        if (latestHum > 90) {
            message += `Warning: Humidity (${latestHum}%) is higher than 90%. `;
        }

        setWarningMessage(message);
    }, []);

    const updateChartData = useCallback((data) => {
        const temp = data.temperature;
        const hum = data.humidity;
        const dsTemp = data.dsTemperature;

        const datetime = new Date(data.datetime).toLocaleString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        setTemperatureData(prevData => [...prevData.slice(-99), temp]);
        setHumidityData(prevData => [...prevData.slice(-99), hum]);
        setDsTemperatureData(prevData => [...prevData.slice(-99), dsTemp]);
        setLabels(prevLabels => [...prevLabels.slice(-99), `T-${prevLabels.length + 1}`]);
        setDatetimeLabels(prevLabels => [...prevLabels.slice(-99), datetime]);

        checkForWarnings(temp, hum, dsTemp);
    }, [checkForWarnings]);

    useEffect(() => {
        // Initialize WebSocket connection
        const socket = new WebSocket('wss://temphu.website101.xyz:3002');
        ws.current = socket;

        socket.onopen = () => {
            console.log('WebSocket connection established');
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Real-time data received:', data);

            // Dynamically update the list of connected users based on username in the data
            if (!connectedUsers.includes(data.username)) {
                setConnectedUsers(prevUsers => [...prevUsers, data.username]);
            }

            // Update charts only if the data is for the selected user
            if (data.username === selectedUsername) {
                updateChartData(data);
            }
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed');
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [selectedUsername, updateChartData, connectedUsers]);

    const handleUserSelection = (username) => {
        setSelectedUsername(username);
    };

    const temperatureChartData = {
        labels: labels,
        datasets: [
            {
                label: 'Temperature (°C)',
                data: temperatureData,
                fill: false,
                borderColor: 'rgba(255, 99, 132, 1)',
                tension: 0.1,
            },
        ],
    };

    const humidityChartData = {
        labels: labels,
        datasets: [
            {
                label: 'Humidity (%)',
                data: humidityData,
                fill: false,
                borderColor: 'rgba(54, 162, 235, 1)',
                tension: 0.1,
            },
        ],
    };

    const dsTemperatureChartData = {
        labels: labels,
        datasets: [
            {
                label: 'DS18B20 Temperature (°C)',
                data: dsTemperatureData,
                fill: false,
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1,
            },
        ],
    };

    const chartOptions = {
        maintainAspectRatio: false,
        plugins: {
            tooltip: {
                callbacks: {
                    label: (tooltipItem) => {
                        const label = tooltipItem.dataset.label || '';
                        const value = tooltipItem.parsed.y;
                        const index = tooltipItem.dataIndex;
                        const datetime = datetimeLabels[index];
                        return `${label}: ${value} at ${datetime}`;
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
        <div className="flex min-h-screen">
            {/* Left Column for Connected Users */}
            <div className="w-1/4 p-4 border-r border-gray-300">
                <h2 className="text-xl font-semibold mb-4">Connected Users</h2>
                <ul>
                    {connectedUsers.length > 0 ? (
                        connectedUsers.map((user, index) => (
                            <li
                                key={index}
                                className={`p-2 cursor-pointer ${selectedUsername === user ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
                                onClick={() => handleUserSelection(user)}
                            >
                                {user}
                            </li>
                        ))
                    ) : (
                        <li className="text-gray-500">No users connected</li>
                    )}
                </ul>
            </div>

            {/* Main Content for Real-Time Data */}
            <div className="w-3/4 p-4">
                <h1 className="text-2xl font-bold mb-4">Real-Time Sensor Data</h1>

                {warningMessage && (
                    <div className="bg-yellow-300 text-yellow-800 p-4 mb-4 rounded">
                        {warningMessage}
                    </div>
                )}

                {selectedUsername ? (
                    <>
                        {/* Card with latest data */}
                        <div className="bg-white p-4 rounded shadow mb-4">
                            <h2 className="text-xl font-semibold mb-2">Latest Data for {selectedUsername}</h2>
                            <p><strong>DS18B20 Temperature:</strong> {dsTemperatureData[dsTemperatureData.length - 1]} °C</p>
                            <p><strong>Temperature:</strong> {temperatureData[temperatureData.length - 1]} °C</p>
                            <p><strong>Humidity:</strong> {humidityData[humidityData.length - 1]} %</p>
                            <p><strong>Datetime:</strong> {datetimeLabels[datetimeLabels.length - 1]}</p>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-rows-3 gap-4 h-full w-full">
                            <div className="row-span-1 h-64">
                                <p><strong>DS18B20
                                    Temperature:</strong> {dsTemperatureData[dsTemperatureData.length - 1]} °C</p>
                                <p><strong>Datetime:</strong> {datetimeLabels[datetimeLabels.length - 1]}</p>
                                <Line data={dsTemperatureChartData} options={chartOptions}/>
                            </div>
                            <div className="row-span-1 h-64">
                                <p><strong>Temperature:</strong> {temperatureData[temperatureData.length - 1]} °C</p>
                                <p><strong>Datetime:</strong> {datetimeLabels[datetimeLabels.length - 1]}</p>
                                <Line data={temperatureChartData} options={chartOptions}/>
                            </div>
                            <div className="row-span-1 h-64">
                                <p><strong>Humidity:</strong> {humidityData[humidityData.length - 1]} %</p>
                                <p><strong>Datetime:</strong> {datetimeLabels[datetimeLabels.length - 1]}</p>
                                <Line data={humidityChartData} options={chartOptions}/>
                            </div>
                        </div>
                    </>
                ) : (
                    <p className="text-gray-500">Please select a username to view the charts.</p>
                )}
            </div>
        </div>
    );
}
