import { prisma } from './prisma/index.js';

global.bannedWords = [];

// 금지어 목록 로드
export async function loadBannedWords() {
    const bannedWords = await prisma.bannedWords.findMany({
        select: { word: true },
    });
    global.bannedWords = bannedWords.map((wordObj) => wordObj.word);
}
