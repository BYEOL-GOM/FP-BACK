import Joi from 'joi';

// 채팅방 생성 스키마 정의
export const createChatRoomSchema = Joi.object({
    worryId: Joi.number().integer().required(),
    // userId: Joi.number().integer(), // * 로컬에서 테스트 할때(=userId 바디로 넣을때) 이부분 살려서 하지 않으면 '데이터 형식 불일치 오류'가 납니다 :)
});
