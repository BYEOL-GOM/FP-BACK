// 클라이언트 측 코드. 프론트엔드에서 실행되면서 서버와의 실시간 통신 가능하게 함.
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// socket.on('connect', () => {
//     console.log('Connected to the server');
//     // 서버로 메시지 보내기
//     socket.emit('chat message', 'Hello from the client!');
// });

socket.on('connect', () => {
    console.log('Connected to the server');

    // 서버로 메시지 보내기
    socket.emit('chat message', 'Hello from the client!');

    // 방 입장 요청
    socket.emit('join room', 'room1');

    // 일정 시간 후 방 퇴장 시뮬레이션 (예: 10초 후 퇴장)
    setTimeout(() => {
        socket.emit('leave room', 'room1');
        console.log('Requested to leave room1');
    }, 10000);
});

socket.on('chat message', (msg) => {
    console.log('Message from server:', msg);
});

// 서버로부터의 상태 메시지 수신 대기
socket.on('server status', (message) => {
    console.log('Received from server:', message);
});

// 방 메시지 수신 리스너
socket.on('room message', (message) => {
    console.log('Room message:', message);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

export default socket;
