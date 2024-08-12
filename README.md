![image](https://github.com/user-attachments/assets/0f3cbb55-82b9-4c1e-896e-c806765127a9)

# Real-Time Temperature and Humidity Monitoring System

## Overview

This project is a real-time temperature and humidity monitoring system built with a Node.js backend and a Next.js frontend. Data is collected from a DHT11 sensor connected to an ESP8266 NodeMCU and is sent to the backend server, which stores the data in a MongoDB database. The frontend retrieves and displays this data using dynamic, auto-updating graphs.

## Features

- **Real-Time Monitoring:** Temperature and humidity data are updated on the frontend every 0.5 seconds.
- **Responsive Design:** The frontend is responsive, with charts displayed side-by-side on larger screens and stacked vertically on mobile devices.
- **Data Storage:** The backend stores sensor data in a MongoDB database.
- **Secure Communication:** Data is sent from the ESP8266 to the backend using HTTPS.

## Tech Stack

### Backend (Node.js)
- **Express.js:** For handling API routes.
- **Mongoose:** For interacting with MongoDB.
- **CORS:** To allow cross-origin requests.
- **dotenv:** For managing environment variables.

### Frontend (Next.js)
- **React.js:** For building the user interface.
- **Chart.js and react-chartjs-2:** For rendering dynamic graphs.
- **Tailwind CSS:** For styling the application.

### IoT Device
- **ESP8266 NodeMCU:** For collecting temperature and humidity data and sending it to the backend server.
- **DHT11 Sensor:** For measuring temperature and humidity.
