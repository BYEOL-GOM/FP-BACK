import { prisma } from '../../utils/prisma/index.js';
// worryId로 해당하는 고민찾기
export const findWorryById = async (worryId) => {
    return await prisma.worries.findUnique({ where: { worryId: parseInt(worryId) } });
};

//worryId로 해당하는 답변 찾기
export const findCommentByWorryId = async (worryId) => {
    return await prisma.comments.findFirst({
        where: {
            worryId: parseInt(worryId),
        },
    });
};

// 답변 생성
export const createComment = async (data) => {
    console.log('🩷🩷🩷레포지토리 : ', data.worryId, data.content, data.userId, data.authorId);

    return await prisma.comments.create({
        data: {
            worryId: data.worryId,
            content: data.content,
            userId: data.userId,
            authorId: data.commentAuthorId,
            fontColor: data.fontColor,

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
// export const markWorryAsSolved = async (worryId, commentId, senderId, receiverId) => {
//     return prisma.worries.update({
//         where: { worryId },
//         data: {
//             isSolved: true,
//             solvingCommentId: parseInt(commentId),
//             solvedByUserId: senderId,
//             helperUserId: receiverId,
//             // commentId: solvingCommentId,
//             // senderId: solvedByUserId,
//             // receiverId: helperUserId,
//         },
//     });
// };

// 고민 작성자에 해당하는 전체 답변 조회

export const getCommentsByUserId = async (userId) => {
    try {
        // 특정 사용자가 작성한 고민들을 가져옵니다.
        const worries = await prisma.worries.findMany({
            where: { userId },
            select: { worryId: true },
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
                        createdAt: true,
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

// 답변 상세조회(답변, 재고민, 재답변)
export const getCommentDetail = async (commentId) => {
    const comment = await prisma.comments.findUnique({
        where: { commentId },
        include: {
            parent: true,
            children: true,
        },
    });

    // 필요한 정보만 추출하여 응답 객체 생성
    const response = {
        parentId: comment.parentId,
        commentId: comment.commentId,
        content: comment.content,
        createdAt: comment.createdAt,
        fontColor: comment.fontColor,
        // parent: comment.parent
        //     ? {
        //           commentId: comment.parent.commentId,
        //           content: comment.parent.content,
        //           createdAt: comment.parent.createdAt,
        //           userId: comment.parent.userId,
        //           worryId: comment.parent.worryId,
        //       }
        //     : null, // 부모 정보 나중에 필요하다면 추가
        // children 정보는 아직 필요하지 않아서 미포함
    };

    return response;
};
