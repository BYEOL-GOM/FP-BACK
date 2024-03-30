import { prisma } from '../../utils/prisma/index.js';

export const findWorryById = async (worryId) => {
    return await prisma.worries.findUnique({ where: { worryId: parseInt(worryId) } });
};

export const createComment = async (data) => {
    console.log('🩷🩷🩷컨트롤러 : ', data.worryId, data.content, data.userId, data.commentAuthorId);

    return await prisma.comments.create({
        data: {
            worryId: data.worryId,
            content: data.content,
            userId: data.userId,
        },
    });
};

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

// 재고민 등록
export const findCommentAuthorById = async (commentId) => {
    try {
        const comment = await prisma.comments.findUnique({
            where: {
                commentId: commentId,
            },
            select: {
                userId: true,
            },
        });
        return comment.userId;
    } catch (error) {
        throw new Error('Failed to find comment author: ' + error.message);
    }
};

export const createReworry = async (commentId, content, userId, commentAuthorId) => {
    try {
        return await prisma.worries.create({
            data: {
                commentId,
                content,
                userId,
                commentAuthorId,
                isReWorry: true,
            },
        });
    } catch (error) {
        throw new Error('Failed to create reWorry: ' + error.message);
    }
};

// 재답변 등록
export const createRecomment = async (reworryId, content, userId) => {
    try {
        return await prisma.worries.create({
            data: {
                reworryId,
                content,
                userId,
            },
        });
    } catch (error) {
        throw new Error('Failed to create reReply: ' + error.message);
    }
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

// 고민작성자Id가 보낸 고민의 응답 전체 조회

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

        // 고민들의 ID를 추출
        const worryIds = worries.map((worry) => worry.worryId);

        // 각 고민에 대한 답변들 가져옴
        const comments = await Promise.all(
            worryIds.map(async (worryId) => {
                const commentsForWorry = await prisma.comments.findMany({
                    where: { worryId },
                    select: {
                        worryId: true,
                        commentId: true,
                        // content: true,
                    },
                });
                return commentsForWorry;
            }),
        );

        const flatComments = comments.flat();

        return flatComments;
    } catch (error) {
        throw new Error('Failed to fetch comments from repository: ' + error.message);
    }
};

// 답변 메세지 상세조회
export const getCommentDetail = async (commentId) => {
    return await prisma.comments.findFirst({
        where: { commentId },
        select: {
            worryId: true,
            commentId: true,
            content: true,
            createdAt: true,
        },
    });
};
