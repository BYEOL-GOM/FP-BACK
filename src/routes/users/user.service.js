// import axios from "axios";
// import  jwt from 'jsonwebtoken';
// import  {userRepository}  from './user.repository.js'

// const signInKakao = async (kakaoToken) => {
//     const result = await axios.get("https://kapi.kakao.com/v2/user/me", {
//         headers: {
//             Authorization: `Bearer ${kakaoToken}`,
//         },
//     });
//     const {data} = result
//     const name = data.properties.nickname;
//     const email = data.kakao_account.email;
//     const kakaoId = data.id;

//     if (!name || !email || !kakaoId) throw new error("가입정보가 부족합니다.", 400);

//     const user = await userRepository.getUserById(kakaoId);

//     if (!user) {
//         await userRepository.signUp(email, name, kakaoId);
//     }

//     return jwt.sign({ kakao_id: user[0].kakao_id }, process.env.TOKKENSECRET);

// };

// export default signInKakao
