// src/utils/socketMessageHandling.js

// 소켓과 관련된 과거 메시지 정보를 삭제하는 함수
export function clearSocketPastMessages(lastMessageTimestamps, socketId) {
    // 해당 소켓 ID를 기준으로 과거 메시지 정보를 삭제합니다.
    const keysToDelete = [];
    for (const key of lastMessageTimestamps.keys()) {
        if (key.startsWith(`${socketId}:`)) {
            keysToDelete.push(key);
        }
    }
    // 삭제할 키들을 기준으로 맵에서 정보를 삭제합니다.
    keysToDelete.forEach((key) => {
        lastMessageTimestamps.delete(key);
    });
}
