// // import {userService} from './user.service.js'
// import axios from 'axios';

// export const kakaoLoginController = async (req, res) => {
//     const ID = process.env.KAKAO_REST_API_KEY;
//     const redirect = process.env.KAKAO_REDIRECT_URI;
//     const CODE = req.body.code;

//     const getToken = () => {
//         try {
//             axios
//                 .post(
//                     `https://kauth.kakao.com/oauth/token?grant_type=authorization_code&client_id=${ID}&redirect_uri=${redirect}&code=${CODE}`,
//                     {},
//                     {
//                         headers: {
//                             'Content-type': 'application/x-www-form-urlencoded',
//                         },
//                     },
//                 )
//                 .then((res) => {
//                     console.log(res.data.access_token);
//                     token = res.data.access_token;
//                 });
//         } catch (error) {
//             console.error(error)
//             return res.status(405).json({ message: '카카오 인증인가코드 오류' });
//         }
//     };

//     getToken();

//     console.log(token);
//     return res.status(200).json({token});
// };
import axios from 'axios';

export const kakaoLoginController = async (req, res) => {
    const ID = process.env.KAKAO_REST_API_KEY;
    const redirect = process.env.KAKAO_REDIRECT_URI;
    const CODE = req.body.code;

    const getToken = async () => {
        try {
            const response = await axios.post(
                `https://kauth.kakao.com/oauth/token?grant_type=authorization_code&client_id=${ID}&redirect_uri=${redirect}&code=${CODE}`,
                {},
                {
                    headers: {
                        'Content-type': 'application/x-www-form-urlencoded',
                    },
                },
            );
            return response.data.access_token;
        } catch (error) {
            console.error(error)
            throw new Error('카카오 인증인가코드 오류');
        }
    };

    try {
        const token = await getToken();
        console.log(token);
        return res.status(200).json({ token });
    } catch (error) {
        return res.status(405).json({ message: error.message });
    }
};
