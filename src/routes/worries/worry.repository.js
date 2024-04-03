import { prisma } from '../../utils/prisma/index.js';

// 답변자 랜덤으로 선택
export const getRandomUser = async (userId) => {
    try {
        // 답변 가능한 사용자 조회 (remainingAnswers가 0보다 큰 사용자)
        const potentialResponders = await prisma.users.findMany({
            where: {
                userId: { not: userId },
                remainingAnswers: { gt: 0 },
            },
        });

        // 사용 가능한 답변자가 없는 경우 에러 처리
        if (potentialResponders.length === 0) {
            throw new Error('모든 답변자가 답장을 작성중입니다');
        }
        // 랜덤 답변자 선택
        const randomIndex = Math.floor(Math.random() * potentialResponders.length);
        return potentialResponders[randomIndex].userId;
    } catch (error) {
        throw new Error(error.message);
    }
};

//userId 로 user 찾기
export const getUserById = async (userId) => {
    return await prisma.users.findUnique({ where: { userId } });
};
// 고민등록시, 해당 userId 의 remainingWorries -1 하기
export const decreaseRemainingWorries = async (userId) => {
    await prisma.users.update({
        where: { userId },
        data: { remainingWorries: { decrement: 1 } },
    });
};

// 답변자의 remainingAnswers -1하기
export const decreaseRemainingAnswers = async (userId) => {
    await prisma.users.update({
        where: { userId },
        data: { remainingAnswers: { decrement: 1 } },
    });
};

// 고민 등록
export const createWorry = async ({ content, icon, userId, randomAuthorId, fontColor }) => {
    try {
        const createdWorry = await prisma.worries.create({
            data: {
                content,
                icon,
                userId,
                commentAuthorId: randomAuthorId,
                fontColor,
            },
            select: {
                worryId: true,
                userId: true,
                commentAuthorId: true,
                content: true,
                createdAt: true,
                icon: true,
                fontColor: true,
            },
        });
        return createdWorry;
    } catch (error) {
        throw new Error('고민등록에 실패하였습니다. ' + error.message);
    }
};

// 고민답변자Id기준으로 보는 고민 전체 조회
export const getWorriesByCommentAuthorId = async (userId) => {
    try {
        const worries = await prisma.worries.findMany({
            where: {
                commentAuthorId: userId,
                deletedAt: null,
            },
            select: {
                worryId: true,
                // userId: true,
                icon: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return worries;
    } catch (error) {
        throw new Error('Error retrieving worries by author ID: ' + error.message);
    }
};

// 고민 상세조회
export const getWorryDetail = async (worryId) => {
    try {
        return await prisma.worries.findUnique({
            where: {
                worryId,
                deletedAt: null,
            },
            select: {
                worryId: true,
                userId: true,
                createdAt: true,
                content: true,
                // icon: true,
                fontColor: true,
                commentAuthorId: true,
            },
        });
    } catch (error) {
        throw new Error('고민 상세조회에 실패하였습니다 ' + error.message);
    }
};

// 생성된지 24시간 이상이 된 고민중 답변이 없는 고민 찾기
export const findOldWorriesWithoutComments = async () => {
    try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);

        const worries = await prisma.worries.findMany({
            where: {
                createdAt: {
                    lt: twentyFourHoursAgo,
                },
                comments: {
                    none: {},
                },
                deletedAt: null, // deletedAt이 null인 레코드만 선택
            },
            select: {
                worryId: true,
            },
        });

        return worries;
    } catch (error) {
        console.error('댓글이 없는 오래된 고민 찾기 실패했습니다', error);
        throw error;
    }
};

// 오래된 고민 소프트 삭제
export const softDeleteWorryById = async (worryId) => {
    try {
        const existingWorry = await prisma.worries.findUnique({
            where: { worryId },
            select: { deletedAt: true, userId: true, commentAuthorId: true },
        });

        // 이미 삭제된 경우에는 더 이상 업데이트하지 않음
        if (existingWorry.deletedAt === null) {
            await prisma.worries.update({
                where: { worryId },
                data: { deletedAt: new Date() },
            });
            console.log(`오래된 고민 ${worryId}번 삭제 성공`);

            // 사용자의 remainingWorries +1
            await prisma.users.update({
                where: { userId: existingWorry.userId },
                data: { remainingWorries: { increment: 1 } },
            });

            // 답변자의 remainingAnswers +1
            if (existingWorry.commentAuthorId) {
                await prisma.users.update({
                    where: { userId: existingWorry.commentAuthorId },
                    data: { remainingAnswers: { increment: 1 } },
                });
            }
        } else {
            console.log(`오래된 고민 ${worryId}번은 이미 삭제되었습니다.`);
        }
    } catch (error) {
        console.error(`오래된 고민 ${worryId}번 삭제 실패:`, error);
        throw error;
    }
};

// worryId 에 해당하는 답변자 가져오기
export const getCommentAuthorId = async (worryId) => {
    const worry = await prisma.worries.findUnique({
        where: { worryId },
        select: { commentAuthorId: true },
    });
    return worry ? worry.commentAuthorId : null;
};

// 답변하기 곤란한 고민 선택 삭제
export const deleteSelectedWorry = async (worryId) => {
    try {
        const existingWorry = await prisma.worries.findUnique({
            where: { worryId },
        });

        if (existingWorry.deletedAt !== null) {
            throw new Error('이미 삭제되었습니다');
        }

        // 삭제된 고민의 정보
        const worryUpdateResult = await prisma.worries.update({
            where: { worryId },
            data: { deletedAt: new Date() },
        });

        // 사용자의 remainingWorries +1 증가
        await prisma.users.update({
            where: { userId: worryUpdateResult.userId },
            data: { remainingWorries: { increment: 1 } },
        });

        // 답변자의 remainingAnswers +1 증가
        await prisma.users.update({
            where: { userId: worryUpdateResult.commentAuthorId },
            data: { remainingAnswers: { increment: 1 } },
        });
    } catch (error) {
        throw error;
    }
};

// // 재고민 & 재답변 생성
// export const createComment = async ({ worryId, content, userId, parentId, fontColor }) => {
//     return await prisma.comments.create({
//         data: {
//             worryId: parseInt(worryId),
//             content,
//             userId,
//             parentId,
//             fontColor,
//         },
//     });
// };
