'use client'

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

export default function Home() {
    const [temperatureData, setTemperatureData] = useState([]);
    const [humidityData, setHumidityData] = useState([]);
    const [dsTemperatureData, setDsTemperatureData] = useState([]);
    const [labels, setLabels] = useState([]);
    const [warningMessage, setWarningMessage] = useState('');
    const [usernames, setUsernames] = useState([]); // Initialize as an empty array
    const [selectedUsername, setSelectedUsername] = useState('');
    const [datetimeLabels, setDatetimeLabels] = useState([]); // Separate datetime for tooltips

    // Function to fetch usernames
    const fetchUsernames = async () => {
        try {
            const response = await fetch('https://bio-data-peach-kappa.vercel.app/api/v1/datas/usernames');
            const data = await response.json();
            setUsernames(data);
        } catch (error) {
            console.error('Error fetching usernames:', error);
        }
    };

    useEffect(() => {
        fetchUsernames();
    }, []);

    useEffect(() => {
        if (!selectedUsername) return;

        const fetchData = async () => {
            try {
                const response = await fetch(`https://bio-data-peach-kappa.vercel.app/api/v1/datas/username/${selectedUsername}`);
                const data = await response.json();

                const temp = data.map(entry => entry.temperature);
                const hum = data.map(entry => entry.humidity);
                const dsTemp = data.map(entry => entry.dsTemperature);

                // Generate "T-1", "T-2", ... labels based on the number of data points
                const timeLabels = data.map((_, index) => `T-${index + 1}`);
                // Store the datetime for use in the tooltips
                const datetimeLabels = data.map(entry => new Date(entry.datetime).toLocaleString('en-GB', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                }));

                setTemperatureData(temp);
                setHumidityData(hum);
                setDsTemperatureData(dsTemp);
                setLabels(timeLabels);
                setDatetimeLabels(datetimeLabels); // Set datetime for tooltips

                // Check for warnings
                if (temp.length > 0 && hum.length > 0 && dsTemp.length > 0) {
                    checkForWarnings(temp[temp.length - 1], hum[hum.length - 1], dsTemp[dsTemp.length - 1]);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

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

        fetchData();
        const interval = setInterval(fetchData, 500); // Fetch data every 0.5 seconds

        return () => clearInterval(interval); // Cleanup interval on component unmount
    }, [selectedUsername]);

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
                        const index = tooltipItem.dataIndex; // Get the index of the data point
                        const datetime = datetimeLabels[index]; // Get the corresponding datetime
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

    // Delete all data for a specific user
    const deleteAllData = async (user) => {
        try {
            const response = await fetch(`https://bio-data-peach-kappa.vercel.app/api/v1/datas/${user}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            alert(result.message); // Alert the user with the response message

            // Reset selected username and refetch the list of usernames
            setSelectedUsername(''); // Reset selected username to the default value
            await fetchUsernames();  // Refetch usernames to update the list
        } catch (error) {
            console.error('Failed to delete data:', error);
            alert('Failed to delete data');
        }
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

            {selectedUsername && (
                <button onClick={() => deleteAllData(selectedUsername)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mb-4">
                    Delete All Data
                </button>
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
