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
    console.log('🩷🩷🩷컨트롤러 : ', data.worryId, data.content, data.userId, data.commentAuthorId);

    return await prisma.comments.create({
        data: {
            worryId: data.worryId,
            content: data.content,
            userId: data.userId,
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

// 모든 답변 전체 조회
export const findLatestCommentsForUserWorries = async (userId) => {
    // 사용자가 고민자로서 참여한 모든 고민 조회
    const userWorries = await prisma.worries.findMany({
        where: {
            OR: [
                { userId }, // 고민자로서의 참여
                { comments: { some: { userId } } }, // 답변자로서의 참여
            ],
        },
        include: {
            comments: {
                where: {
                    userId: { not: userId }, // 사용자가 작성한 답변 제외
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: 1, // 각 고민에 대한 최신 답변만 선택
            },
        },
    });

    // 필요한 정보만 추출하여 배열로 반환
    const latestCommentsInfo = userWorries.map((worry) => {
        const latestComment = worry.comments[0] || null;
        return {
            worryId: worry.worryId,
            latestCommentId: latestComment ? latestComment.commentId : null,
            replyUserId: latestComment ? latestComment.userId : null,
            createdAt: latestComment ? latestComment.createdAt : null,
        };
    });

    return latestCommentsInfo.filter((commentInfo) => commentInfo.latestCommentId !== null);
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
