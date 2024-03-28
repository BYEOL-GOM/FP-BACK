import { prisma } from '../../utils/prisma/index.js';

// 해당 댓글이 참조하는 고민 찾기
export const findWorryById = async (worryId) => {
    return await prisma.worries.findUnique({ where: { worryId: parseInt(worryId) } });
};

// 댓글 생성
export const createComment = async (data) => {
    console.log('🩷🩷🩷레포지토리 : ', data.worryId, data.content, data.userId, data.authorId);
    return await prisma.comments.create({
        data: {
            worryId: data.worryId,
            content: data.content,
            authorId: data.authorId,
            // 다른 필요한 필드들을 여기에 추가
        },
    });
};

// commentId에 해당하는 댓글 찾기
export const findCommentById = async (commentId) => {
    return await prisma.comments.findUnique({
        where: { commentId: parseInt(commentId) },
        include: { worry: true },
    });
};

// 고민을 해결된 상태로 변경
export const markWorryAsSolved = async (worryId, commentId, senderId, receiverId) => {
    return prisma.worries.update({
        where: { worryId },
        data: {
            isSolved: true,
            solvingCommentId: parseInt(commentId),
            solvedByUserId: senderId,
            helperUserId: receiverId,
            // commentId: solvingCommentId,
            // senderId: solvedByUserId,
            // receiverId: helperUserId,
        },
    });
};

// 대댓글 생성
export const createCommentReply = async (parentId, worryId, content, userId) => {
    return await prisma.comments.create({
        data: {
            content,
            worryId,
            parentId, // 대댓글의 경우 부모 댓글의 ID를 설정합니다.
            userId,
        },
    });
};

// 대댓글 조회
// export const comments = await prisma.comments.findMany({
//     where: {
//         worryId: 1, // 예시로 1번 고민에 대한 댓글을 조회합니다.
//         parentId: null, // 루트 댓글만 조회
//     },
//     include: {
//         children: {
//             include: {
//                 children: true, // 필요한 만큼 계층을 확장할 수 있습니다.
//             },
//         },
//     },
// });

// 댓글 수정

// 댓글 삭제
