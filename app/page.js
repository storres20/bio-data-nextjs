'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import 'chartjs-adapter-date-fns'; // For datetime support in Chart.js
import { es } from 'date-fns/locale'; // For locale

export default function Home() {
    const [users, setUsers] = useState([]); // List of users
    const [selectedUser, setSelectedUser] = useState(null); // Currently selected user
    const [temperatureData, setTemperatureData] = useState([]);
    const [humidityData, setHumidityData] = useState([]);
    const [dsTemperatureData, setDsTemperatureData] = useState([]);
    const [labels, setLabels] = useState([]);
    const [warningMessage, setWarningMessage] = useState('');
    const [intervalId, setIntervalId] = useState(null);

    useEffect(() => {
        // Fetch list of users and their username
        const fetchUsers = async () => {
            try {
                const response = await fetch('https://bio-data-peach-kappa.vercel.app/api/v1/datas/usernames');
                const data = await response.json();
                setUsers(data); // Assuming your backend sends an array of users with 'username'
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, []);

    useEffect(() => {
        if (intervalId) clearInterval(intervalId); // Clear any previous interval to avoid conflicts
        if (selectedUser) {
            const fetchData = async () => {
                try {
                    const response = await fetch(`https://bio-data-peach-kappa.vercel.app/api/v1/datas?user=${selectedUser}`);
                    const data = await response.json();

                    const temp = data.map(entry => entry.temperature);
                    const hum = data.map(entry => entry.humidity);
                    const dsTemp = data.map(entry => entry.dsTemperature);
                    const timeLabels = data.map(entry => new Date(entry.datetime)); // Use 'datetime' field for labels

                    setTemperatureData(temp);
                    setHumidityData(hum);
                    setDsTemperatureData(dsTemp);
                    setLabels(timeLabels);

                    checkForWarnings(temp[temp.length - 1], hum[hum.length - 1], dsTemp[dsTemp.length - 1]);
                } catch (error) {
                    console.error('Error fetching data:', error);
                }
            };

            // Initial data fetch and set up polling for real-time updates
            fetchData();
            const newIntervalId = setInterval(fetchData, 5000); // Fetch every 5 seconds
            setIntervalId(newIntervalId);

            return () => clearInterval(newIntervalId); // Clear the interval when unmounting or switching users
        }
    }, [selectedUser]);

    const checkForWarnings = (latestTemp, latestHum, latestDsTemp) => {
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

    const deleteAllData = async () => {
        try {
            const response = await fetch(`https://bio-data-peach-kappa.vercel.app/api/v1/datas/${selectedUser}`, {
                method: 'DELETE',
            });
            const result = await response.json();
            alert(result.message); // Alert the user with the response message
            setTemperatureData([]); // Clear charts after deletion
            setHumidityData([]);
            setDsTemperatureData([]);
            setLabels([]);
        } catch (error) {
            console.error('Failed to delete data:', error);
            alert('Failed to delete data');
        }
    };

    return (
        <div className="flex flex-col items-center h-screen">
            <h1 className="text-2xl font-bold my-4">Real-Time Sensor Data</h1>

            {warningMessage && (
                <div className="bg-yellow-300 text-yellow-800 p-4 mb-4 rounded">
                    {warningMessage}
                </div>
            )}

            {/* User Selection */}
            {!selectedUser && (
                <div className="mb-4">
                    <h2 className="text-xl font-bold mb-2">Select a User</h2>
                    <ul>
                        {users.map((username) => (
                            <li key={username} className="flex justify-between mb-2">
                                <span>{username}</span>
                                <button
                                    onClick={() => setSelectedUser(username)}
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
                                >
                                    View
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Charts */}
            {selectedUser && (
                <div className="w-full">
                    <div className="flex justify-center mb-4">
                        <button
                            onClick={() => setSelectedUser(null)}
                            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded mx-2"
                        >
                            Back to User Selection
                        </button>

                        <button onClick={deleteAllData}
                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mx-2">
                            Delete All Data
                        </button>
                    </div>

                    <div className="grid grid-rows-3 gap-4 h-full w-full max-w-full px-4">
                        <div className="row-span-1 h-[400px] w-full">
                            <Line
                                data={temperatureChartData}
                                options={{
                                    maintainAspectRatio: false,
                                    responsive: true,
                                    scales: {
                                        x: {
                                            type: 'time',
                                            time: {
                                                unit: 'minute',
                                                tooltipFormat: 'dd/MM/yyyy HH:mm:ss', // Tooltip format
                                                displayFormats: {
                                                    minute: 'dd/MM/yyyy HH:mm:ss', // X-axis label format
                                                },
                                            },
                                            adapters: {
                                                date: {
                                                    locale: es, // Set to Spanish locale
                                                    timeZone: 'America/Lima', // Peruvian timezone
                                                },
                                            },
                                            ticks: {
                                                maxRotation: 0,
                                            },
                                        },
                                    },
                                }}
                            />
                        </div>
                        <div className="row-span-1 h-[400px] w-full">
                            <Line
                                data={humidityChartData}
                                options={{
                                    maintainAspectRatio: false,
                                    responsive: true,
                                    scales: {
                                        x: {
                                            type: 'time',
                                            time: {
                                                unit: 'minute',
                                                tooltipFormat: 'dd/MM/yyyy HH:mm:ss',
                                                displayFormats: {
                                                    minute: 'dd/MM/yyyy HH:mm:ss',
                                                },
                                            },
                                            adapters: {
                                                date: {
                                                    locale: es,
                                                    timeZone: 'America/Lima',
                                                },
                                            },
                                            ticks: {
                                                maxRotation: 0,
                                            },
                                        },
                                    },
                                }}
                            />
                        </div>
                        <div className="row-span-1 h-[400px] w-full">
                            <Line
                                data={dsTemperatureChartData}
                                options={{
                                    maintainAspectRatio: false,
                                    responsive: true,
                                    scales: {
                                        x: {
                                            type: 'time',
                                            time: {
                                                unit: 'minute',
                                                tooltipFormat: 'dd/MM/yyyy HH:mm:ss',
                                                displayFormats: {
                                                    minute: 'dd/MM/yyyy HH:mm:ss',
                                                },
                                            },
                                            adapters: {
                                                date: {
                                                    locale: es,
                                                    timeZone: 'America/Lima',
                                                },
                                            },
                                            ticks: {
                                                maxRotation: 0,
                                            },
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
