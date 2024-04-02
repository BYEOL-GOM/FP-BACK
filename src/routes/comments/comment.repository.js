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
export const findLatestCommentsAndWorriesForUser = async (userId) => {
    // 사용자가 고민자 혹은 답변자로 참여한 모든 고민 조회
    const userWorries = await prisma.worries.findMany({
        where: {
            OR: [
                { userId }, // 고민자로서의 참여
                { commentAuthorId: userId }, // 답변자로 매칭된 경우
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
    const latestCommentsAndWorriesInfo = userWorries.map((worry) => {
        const latestComment = worry.comments[0] || null;
        return {
            worryId: worry.worryId,
            icon: worry.icon, // 각 worry에 해당하는 icon 정보 추가
            commentId: latestComment ? latestComment.commentId : worry.worryId, // 답변이 없으면 worryId 반환
            // replyUserId: latestComment ? latestComment.userId : worry.userId, // 답변이 없으면 고민 작성자의 userId 반환
            createdAt: latestComment ? latestComment.createdAt : worry.createdAt, // 답변이 없으면 worry의 생성 시간 반환
        };
    });

    return latestCommentsAndWorriesInfo;
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

// 답장 보내기

// 부모 고민 또는 답변의 존재 여부를 확인하는 함수
export const findParentEntity = async (parentId, worryId) => {
    if (parentId) {
        return await prisma.comments.findUnique({
            where: { commentId: parentId },
            include: { worry: true },
        });
    } else {
        return await prisma.worries.findUnique({
            where: { worryId: parseInt(worryId) },
        });
    }
};

// 부모 답변에 대한 중복 답변 검증 함수
export const checkForExistingReply = async (worryId, userId, parentId = null) => {
    const condition = parentId
        ? { parentId, userId: parseInt(userId) }
        : { worryId: parseInt(worryId), userId: parseInt(userId) };
    return await prisma.comments.findFirst({
        where: condition,
    });
};

export const findLastReplyByWorryId = async (worryId) => {
    return await prisma.comments.findFirst({
        where: { worryId: parseInt(worryId) },
        orderBy: { createdAt: 'desc' },
    });
};

// 댓글(답변) 생성 함수
export const createReply = async ({ worryId, content, userId, parentId, fontColor }) => {
    return await prisma.comments.create({
        data: {
            worryId: parseInt(worryId),
            content,
            userId: parseInt(userId),
            parentId,
            fontColor,
        },
    });
};
