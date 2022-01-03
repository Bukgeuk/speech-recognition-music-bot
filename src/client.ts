import { Client, Intents } from "discord.js";

let client: Client

export function createClient(): Client {
    client = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_VOICE_STATES,
            Intents.FLAGS.DIRECT_MESSAGES
        ],
        partials: [
            'CHANNEL'
        ]
    })

    return client
}

export function getClient(): Client {
    return client
}