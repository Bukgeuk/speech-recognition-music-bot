import { EndBehaviorType, VoiceReceiver } from '@discordjs/voice'
import * as googleSpeech from '@google-cloud/speech'
import * as prism from 'prism-media'
import * as dotenv from 'dotenv'
import * as stream from 'stream'
import * as fs from 'fs'
import { execute } from './command'
dotenv.config()

const client = new googleSpeech.SpeechClient({
    keyFilename: process.env.KEY
})

function createRecognizeStream(userId: string, guildId: string) {
    return client.streamingRecognize(
        { config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 48000,
            languageCode: 'ko-KR'
        }
    })
    .on('error', console.error)
    .on('data', response => {
        const transcription = response.results
            .map((result: { alternatives: { transcript: any }[] }) => result.alternatives[0].transcript)
            .join('\n')
        execute(transcription, userId, guildId)
    })
}

export function createListeningStream(receiver: VoiceReceiver, userId: string, guildId: string) {
    const opusStream = receiver.subscribe(userId, {
        end: {
            behavior: EndBehaviorType.AfterSilence,
            duration: 100
        }
    })

    const decorder = new prism.opus.Decoder({ rate: 48000, channels: 1, frameSize: 960 })

    const id = `${Date.now()}-${userId}`
    const path = `./recording/${id}.pcm`
    const writeStream = fs.createWriteStream(path)

    stream.pipeline(opusStream, decorder, writeStream, (err) => {
        if (err) {
            console.warn(`recording fail: ${id}`)
        } else {
            const recognizeStream = createRecognizeStream(userId, guildId)
            const readStream = fs.createReadStream(path)
            stream.pipeline(readStream, recognizeStream, (err) => {
                if (err) {
                    console.warn(`requesting fail: ${id}`)
                } else {
                    fs.unlink(path, (err) => {
                        if (err) {
                            console.log(`removing fail: ${id}`)
                        }
                    })
                }
            })
        }
    })
}