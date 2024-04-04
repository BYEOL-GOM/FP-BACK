import WebSocket from 'ws';

// WebSocket 서버 주소 설정
const serverUrl = 'ws://localhost:3000'; // 서버의 WebSocket 주소로 변경해야 합니다.

// WebSocket 클라이언트 생성
const ws = new WebSocket(serverUrl);

// 연결이 열렸을 때 이벤트 핸들러
ws.on('open', () => {
    console.log('WebSocket 연결이 열렸습니다.');

    // 방 입장 요청
    const joinRoomMessage = JSON.stringify({ type: 'join room', room: 'room1' });
    ws.send(joinRoomMessage);

    // 일정 시간 후 방 퇴장 요청 (예: 10초 후 퇴장)
    setTimeout(() => {
        const leaveRoomMessage = JSON.stringify({ type: 'leave room', room: 'room1' });
        ws.send(leaveRoomMessage);
        console.log('Requested to leave room1');
    }, 10000);
});

// 메시지 수신 이벤트 핸들러
ws.on('message', (data) => {
    console.log('Received message from server:', data);
});

// 연결이 닫혔을 때 이벤트 핸들러
ws.on('close', () => {
    console.log('WebSocket 연결이 닫혔습니다.');
});

// 에러 발생 시 이벤트 핸들러
ws.on('error', (error) => {
    console.error('WebSocket 에러:', error);
});
