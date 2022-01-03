import * as dotenv from 'dotenv'
import { leaveVoiceConnection, nowPlaying, pausePlaying, playSentence, pushQueue, resumePlaying, showQueue, skipPlaying } from './play'
dotenv.config()

const prefix = process.env.PREFIX!

async function play(guildId: string, query: string) {
    if (query.trim().length === 0) {
        await playSentence(guildId, 'sayagain')
    } else {
        await playSentence(guildId, 'ok')
        pushQueue(guildId, query)
    }
}

export async function execute(text: string, userId: string, guildId: string) {
    if (text.startsWith(prefix)) {
        text = text.substring(prefix.length).trim()
        console.log(text)
        if (text === '안녕' || text === '하이') {
            playSentence(guildId, 'nicetomeetyou')
        } else if (text === '나가') {
            leaveVoiceConnection(guildId)
        } else if (text === '멈춰' || text === '일시정지' || text === '일시 정지') {
            pausePlaying(guildId)
        } else if (text === '재생' || text === '플레이') {
            resumePlaying(guildId)
        } else if (text === '스킵' || text === '넘겨') {
            skipPlaying(guildId)
        } else if (text === '정보' || text === '상세') {
            nowPlaying(userId, guildId)
        } else if (text === '목록' || text === '리스트' || text === '큐') {
            showQueue(userId, guildId)
        } else if (text.endsWith('틀어')) {
            const query = text.substring(0, text.length - 1 - 2).trim()
            play(guildId, query)
        } else if (text.endsWith('틀어줘')) {
            const query = text.substring(0, text.length - 1 - 3).trim()
            play(guildId, query)
        } else if (text.endsWith('틀어 줘')) {
            const query = text.substring(0, text.length - 1 - 4).trim()
            play(guildId, query)
        } else {
            playSentence(guildId, 'sayagain')
        }
    }
}