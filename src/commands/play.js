const { SlashCommandBuilder, EmbedBuilder} = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { QueryType } = require('discord-player');
const {getVoiceConnection} = require("@discordjs/voice");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Will play music')
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search for a song')
                .addStringOption(option =>
                    option
                        .setName('query')
                        .setDescription('The query you want to search for')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('playlist')
                .setDescription('Play a playlist from YouTube')
                .addStringOption(option =>
                    option
                        .setName('url')
                        .setDescription('The URL of the YouTube playlist')
                        .setRequired(true)
                )
        ),
    execute: async ({client, interaction}) => {
        if (!interaction.member.voice.channel) {
            return await interaction.reply('Cannot execute command when you are not in a voice channel');
        }

        const queue = client.player.nodes.create(interaction.guild, {
            metadata: {
                channel: interaction.channel
            }
        });

        if (!queue.connection) {
            await queue.connect(interaction.member.voice.channel);
        }

        let embed = new EmbedBuilder();
        if (interaction.options.getSubcommand() === 'search') {
            console.log('search command made');

            const query = interaction.options.getString('query');

            console.log(`query ${query}`);

            const searchResult = await client.player.search(query, {
                requestedBy: interaction.user,
                searchEngine: QueryType.YOUTUBE_VIDEO
            });

            if (!searchResult || !searchResult.tracks.length) {
                if (queue.connection) queue.connection.destroy();

                return await interaction.reply('Video not found');
            }

            const track = searchResult.tracks[0];
            queue.addTrack(track);

            embed
                .setTitle('Added to queue')
                .setDescription(`[${track.title}](${track.url})`)
                .setThumbnail(track.thumbnail)
                .toJSON();
        }

        if (interaction.options.getSubcommand() === 'playlist') {
            const url = interaction.options.getString('url');

            const playlist = await client.player.createPlaylist(url, {
                requestedBy: interaction.user
            });

            if (!playlist || !playlist.tracks.length) {
                if (queue.connection) queue.connection.destroy();

                return await interaction.reply('Playlist not found');
            }

            queue.addTracks(playlist.tracks);

            embed
                .setTitle('Added to queue')
                .setDescription(`[${playlist.title}](${url})`)
                .setThumbnail(playlist.thumbnail)
                .toJSON();
        }

        if (!queue.isPlaying()) await queue.node.play();

        await interaction.reply({ embeds: [embed.toJSON()] });
    }
}