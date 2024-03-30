import { prisma } from '../../utils/prisma/index.js';

// 랜덤으로 답변자 지정하기
export const getRandomUser = async (userId) => {
    try {
        const users = await prisma.users.findMany({
            where: {
                NOT: {
                    userId: userId, // 작성자 제외
                },
            },
        });

        if (users.length === 0) {
            throw new Error('회원가입한 유저가 없습니다.');
        }

        const randomIndex = Math.floor(Math.random() * users.length);
        return users[randomIndex].userId;
    } catch (error) {
        throw new Error('랜덤 답변자 선정 실패: ' + error.message);
    }
};

// 고민 등록
export const createWorry = async ({ content, icon, userId, randomAuthorId }) => {
    try {
        return await prisma.worries.create({
            data: {
                content,
                icon,
                userId,
                commentAuthorId: randomAuthorId,
            },
        });
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
                userId: true,
                icon: true,
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
                commentAuthorId: true,
                content: true,
                createdAt: true,
            },
        });
    } catch (error) {
        throw new Error('고민 상세조회에 실패하였습니다 ' + error.message);
    }
};

// 오래된 고민 소프트 삭제
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
                    is: null,
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

export const softDeleteWorryById = async (worryId) => {
    try {
        // 해당 고민이 이미 삭제되었는지 확인
        const existingWorry = await prisma.worries.findUnique({
            where: { worryId },
            select: { deletedAt: true },
        });

        // 이미 삭제된 경우에는 더 이상 업데이트하지 않음
        if (existingWorry.deletedAt === null) {
            await prisma.worries.update({
                where: { worryId },
                data: { deletedAt: new Date() },
            });
            console.log(`오래된 고민 ${worryId}번 삭제 성공`);
        } else {
            console.log(`오래된 고민 ${worryId}번은 이미 삭제되었습니다.`);
        }
    } catch (error) {
        console.error(`오래된 고민 ${worryId}번 삭제 실패:`, error);
        throw error;
    }
};

// 답변하기 곤란한 고민 선택 삭제
export const deleteSelectedWorry = async (worryId) => {
    try {
        const existingWorry = await prisma.worries.findUnique({
            where: { worryId },
        });

        if (existingWorry.deletedAt !== null) {
            console.log(`오래된 고민 ${worryId}번은 이미 삭제되었습니다.`);
            return;
        }

        await prisma.worries.update({
            where: { worryId },
            data: { deletedAt: new Date() },
        });

        console.log(`오래된 고민 ${worryId}번 삭제 성공`);
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

// 재고민 & 재답변 생성
export const createComment = async ({ worryId, content, userId, parentId }) => {
    console.log('콘솔 : Creating comment with:', { worryId, content, userId, parentId });

    return await prisma.comments.create({
        data: {
            worryId: parseInt(worryId),
            content,
            userId: parseInt(userId), // 요청을 보낸 사용자의 ID
            parentId: parseInt(parentId), // 이전 답변(또는 댓글)의 ID
        },
    });
};

//  재답변 생성
// export const createComment = async ({ worryId, content, userId, parentId }) => {
//     console.log('Creating re-answer with:', { worryId, content, userId, parentId }); // 값 확인을 위한 로깅
//     return await prisma.comments.create({
//         data: {
//             worryId,
//             content,
//             userId,
//             parentId, // 재답변의 경우, 이전 댓글(재고민)의 ID가 parentId가 됩니다.
//         },
//     });
// };
