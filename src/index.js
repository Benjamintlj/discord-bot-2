require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js')
const ytdl = require('ytdl-core');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus, generateDependencyReport
} = require('@discordjs/voice');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildVoiceStates,
    ],
});

client.on('ready', (c) => {
    console.log(`${c.user.tag} is ready ✅`);
})

const playMusic = async (connection, youtubeUrl, startFrom = 0, maxAttempts = 3) => {

    const player = createAudioPlayer();
    let attempts = 0;
    let startTimeIrl = Date.now();

    const attemptToPlayMusic = async () => {
        return new Promise((resolve, reject) => {
            try {
                const stream = ytdl(youtubeUrl, { filter: 'audioonly' });

                stream.on("error", error => {
                    console.error("Stream error:", error);

                    if (attempts < maxAttempts) {
                        attempts++;
                        console.log(`Retrying... (${attempts}/${maxAttempts})`);
                        resolve(attemptToPlayMusic());
                    } else {
                        reject(error);
                    }
                });

                const resource = createAudioResource(stream);
                player.play(resource);
                connection.subscribe(player);

                player.on(AudioPlayerStatus.Idle, () => {
                    resolve();
                });

                player.on("error", (error) => {
                    console.error(`Player error: ${error}`);

                    if (attempts < maxAttempts) {
                        attempts++;
                        console.log(`Retrying... (${attempts}/${maxAttempts})`);
                        resolve(attemptToPlayMusic());
                    } else {
                        reject(error);
                    }
                });
            } catch (error) {
                console.error(`Failed to play music: ${error}`);
                reject(error);
            }
        });
    };

    try {
        await attemptToPlayMusic();
    } catch (error) {
        console.error(`Failed to play music: ${error}`);
    }
};

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.member && newState.guild) {
        const guild = client.guilds.cache.get(newState.guild.id);

        if (!oldState.channelId && newState.channelId && newState.member.id === guild.ownerId) {
            const connection = joinVoiceChannel({
                channelId: newState.channelId,
                guildId: newState.guild.id,
                adapterCreator: newState.guild.voiceAdapterCreator,
            });

            const youtubeUrl = "https://www.youtube.com/watch?v=svjMiqVeiG8";

            await playMusic(connection, youtubeUrl).finally(() => {
                connection.destroy();
            });
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
