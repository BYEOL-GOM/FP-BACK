import { prisma } from '../src/utils/prisma/index.js';

const bannedWords = [
    'ㅅㅂ',
    '메롱',
    '바보',
    '똥개',
    '멍청이',
    '시발',
    '쉬발',
    '씨발',
    '병신',
    'ㅂㅅ ',
    '존나',
    '졸라',
    '엿먹어',
    '쌍',
    '쌍놈',
    '쌍년',
    '시발놈',
    '지랄',
    '호구',
    '똘추',
    '또라이',
    '븅신',
    '꺼져',
    '뻑큐',
    '뻐큐',
    '제기랄',
    '옘병',
    '개새끼',
    '새끼',
    '새키',
    '미친',
    'ㅁㅊ',
    '미친놈',
    '미친년',
    '개같은',
    '좆같은',
    '등신',
    '안물',
    '찌질',
    '찐따',
    '쓰레기',
    '뒤져',
    '아가리',
    '닥쳐',
    'stupid',
    'asshole',
    'bitch',
    'cock',
    'damn',
    'fuck',
    'jiral',
    'jot',
    'penis',
    'pussy',
    'shit',
    'sibal',
    'suck',
];

async function main() {
    await prisma.bannedWords.createMany({
        data: bannedWords.map((word) => ({ word })),
        skipDuplicates: true, // 중복된 데이터를 건너뛰고 insert
    });
}

main()
    .catch((e) => {
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
