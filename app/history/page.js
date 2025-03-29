'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

export default function HistoryPage() {
    const { user, hydrated } = useAuth();
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [data, setData] = useState([]);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    //const apiBase = process.env.NEXT_PUBLIC_API_BASE_RAILWAY;
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_LOCAL;

    // ✅ Get devices for user's hospital
    useEffect(() => {
        if (hydrated && user) {
            fetch(`${apiBase}/api/devices/hospital/${user.hospital._id}`)
                .then(res => res.json())
                .then(setDevices);
        }
    }, [hydrated, user]);

    // ✅ Get historical data for selected device and date range
    const fetchHistory = () => {
        if (!selectedDevice) return;

        const url = new URL(`${apiBase}/api/v1/datas/by-device/${selectedDevice}`);
        if (from && to) {
            url.searchParams.append('from', from);
            url.searchParams.append('to', to);
        }

        fetch(url)
            .then(res => res.json())
            .then(setData);
    };

    // ✅ Format as "29/03/2025, 06:20:51 a. m." in original UTC (not converted to Peru time)
    const formatUTCDate = (isoDatetime) => {
        const formatter = new Intl.DateTimeFormat('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'UTC'  // ✅ Force UTC, no Peru conversion
        });

        return formatter.format(new Date(isoDatetime));
    };


    // ✅ Chart generator
    const chartData = (label, field, color) => ({
        labels: data.map(d => formatUTCDate(d.datetime)),
        datasets: [
            {
                label,
                data: data.map(d => parseFloat(d[field])),
                fill: false,
                borderColor: color,
                tension: 0.1,
            },
        ],
    });

    if (!hydrated || !user) return null;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Historical Data by Device</h1>

            {/* 📅 Filters */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                    value={selectedDevice}
                    onChange={e => setSelectedDevice(e.target.value)}
                    className="border p-2 rounded"
                >
                    <option value="">-- Select Device --</option>
                    {devices.map(dev => (
                        <option key={dev._id} value={dev._id}>
                            {dev.name} ({dev.serie})
                        </option>
                    ))}
                </select>

                <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border p-2 rounded" />
                <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border p-2 rounded" />

                <button onClick={fetchHistory} className="bg-blue-500 text-white px-4 py-2 rounded">
                    Search
                </button>
            </div>

            {/* 📊 Table */}
            <div className="overflow-x-auto mb-6">
                <table className="min-w-full table-auto border">
                    <thead>
                    <tr className="bg-gray-200 text-center">
                        <th className="px-4 py-2">Datetime (UTC)</th>
                        <th className="px-4 py-2">Temperature</th>
                        <th className="px-4 py-2">Humidity</th>
                        <th className="px-4 py-2">DS Temp</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.map((d, i) => (
                        <tr key={i} className="text-center">
                            <td className="px-4 py-2">{formatUTCDate(d.datetime)}</td>
                            <td className="px-4 py-2">{d.temperature} °C</td>
                            <td className="px-4 py-2">{d.humidity} %</td>
                            <td className="px-4 py-2">{d.dsTemperature} °C</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* 📈 Charts */}
            {data.length > 0 && (
                <div className="grid grid-rows-3 gap-4">
                    <div className="h-64"><Line data={chartData("Temperature (°C)", "temperature", 'red')} /></div>
                    <div className="h-64"><Line data={chartData("Humidity (%)", "humidity", 'blue')} /></div>
                    <div className="h-64"><Line data={chartData("DS18B20 Temp (°C)", "dsTemperature", 'green')} /></div>
                </div>
            )}
        </div>
    );
}
