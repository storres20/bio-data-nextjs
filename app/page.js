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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('https://bio-data-peach-kappa.vercel.app/api/v1/datas');
                const data = await response.json();

                const temp = data.map(entry => entry.temperature);
                const hum = data.map(entry => entry.humidity);
                const dsTemp = data.map(entry => entry.dsTemperature);
                const timeLabels = data.map((_, index) => `T-${data.length - index}`);

                setTemperatureData(temp);
                setHumidityData(hum);
                setDsTemperatureData(dsTemp);
                setLabels(timeLabels);

                // Check for warnings
                checkForWarnings(temp[temp.length - 1], hum[hum.length - 1], dsTemp[dsTemp.length - 1]);
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
    }, []);

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
            const response = await fetch('https://bio-data-peach-kappa.vercel.app/api/v1/datas', {
                method: 'DELETE'
            });
            const result = await response.json();
            alert(result.message); // Alert the user with the response message
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

            <button onClick={deleteAllData}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                Delete All Data
            </button>

            <div className="grid grid-rows-3 gap-4 h-full w-full max-w-4xl px-4">
                <div className="row-span-1 h-full">
                    <Line data={temperatureChartData} options={{maintainAspectRatio: false}}/>
                </div>
                <div className="row-span-1 h-full">
                    <Line data={humidityChartData} options={{maintainAspectRatio: false}}/>
                </div>
                <div className="row-span-1 h-full">
                    <Line data={dsTemperatureChartData} options={{maintainAspectRatio: false}}/>
                </div>
            </div>
        </div>
    );
}
