'use client'

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

export default function Home() {
    const [temperatureData, setTemperatureData] = useState([]);
    const [humidityData, setHumidityData] = useState([]);
    const [labels, setLabels] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('https://bio-data-peach-kappa.vercel.app/api/v1/datas');
                const data = await response.json();

                const temp = data.map(entry => entry.temperature);
                const hum = data.map(entry => entry.humidity);
                const timeLabels = data.map((_, index) => `T-${data.length - index}`);

                setTemperatureData(temp);
                setHumidityData(hum);
                setLabels(timeLabels);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 500); // Fetch data every X seconds

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

    return (
        <div className="flex flex-col items-center">
            <h1 className="text-2xl font-bold mb-4">Real-Time Temperature and Humidity</h1>
            <div className="flex justify-between w-full max-w-4xl">
                <div className="w-1/2 pr-2">
                    <Line data={temperatureChartData} />
                </div>
                <div className="w-1/2 pl-2">
                    <Line data={humidityChartData} />
                </div>
            </div>
        </div>
    );
}
