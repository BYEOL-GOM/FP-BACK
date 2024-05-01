// src/utils/socketMessageHandling.js
// 소켓과 관련된 과거 메시지 정보를 삭제하는 함수
export function clearSocketPastMessages(socketId, lastMessageTimestamps) {
    if (!lastMessageTimestamps || !(lastMessageTimestamps instanceof Map)) {
        console.error('Invalid lastMessageTimestamps: Must be a non-null Map instance.');
        return;
    }
    if (!socketId) {
        console.error('Invalid socketId: Must be a non-empty string.');
        return;
    }

    const keysToDelete = [];
    for (const key of lastMessageTimestamps.keys()) {
        if (key.startsWith(`${socketId}:`)) {
            // if (key.startsWith(socketId)) { // socketId로 시작하는 모든 키를 찾습니다.
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach((key) => {
        lastMessageTimestamps.delete(key);
    });
}
