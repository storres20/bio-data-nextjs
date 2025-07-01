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

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_RAILWAY;
    //const apiBase = process.env.NEXT_PUBLIC_API_BASE_LOCAL;

    useEffect(() => {
        if (hydrated && user) {
            fetch(`${apiBase}/api/devices/hospital/${user.hospital._id}`)
                .then(res => res.json())
                .then(setDevices);
        }
    }, [hydrated, user, apiBase]);

    const fetchHistory = () => {
        if (!selectedDevice) return;

        const url = new URL(`${apiBase}/api/v1/datas/by-device/${selectedDevice}`);

        if (from) {
            const fromISO = new Date(`${from}T00:00:00`).toISOString(); // UTC ISO
            url.searchParams.append('from', fromISO);
        }

        if (to) {
            const toISO = new Date(`${to}T23:59:59`).toISOString(); // UTC ISO
            url.searchParams.append('to', toISO);
        }

        fetch(url)
            .then(async (res) => {
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Error ${res.status}: ${text}`);
                }
                return res.json();
            })
            .then(setData)
            .catch(err => {
                console.error('❌ Fetch history error:', err.message);
                setData([]);
            });
    };

    const formatUTCDate = (isoDatetime) => {
        const formatter = new Intl.DateTimeFormat('es-PE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true, timeZone: 'America/Lima' // ✅ hora de Perú
        });
        return formatter.format(new Date(isoDatetime));
    };

    const generatePDF = () => {
        const url = `${apiBase}/api/report/pdf/device/${selectedDevice}?from=${from}&to=${to}`;
        window.open(url, '_blank');
    };

    const groupByDay = (dataset) => {
        return dataset.reduce((acc, item) => {
            // Convertimos a hora de Perú antes de extraer la fecha
            const localDate = new Date(item.datetime).toLocaleDateString('es-PE', {
                timeZone: 'America/Lima',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });

            if (!acc[localDate]) acc[localDate] = [];
            acc[localDate].push(item);
            return acc;
        }, {});
    };

    if (!hydrated || !user) return null;

    const groupedData = groupByDay(data);

    const chartData = (label, field, color, dayData) => ({
        labels: dayData.map(d => formatUTCDate(d.datetime)),
        datasets: [{
            label,
            data: dayData.map(d => parseFloat(d[field])),
            fill: false,
            borderColor: color,
            tension: 0.1,
        }],
    });

    const selectedDeviceInfo = devices.find(dev => dev._id === selectedDevice);

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Historical Data by Device</h1>

            {/* 📅 Filtros */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)} className="border p-2 rounded">
                    <option value="">-- Select Device --</option>
                    {devices.map(dev => (
                        <option key={dev._id} value={dev._id}>{dev.name} ({dev.serie})</option>
                    ))}
                </select>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border p-2 rounded" />
                <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border p-2 rounded" />
                <button onClick={fetchHistory} className="bg-blue-500 text-white px-4 py-2 rounded">Search</button>
            </div>

            {data.length > 0 && selectedDeviceInfo && (
                <div>
                    <button onClick={generatePDF} className="mb-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                        Download PDF Report
                    </button>

                    <div className="mb-4">
                        <p><strong>Hospital: </strong>{user.hospital.name}</p>
                        <p><strong>Area: </strong>{user.area.name}</p>
                        <p><strong>Device: </strong>{selectedDeviceInfo.name}</p>
                        <p><strong>Model: </strong>{selectedDeviceInfo.model}</p>
                        <p><strong>Brand: </strong>{selectedDeviceInfo.brand}</p>
                        <p><strong>Serie: </strong>{selectedDeviceInfo.serie}</p>
                    </div>
                </div>
            )}

            {/* 🧾 Tabla */}
            <div className="overflow-x-auto mb-6">
                <table className="min-w-full table-auto border">
                    <thead>
                    <tr className="bg-gray-200 text-center">
                        <th className="px-4 py-2">Datetime PERU (UTC-5)</th>
                        <th className="px-4 py-2">Temp.OUT</th>
                        <th className="px-4 py-2">Temp.IN</th>
                        <th className="px-4 py-2">Hum.IN</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.map((d, i) => (
                        <tr key={i} className="text-center">
                            <td className="px-4 py-2">{formatUTCDate(d.datetime)}</td>
                            <td className="px-4 py-2">{d.dsTemperature} °C</td>
                            <td className="px-4 py-2">{d.temperature} °C</td>
                            <td className="px-4 py-2">{d.humidity} %</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* 📊 Gráficas por día */}
            {Object.entries(groupedData).map(([day, dayData]) => (
                <div key={day} className="mb-10 bg-white p-4 rounded shadow">
                    <h2 className="text-lg font-bold mb-4">Gráficas del {day}</h2>

                    <div className="w-full">
                        {/* DS Temp Chart */}
                        <div className="w-full h-[300px] md:h-[400px]">
                            <Line data={chartData("Temp.OUT (°C)", "dsTemperature", 'green', dayData)} />
                        </div>

                        {/* Temperature Chart */}
                        <div className="w-full h-[300px] md:h-[400px]">
                            <Line data={chartData("Temp.IN (°C)", "temperature", 'red', dayData)} />
                        </div>

                        {/* Humidity Chart */}
                        <div className="w-full h-[300px] md:h-[400px]">
                            <Line data={chartData("Hum.IN (%)", "humidity", 'blue', dayData)} />
                        </div>
                    </div>
                </div>
            ))}

        </div>
    );
}
