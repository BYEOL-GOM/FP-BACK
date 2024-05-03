const lastMessageTimestamps = new Map();

export function getLastMessageTimestamp(socketId, roomId) {
    const key = `${socketId}:${roomId}`;
    return lastMessageTimestamps.get(key) || new Date(0); // 정보가 없을 경우 기본값 반환
}

export function setLastMessageTimestamp(socketId, roomId, timestamp) {
    const key = `${socketId}:${roomId}`;
    lastMessageTimestamps.set(key, timestamp);
}
