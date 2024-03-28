import { prisma } from '../../utils/prisma/index.js';

// 랜덤으로 답변자 선정
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
            throw new Error('회원가입된 유저가 없습니다.');
        }

        const randomIndex = Math.floor(Math.random() * users.length);
        return users[randomIndex].userId;
    } catch (error) {
        throw new Error('랜덤 답변자 선정 실패: ' + error.message);
    }
};

// 고민등록
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

// 고민 상세조회
export const getWorryDetail = async (worryId) => {
    try {
        return await prisma.worries.findUnique({
            where: {
                worryId,
            },
        });
    } catch (error) {
        throw new Error('고민 상세조회에 실패하였습니다 ' + error.message);
    }
};

// 고민 소프트 삭제
export const deleteWorryRepository = async (worryId) => {
    try {
        // 해당 걱정을 소프트 삭제
        await prisma.worries.update({
            where: { worryId },
            data: { deletedAt: new Date() }, // deletedAt 필드를 현재 시간으로 업데이트하여 소프트 삭제
        });
    } catch (error) {
        throw new Error('삭제에 실패했습니다' + error.message);
    }
};
