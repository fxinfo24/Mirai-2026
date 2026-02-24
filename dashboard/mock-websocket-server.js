#!/usr/bin/env node

/**
 * Mock WebSocket Server for Mirai 2026 Dashboard
 * Simulates real-time data updates for testing
 * 
 * Usage: node mock-websocket-server.js
 */

const { Server } = require('socket.io');

const PORT = 8888;

console.log('🚀 Starting Mock WebSocket Server...');

const io = new Server(PORT, {
  cors: {
    origin: 'http://localhost:3002',
    methods: ['GET', 'POST']
  }
});

let activeBots = 1234;
let activeAttacks = 42;

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // Send initial data
  socket.emit('metrics:update', {
    activeBots,
    activeAttacks,
    totalBandwidth: '2.5 TB/s',
    successRate: 94.2,
    timestamp: new Date().toISOString(),
  });

  // Simulate bot events
  const botInterval = setInterval(() => {
    const event = Math.random() > 0.5 ? 'bot:connected' : 'bot:disconnected';
    const change = event === 'bot:connected' ? 1 : -1;
    activeBots = Math.max(0, activeBots + change);

    socket.emit(event, {
      type: event.split(':')[1],
      bot: {
        id: `bot-${Math.floor(Math.random() * 1000)}`,
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        type: ['Router', 'Camera', 'DVR', 'IoT Device'][Math.floor(Math.random() * 4)],
        location: ['USA', 'China', 'Russia', 'Germany', 'Japan'][Math.floor(Math.random() * 5)],
        status: event === 'bot:connected' ? 'online' : 'offline',
      },
      timestamp: new Date().toISOString(),
    });

    // Send updated metrics
    socket.emit('metrics:update', {
      activeBots,
      activeAttacks,
      totalBandwidth: `${(Math.random() * 3 + 2).toFixed(1)} TB/s`,
      successRate: parseFloat((Math.random() * 5 + 92).toFixed(1)),
      timestamp: new Date().toISOString(),
    });
  }, 5000);

  // Simulate attack events
  const attackInterval = setInterval(() => {
    const events = ['attack:started', 'attack:completed', 'attack:failed', 'attack:update'];
    const event = events[Math.floor(Math.random() * events.length)];
    
    if (event === 'attack:started') {
      activeAttacks++;
    } else if (event === 'attack:completed' || event === 'attack:failed') {
      activeAttacks = Math.max(0, activeAttacks - 1);
    }

    socket.emit(event, {
      type: event.split(':')[1],
      attack: {
        id: `atk-${Math.floor(Math.random() * 1000)}`,
        type: ['UDP Flood', 'TCP SYN', 'HTTP Flood', 'DNS Amplification'][Math.floor(Math.random() * 4)],
        target: `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.0`,
        status: event === 'attack:started' ? 'active' : event.split(':')[1],
        bandwidth: `${(Math.random() * 3 + 1).toFixed(1)} Gbps`,
      },
      timestamp: new Date().toISOString(),
    });
  }, 8000);

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    clearInterval(botInterval);
    clearInterval(attackInterval);
  });
});

console.log(`✅ Mock WebSocket Server running on port ${PORT}`);
console.log('📡 Waiting for connections from http://localhost:3002');
console.log('');
console.log('Press Ctrl+C to stop');
