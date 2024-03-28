import express from 'express';
import { prisma } from '../../utils/prisma/index.js';

const router = express.Router();

// 회원가입 API
router.post('/sign-up', async (req, res, next) => {
    try {
        const { nickname } = req.body;
        // 비밀번호 해싱
        const user = await prisma.users.create({
            data: {
                nickname,
            },
        });
        // Use the newly created userId as authorId

        return res.status(201).json({ user });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: '서버 오류' });
    }
});

// 로그인 API
router.post('/log-in', async (req, res, next) => {
    try {
        const { nickname, password } = req.body;
        if (!nickname || !password) {
            return res.status(400).json({ message: '데이터 형식이 올바르지 않습니다' });
        }
        const user = await prisma.users.findFirst({
            where: { nickname },
        });
        if (!user) {
            return res.status(400).json({ message: '존재하지 않는 이메일입니다' });
        }
        if (!(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: '비밀번호가 올바르지 않습니다' });
        }

        // 토큰 생성
        const accessToken = jwt.sign({ id: user.id, nickname: user.nickname }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '38m',
        });
        const refreshToken = jwt.sign({ id: user.id, nickname: user.nickname }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: '1d',
        });

        // 리프레시 토큰을 쿠키에 설정 (선택 사항)
        res.cookie('refreshToken', refreshToken, { httpOnly: true });
        res.cookie('accessToken', accessToken, { httpOnly: true });

        return res.status(200).json({
            message: '로그인에 성공하였습니다',
            accessToken,
            refreshToken,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: '서버 오류' });
    }
});

export default router;
