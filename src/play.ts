import { getVoiceConnection, createAudioPlayer, NoSubscriberBehavior, createAudioResource, AudioPlayer, AudioPlayerStatus, PlayerSubscription, VoiceConnection } from "@discordjs/voice";
import ytdl from "ytdl-core";
import axios from 'axios'
import * as fs from 'fs'
import Queue from "./queue";
import { getClient } from "./client";
import { MessageEmbed } from "discord.js";

const players = new Map<string, AudioPlayer>()
const subscriptions = new Map<string, PlayerSubscription>()
const queueList = new Map<string, Queue<ytdl.videoInfo>>()

const playingVideoList = new Map<string, ytdl.videoInfo>()
const isSayingList = new Map<string, boolean>()

function subscribe(guildId: string, connection: VoiceConnection | undefined, player: AudioPlayer) {
    players.set(guildId, player)
    const subscription = connection?.subscribe(player)
    if (subscription) subscriptions.set(guildId, subscription)
}

function unsubscribe(guildId: string) {
    players.delete(guildId)
    const subscription = subscriptions.get(guildId)
    subscription?.unsubscribe()
    subscriptions.delete(guildId)
}

export function initPlayer(guildId: string, connection: VoiceConnection | undefined) {
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause
        }
    })
    subscribe(guildId, connection, player)
    queueList.set(guildId, new Queue<ytdl.videoInfo>())
    isSayingList.set(guildId, false)
}

type sentenceType = 'hi' | 'ok' | 'sayagain' | 'nicetomeetyou'
export function playSentence(guildId: string, sentence: sentenceType) {
    return new Promise<boolean>((resolve, reject) => {
        const player = players.get(guildId)!
        const status = player?.state.status

        if ((status === AudioPlayerStatus.Playing || status === AudioPlayerStatus.Paused) && !isSayingList.get(guildId)) {
            resolve(false)
            return
        }

        isSayingList.set(guildId, true)
        const resource = createAudioResource(fs.createReadStream(`./assets/${sentence}.wav`))

        player.once(AudioPlayerStatus.Idle, () => {
            isSayingList.set(guildId, false)
            resolve(true)
        })
        player.play(resource)
    })
}

export function leaveVoiceConnection(guildId: string) {
    const player = players.get(guildId)
    if (player) {
        player.stop()
        unsubscribe(guildId)
    }
    const connection = getVoiceConnection(guildId)
    connection?.destroy()
}

export function pausePlaying(guildId: string): boolean {
    const player = players.get(guildId)!
    return player.pause()
}

export function resumePlaying(guildId: string): boolean {
    const player = players.get(guildId)!
    return player.unpause()
}

export function skipPlaying(guildId: string): boolean {
    const player = players.get(guildId)!
    return player.stop()
}

export async function pushQueue(guildId: string, query: string) {
    const q = queueList.get(guildId)!
    const player = players.get(guildId)!
    const status = player.state.status
    const videoId = await search(query)
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`)
    if (q.empty() && status !== AudioPlayerStatus.Playing && status !== AudioPlayerStatus.Paused) {
        playByVideoInfo(guildId, info)
    } else {
        q.push(info)
    }
}

export function playByVideoInfo(guildId: string, videoInfo: ytdl.videoInfo) {
    return new Promise<boolean>((resolve, reject) => {
        const player = players.get(guildId)!

        const status = player.state.status
        if (status !== AudioPlayerStatus.Playing && status !== AudioPlayerStatus.Paused) {
            const resource = createAudioResource(ytdl(videoInfo.videoDetails.video_url))
            player.once(AudioPlayerStatus.Idle, () => {
                playingVideoList.delete(guildId)
                const q = queueList.get(guildId)!
                if (!q.empty()) {
                    playByVideoInfo(guildId, q.pop()!)
                }
                resolve(true)
            })
            playingVideoList.set(guildId, videoInfo)
            player.play(resource)
        } else {
            resolve(false)
        }
    })
}

function search(word: string): Promise<string> {
    return new Promise((resolve, reject) => {
        axios.get(`https://www.googleapis.com/youtube/v3/search?part=id&type=video&regionCode=KR&maxResults=1&q=${encodeURI(word)}&key=${process.env.YOUTUBE}`).then((res) => {
            resolve(res.data.items[0].id.videoId)
        }).catch((err) => {
            reject(err)
        })
    })
}

export function nowPlaying(userId: string, guildId: string) {
    getClient().users.fetch(userId).then(user => {
        const info = playingVideoList.get(guildId)!

        const embed = new MessageEmbed()
        .setColor('#FF0000')
        .setTitle(info.videoDetails.title)
        .setURL(info.videoDetails.video_url)
        .setAuthor({ name: info.videoDetails.author.name, iconURL: info.videoDetails.author.thumbnails![0].url, url: info.videoDetails.author.channel_url })
        .setDescription(info.videoDetails.description ? info.videoDetails.description : '')
        .setThumbnail(info.videoDetails.thumbnails[0].url)

        user.send({ embeds: [embed] })
    })
}

export async function showQueue(userId: string, guildId: string) {
    const client = getClient()
    const user = await client.users.fetch(userId)
    const guild = await client.guilds.fetch(guildId)
    const q = queueList.get(guildId)!

    const embed = new MessageEmbed()
    .setColor('#FF0000')
    .setTitle(`${guild.name}의 재생 목록`)
    .setThumbnail(guild.icon ? guild.icon : '')
    .setDescription(`${q.length()}곡 대기 중`)

    q.array().forEach((info, idx) => {
        embed.addField('\u200b', `**${idx + 1}**. [${info.videoDetails.title}](${info.videoDetails.video_url})`)
    })

    user.send({ embeds: [embed] })
}

export function checkPlaying(guildId: string) {
    return (players.get(guildId)?.state.status === AudioPlayerStatus.Playing)
}