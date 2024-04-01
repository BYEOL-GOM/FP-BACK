import axios from 'axios';


export const kakaoLoginController = async (req, res) => {
    try {
        const ID = process.env.KAKAO_REST_API_KEY;
        const redirect = process.env.KAKAO_REDIRECT_URI;
        const CODE = req.body.code;

        const response = await axios.post(
            `https://kauth.kakao.com/oauth/token?grant_type=authorization_code&client_id=${ID}&redirect_uri=${redirect}&code=${CODE}`,
            {},
            {
                headers: {
                    'Content-type': 'application/x-www-form-urlencoded',
                },
            },
        );

        const accessToken = response.data.access_token;

        const userInfoResponse = await axios.get(
            'https://kapi.kakao.com/v2/user/me',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        const userInfo = userInfoResponse.data;

        console.log(accessToken);
        console.log(userInfo);

        return res.status(200).json({ accessToken, userInfo });
    } catch (error) {
        console.error(error);
        return res.status(405).json({ message: '카카오 인증 및 사용자 정보 가져오기 오류' });
    }
};
