import { prisma } from '../../utils/prisma/index.js';

// 좋아요된 고민의 갯수 조회하기
export const WorryCountController = async (req, res, next) => {
    try {
        const userId = res.locals.user.userId;
        // const { userId } = req.body;
        // const solvedWorriesCount = await prisma.worries.count({
        //     where: {
        //         commentAuthorId: +userId, // 이 값은 예시입니다. 실제 commentAuthorId 값으로 대체하세요.
        //         isSolved: true,
        //     },
        // });
        const user = await prisma.users.findUnique({
            where: {
                userId: +userId,
            },
            select: {
                remainingStars: true,
            },
        });
        return res.status(200).json({ remainingStars: user.remainingStars });

        // return res.status(200).json(solvedWorriesCount);
    } catch (error) {
        next(error);
    }
};
