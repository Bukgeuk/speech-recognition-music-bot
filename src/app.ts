import { DiscordGatewayAdapterCreator, getVoiceConnection, joinVoiceChannel } from '@discordjs/voice'
import { MessageEmbed } from 'discord.js'
import * as dotenv from 'dotenv'

import { createClient } from './client'
import { checkPlaying, initPlayer, playSentence } from './play'
import { createListeningStream } from './voice'

dotenv.config()

const client = createClient()

client.on('ready', () => {
    console.log(`Logged in as ${client.user!.tag}`)
})

client.on('messageCreate', msg => {
    if (msg.author.bot) return
    if ((msg.mentions.members ? msg.mentions.members : msg.mentions.users)!.has(client.user!.id)) {
        if (msg.guild === null) {
            const embed = new MessageEmbed()
            .setColor('#1E90FF')
            .setTitle('도움말')
            .setThumbnail(client.user?.avatar ? client.user?.avatar : '')
            .setDescription(`안녕! 나는 음성인식 음악봇이야 /ᐠ｡ꞈ｡ᐟ\\\n아래 명령어를 말할 때 앞에 '${process.env.PREFIX}'라는 말을 붙여주면 돼\n나를 부르려면 서버에서 멘션을 해줘!`)
            .addFields(
                { name: '통화방에서 내보내기', value: '나가' },
                { name: '일시정지', value: '멈춰/일시정지' },
                { name: '재생', value: '재생' },
                { name: '스킵', value: '스킵/넘겨' },
                { name: '재생중인 노래 정보', value: '정보' },
                { name: '재생 목록', value: '큐/목록/리스트' },
                { name: '노래 재생(목록에 추가)', value: '[검색어] 틀어/틀어줘'}
            )
            msg.author.send({ embeds: [embed] })
        } else {
            const voiceChannel = msg.member!.voice.channel
            if (!voiceChannel) {
                msg.reply("먼저 음성 채널에 들어가줘")
                return
            }
            if (voiceChannel.id === voiceChannel.guild.me?.voice.channelId) {
                msg.reply("이미 들어가 있어")
                return
            }
            const permissions = voiceChannel.permissionsFor(client.user!)!
            if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
                msg.reply("권한이 없어 ㅡㅡ")
                return
            }
            if (voiceChannel.members.keys.length > 0 && checkPlaying(voiceChannel.guildId)) {
                msg.reply("다른 통화방에서 일하고 있어 ㅠㅠ")
                return
            }
            try {
                const connection = getVoiceConnection(msg.guildId!)
                if (connection) connection.destroy()
                const newConnection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: voiceChannel.guildId,
                    selfDeaf: false,
                    adapterCreator: voiceChannel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator
                })

                initPlayer(voiceChannel.guildId, newConnection)

                const receiver = newConnection?.receiver

                receiver?.speaking.addListener('start', (userId) => {
                    createListeningStream(receiver, userId, voiceChannel.guildId)
                })

                playSentence(voiceChannel.guildId, 'hi')
            } catch (err) {
                console.log(err)
            }
        }
    }
})

client.login(process.env.TOKEN).then(() => {
    client.user?.setActivity('DM에서 날 멘션해봐!')
})