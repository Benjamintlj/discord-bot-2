require('dotenv').config();

const { REST } = require('@discordjs/rest');
const { Client, GatewayIntentBits, Collection } = require('discord.js')
const { Routes } = require('discord-api-types/v9');
const { getVoiceConnection } = require('@discordjs/voice');
const { Player } = require('discord-player');
const { YouTubeExtractor } = require('@discord-player/extractor');
const fs = require('fs');
const {join} = require("path");
const path = require("path");


///////////////////////////////////////////////
// Init discord client
///////////////////////////////////////////////
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Setup commands
const commands = [];
client.commands = new Collection();

// Find all command files
const commandFilesPath = join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandFilesPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    // Get all commands
    const filePath = path.join(commandFilesPath, file);
    const command = require(filePath);

    // Add command to client
    try {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    } catch (e) {
        console.error(`Error loading command ${file}: ${e.message}`);
    }
}

///////////////////////////////////////////////
// Create player
///////////////////////////////////////////////

client.player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
    }
});

client.player.extractors.register(YouTubeExtractor);

///////////////////////////////////////////////
// Event listeners
///////////////////////////////////////////////

client.on('ready', (c) => {
    console.log(`${c.user.tag} is ready ✅`);

    const guildIds = client.guilds.cache.map(guild => guild.id);

    const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN);
    for (const guildId of guildIds) {
        rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: commands })
            .then(() => console.log(`Successfully registered application commands for guild ${guildId}`))
            .catch(console.error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute({client, interaction});
    } catch (e) {
        console.error(e);
        await interaction.reply('Something went wrong');

        const userVoiceChannel = interaction.member.voice.channel;
        const botVoiceChannel = interaction.guild.me.voice.channel;

        if (userVoiceChannel && botVoiceChannel && userVoiceChannel.id === botVoiceChannel.id) {
            botVoiceChannel.leave();
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);