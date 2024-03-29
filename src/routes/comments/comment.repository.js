import { prisma } from '../../utils/prisma/index.js';

// 댓글이 참조하는 고민 찾기
export const findWorryById = async (worryId) => {
    return await prisma.worries.findUnique({ where: { worryId: parseInt(worryId) } });
};

// 댓글 생성
export const createComment = async (data) => {
    console.log('🩷🩷🩷컨트롤러 : ', data.worryId, data.content, data.userId, data.commentAuthorId);
    return await prisma.comments.create({
        data,
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

// // 댓글 전체 조회 (고민작성자에게 도착할 댓글 목록)

export const getCommentsByUserId = async (userId) => {
    try {
        // 특정 사용자가 작성한 고민들을 가져옵니다.
        const worries = await prisma.worries.findMany({
            where: {
                userId,
            },
            select: {
                worryId: true,
            },
        });

        // 고민들의 ID를 추출합니다.
        const worryIds = worries.map((worry) => worry.worryId);

        // 각 고민에 대한 댓글들을 가져옵니다.
        const comments = await Promise.all(
            worryIds.map(async (worryId) => {
                const commentsForWorry = await prisma.comments.findMany({
                    where: { worryId },
                    select: {
                        commentId: true,
                        content: true,
                    },
                });
                return commentsForWorry;
            }),
        );

        // 모든 댓글들을 하나의 배열로 평평하게 만듭니다.
        const flatComments = comments.flat();

        return flatComments;
    } catch (error) {
        throw new Error('Failed to fetch comments from repository: ' + error.message);
    }
};
