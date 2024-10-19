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
    const [usernames, setUsernames] = useState([]);
    const [selectedUsername, setSelectedUsername] = useState('');
    const [datetimeLabels, setDatetimeLabels] = useState([]);

    const ws = useRef(null);

    // Function to fetch usernames
    const fetchUsernames = async () => {
        try {
            const response = await fetch('https://temphu.lonkansoft.pro:3002/api/v1/datas/usernames');
            const data = await response.json();
            setUsernames(data);
        } catch (error) {
            console.error('Error fetching usernames:', error);
        }
    };

    useEffect(() => {
        fetchUsernames();
    }, []);

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
        const temp = data.map(entry => entry.temperature);
        const hum = data.map(entry => entry.humidity);
        const dsTemp = data.map(entry => entry.dsTemperature);

        const timeLabels = data.map((_, index) => `T-${index + 1}`);
        const datetimeLabels = data.map(entry => new Date(entry.datetime).toLocaleString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }));

        setTemperatureData(temp);
        setHumidityData(hum);
        setDsTemperatureData(dsTemp);
        setLabels(timeLabels);
        setDatetimeLabels(datetimeLabels);

        checkForWarnings(
            temp[temp.length - 1],
            hum[hum.length - 1],
            dsTemp[dsTemp.length - 1]
        );
    }, [checkForWarnings]);

    useEffect(() => {
        if (!selectedUsername) return;

        const socket = new WebSocket('wss://temphu.lonkansoft.pro:3002');
        ws.current = socket;

        socket.onopen = () => {
            console.log('WebSocket connection established');
            socket.send(JSON.stringify({ action: 'subscribe', username: selectedUsername }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Real-time data received:', data);

            updateChartData(data);
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
    }, [selectedUsername, updateChartData]);

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
        <div className="flex flex-col items-center min-h-screen">
            <h1 className="text-2xl font-bold my-4">Real-Time Sensor Data</h1>

            <div className="mb-4">
                <label htmlFor="username" className="mr-2 font-semibold">Select Username:</label>
                <select
                    id="username"
                    value={selectedUsername}
                    onChange={(e) => setSelectedUsername(e.target.value)}
                    className="border rounded p-2"
                >
                    <option value="">-- Select Username --</option>
                    {usernames && usernames.map((username, index) => (
                        <option key={index} value={username}>
                            {username}
                        </option>
                    ))}
                </select>
            </div>

            {warningMessage && (
                <div className="bg-yellow-300 text-yellow-800 p-4 mb-4 rounded">
                    {warningMessage}
                </div>
            )}

            {selectedUsername ? (
                <div className="grid grid-rows-3 gap-4 h-full w-full max-w-4xl px-4">
                    <div className="row-span-1 h-64">
                        <Line data={temperatureChartData} options={chartOptions} />
                    </div>
                    <div className="row-span-1 h-64">
                        <Line data={humidityChartData} options={chartOptions} />
                    </div>
                    <div className="row-span-1 h-64">
                        <Line data={dsTemperatureChartData} options={chartOptions} />
                    </div>
                </div>
            ) : (
                <p className="text-gray-500">Please select a username to view the charts.</p>
            )}
        </div>
    );
}
