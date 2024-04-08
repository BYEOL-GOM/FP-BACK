console.log('Hello JS');
('use strict');

const socket = io();

const nickname = document.querySelector('#nickname');
const chatList = document.querySelector('.chatting-list');
const chatInput = document.querySelector('.chatting-input');
const sendButton = document.querySelector('.send-button'); // 오타 수정
const displayContainer = document.querySelector('.display-container');
// 채팅방 이름 입력 필드와 입장 버튼 찾기
const roomNameInput = document.querySelector('#roomName');
const joinRoomButton = document.querySelector('#joinRoomButton');
const leaveRoomButton = document.querySelector('#leaveRoomButton');

//임시 userId,worryId : userId 연결되면 바로 삭제
const userId = 1;
const worryId = 1;
let currentRoomId = null; // 현재 입장한 방의 ID를 저장

// 방 입장 요청
socket.emit('join room', { userId, worryId });
// 방 입장 후 roomId 업데이트
socket.on('joined room', (data) => {
    currentRoomId = data.roomId;
    console.log(`방에 입장했습니다: ${currentRoomId}`);
});

joinRoomButton.addEventListener('click', () => {
    // const roomName = roomNameInput.value.trim(); // 입력된 채팅방 이름 가져오기
    if (worryId) {
        // 서버에 'join room' 이벤트와 함께 채팅방 이름 전송
        socket.emit('join room', worryId);
        // roomId = roomName; // 방 입장 후 roomId 변수에 채팅방 이름 저장

        // console.log(`Trying to join room: ${roomName}`);
        console.log(`방에 참가하려고 합니다: ${worryId}`);
    } else {
        alert('Please enter a room name.');
    }
});

chatInput.addEventListener('keypress', (event) => {
    if (event.keyCode === 13) {
        send();
    }
});

function send() {
    if (!currentRoomId) {
        alert('방에 입장하지 않았습니다.');
        return;
    }
    const param = {
        userId: userId,
        roomId: currentRoomId, // 방 이름 또는 ID
        name: nickname.value,
        msg: chatInput.value,
    };
    socket.emit('chatting', param);
}

sendButton.addEventListener('click', send);

// 기존 채팅 메시지 수신 처리
socket.on('chatting', async (data) => {
    console.log(data);
    const { name, msg, time } = data;
    const item = new LiModel(name, msg, time);
    item.makeLi();
    displayContainer.scrollTo(0, displayContainer.scrollHeight);
});

// 채팅방 입장 메시지 처리
socket.on('room message', (message) => {
    // const { message, roomId } = data; // 가정: data 객체에 roomId가 포함되어 있음
    displayRoomMessage(message);
    // currentRoomId = roomId; // 서버로부터 받은 roomId를 저장
});

function displayRoomMessage(message) {
    const li = document.createElement('li');
    li.classList.add('room-message'); // 채팅방 메시지와 구별되는 스타일을 적용할 수 있습니다.
    li.textContent = message; // 메시지 텍스트 설정
    chatList.appendChild(li); // 채팅 목록에 메시지 추가
    displayContainer.scrollTo(0, displayContainer.scrollHeight);
}

// 퇴장 버튼 클릭 이벤트 리스너 추가
leaveRoomButton.addEventListener('click', () => {
    socket.emit('leave room');
});

function LiModel(name, msg, time) {
    this.name = name;
    this.msg = msg;
    this.time = time;

    this.makeLi = () => {
        const li = document.createElement('li');
        li.classList.add(nickname.value === this.name ? 'sent' : 'received');
        const dom = `<span class="profile">
        <span class="user">${this.name}</span>
        <img src="https://placeimg.com/50/50/any" alt="any" />
    </span>
    <span class="message">${this.msg}</span>
    <span class="time">${this.time}</span>`;
        li.innerHTML = dom;
        chatList.appendChild(li);
    };
}

console.log(socket);
