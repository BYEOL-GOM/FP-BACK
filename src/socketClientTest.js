import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Connected to the server');
    // 서버로 메시지 보내기
    socket.emit('chat message', 'Hello from the client!');
});

socket.on('chat message', (msg) => {
    console.log('Message from server:', msg);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});
