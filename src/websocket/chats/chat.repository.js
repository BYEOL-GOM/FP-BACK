import { prisma } from '../../utils/prisma/index.js';

// 해당 고민이 존재하는지 확인
export const findWorryById = async (worryId) => {
    return prisma.worries.findUnique({
        where: { worryId },
        select: { userId: true, commentAuthorId: true },
    });
};

// worryId로 채팅방 존재하는지 확인
export const findRoomByWorryId = async (worryId) => {
    return prisma.rooms.findUnique({
        where: { worryId: worryId },
    });
};

// 채팅방 생성
// export const createRoom = async (worryId, userId) => {
//     return const room = await prisma.rooms.create({
//         data: {
//             worryId: worryId,
//             userId: existingWorry.userId, // 고민을 등록한 사용자 ID 할당
//             commentAuthorId: existingWorry.commentAuthorId, // 댓글 작성자 ID 할당
//         },
//     });
// };

// 로그인한 유저에 해당하는 채팅방 전체 조회

// 채팅방 과거 메세지 전체 조회

// 채팅 신청 승인

// 채팅 신청 거절

// 채팅방 나가기
