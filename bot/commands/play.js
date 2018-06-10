const fs = require('fs');
const snekfetch = require('snekfetch');

const config = JSON.parse(fs.readFileSync('./bot/json/config.json', 'utf8'));

module.exports.run = async (Client, msg, args, info, mode) => {

    var guild = Client.servers.get(msg.guild.id);

    var texts = JSON.parse(fs.readFileSync( "./bot/json/lang/" + guild.language + ".json", 'utf8'));

    var vc = msg.member.voiceChannel;
    var search = args.join(" ");

    if(!vc) return Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.general_not_in_channel, texts.error_title);    
    if(!args[0]) return Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.general_no_arguments, texts.error_title);
    if(!vc.joinable) return Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.general_no_perms_connect, texts.error_title);
    if(!vc.speakable) return Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.general_no_perms_speak, texts.error_title);
    if(msg.guild.me.voiceChannel) if(vc != msg.guild.me.voiceChannel) return Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.general_same_channel, texts.error_title);
    
    if(guild.isPaused) {
        const player = Client.playermanager.get(msg.guild.id);
        if (!player) return;
        await player.pause(false);
        guild.isPaused = false;
        return Client.functions.createEmbed(msg.channel, Client.emotes.get("check") + texts.resumed_text, texts.resumed_title);
    }

    var url;
    var track;
    var song;

    if(validURL(args.join(" "))) {
        url = encodeURIComponent(args.join(" "));

        const playlist = /(\?|\&)list=(.*)/.exec(args.join(" "));
        const YTMini = /https:\/\/?(www\.)?youtu\.be\/?(.*)/.exec(url);
        const YTFull = /https:\/\/?(www\.)?youtube\.com\/watch\?v=?(.*)/.exec(url);

        const soundCloud = /https:\/\/soundcloud\.com\/.*/.exec(url);
        const scPlaylist = /https:\/\/?soundcloud.com\/.*\/.*\/.*/.exec(args.join(" "));

        if(playlist) {
            const { body } = await snekfetch.get(`https://www.googleapis.com/youtube/v3/playlists?part=id,snippet&id=${playlist[2]}&key=${config.keys.ytapi}`);
            if (!body.items[0]) return Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.error_nothing_found, texts.error_title);
            const songData = await Client.functions.getSong(args.join(" "));
            if (!songData) return Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.error_nothing_found, texts.error_title);
            var limit = 50;
            if(Client.functions.checkPatron(Client, guild, texts, msg, "0", false) == true) maximum = 100;
            if(Client.functions.checkPatron(Client, guild, texts, msg, "1", false) == true) maximum = 200;
            if(Client.functions.checkPatron(Client, guild, texts, msg, "2", false) == true) maximum = 300;
            if(Client.functions.checkPatron(Client, guild, texts, msg, "3", false) == true) maximum = 1000;

            if(songData.length >= limit) Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.command_play_not_whole_playlist, texts.error_title);

            if(songData.length >= limit) {
                limit = limit;
            } else {
                limit = songData.length;
            }

            limit = limit - 1;

            Client.functions.createEmbed(msg.channel, Client.emotes.get("check") + texts.command_play_playlist_text, texts.command_play_playlist_title);

            for (let i = 0; i <= limit; i++) {
                await handle(songData[i], true, mode);
            }                
        } else if(YTFull) {
            song = await Client.functions.getSong(YTFull[0]);
            await handle(song[0], false, mode);            
        } else if(YTMini) {
            song = await Client.functions.getSong(YTMini[0]);
            await handle(song[0], false, mode);               
        } else if(soundCloud) {
            Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.error_not_available, texts.error_title);
        } else if(scPlaylist) {
            Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.error_not_available, texts.error_title);
        } else {
            track = args.join(" ");
            song = await Client.functions.getSong("ytsearch: " + track);
            await handle(song[0], false, mode);
        }
        } else {
        track = args.join(" ");
        song = await Client.functions.getSong("ytsearch: " + track);
        await handle(song[0], false, mode);
    }

    async function handle(song, playlist, mode) {
        if(song == null) return;
        const player = await Client.playermanager.join({
            guild: msg.guild.id,
            channel: msg.member.voiceChannelID,
            host: "127.0.0.1"
        });
    
        if (!player) return Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.general_no_player, texts.error_title);
        
        await player.volume(guild.defaultVolume);
        song.info.member = msg.member;
    
        if(!guild.queue[0]) {
            guild.process = 0;
            guild.queue.push(song);
            await play();
        } else {
            var maximum = guild.queueLength;
            if(Client.functions.checkPatron(Client, guild, texts, msg, "0", false) == true) maximum = 100;
            if(Client.functions.checkPatron(Client, guild, texts, msg, "1", false) == true) maximum = 200;
            if(Client.functions.checkPatron(Client, guild, texts, msg, "2", false) == true) maximum = 300;
            if(Client.functions.checkPatron(Client, guild, texts, msg, "3", false) == true) maximum = 1000;
    
            if(guild.queue.length >= maximum) return Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.command_play_queue_full, texts.error_title);

            if(mode != null) {
                if(mode == "playskip") {
                    var current = guild.queue[0];
                    guild.queue.shift();
                    guild.queue.unshift(song);
                    guild.queue.unshift(current);
                    const player = await Client.playermanager.get(msg.guild.id);
                    await player.stop();
                } else if(mode == "playtop") {
                    var current = guild.queue[0];
                    guild.queue.shift();
                    guild.queue.unshift(song);
                    guild.queue.unshift(current);
                }
            } else {
                guild.queue.push(song);
            }    
            
            if(playlist == false) Client.functions.createEmbed(msg.channel, Client.emotes.get("check") + texts.command_play_your_song + " **" + song.info.title + "** " + texts.command_play_added_text, texts.command_play_added_title);
        }
    }

    async function play() {
        const player = await Client.playermanager.get(msg.guild.id);
        if (!player) return Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.general_no_player, texts.error_title);
        await player.play(guild.queue[0].track);
        guild.isPlaying = true;
        guild.interval = setInterval(function(){ guild.process++ }, 1000);

        guild.check = setInterval(async function() {
            var users = 0;
            if(!msg.guild.me || !msg.guild.me.voiceChannel) return clearInterval(guild.check);
            var members = msg.guild.me.voiceChannel.members.array();

            await members.forEach(member => {
                if(!member.user.bot) users++;
            });

            if(users == 0) {
                if(guild.isPaused) {
                    if(msg.guild.id != "403882830225997825") {
                        Client.playermanager.leave(msg.guild.id);
                        clearInterval(guild.interval);
                        guild.queue = [];
                        guild.previous = null;
                        guild.votes.clear();
                        guild.process = 0;
                        guild.isPaused = false;
                        guild.isPlaying = false;
                    }
                } else {
                    const player = Client.playermanager.get(msg.guild.id);
                    if (!player) return;
                    await player.pause(true);
                    guild.isPaused = true;
                    clearInterval(guild.interval);
                }
            }
        }, 600000);

        if(guild.announceSongs) {
            if(guild.loopSong == false && guild.loopQueue == false) {
                Client.functions.createEmbed(msg.channel, ":musical_note: " + texts.command_play_your_song + " **" + guild.queue[0].info.title + "** " + texts.command_play_now_text, texts.command_play_now_title);
            }            
        }

        player.on("error", console.error);
        player.once("end", async data => {
            if (data.reason === "REPLACED") return;

            await clearInterval(guild.interval);
            await clearInterval(guild.check);

            guild.previous = guild.queue[0];

            guild.votes.clear();
            guild.process = 0;

            if(!guild.queue[0]) {
                guild.isPlaying = false;
                await leave();
            } else {
                if(guild.loopSong) {
                    await play();
                } else if(guild.loopQueue) {
                    var len = guild.queue.length;
                    var first = guild.queue[0];
                    guild.queue.shift();
                    guild.queue.push(first);
                    await play();
                } else if(guild.isShuffling) {
                    var len = guild.queue.length;
    
                    if(len < 1) {
                        guild.isPlaying = false;
                        await leave();
                        return;
                    }
    
                    var pos = Math.floor(Math.random() * len);
    
                    var shuffled_id = guild.queue[pos];
                    guild.queue.splice(pos, 1);
                    guild.queue.unshift(shuffled_id);
                } else if(guild.isShuffling && guild.loopQueue) {
                    var len = guild.queue.length;
    
                    if(len < 1) {
                        guild.isPlaying = false;
                        await leave();
                        return;
                    }
    
                    var pos = Math.floor(Math.random() * len);
    
                    var shuffled_id = guild.queue[pos];
                    guild.queue.splice(pos, 1);
                    guild.queue.unshift(shuffled_id);
                } else {
                    guild.queue.shift();
    
                    if(guild.queue[0]) {
                        await play();
                    } else {
                        guild.isPlaying = false;
                        await leave();
                    }
                }
            }            
        });
    }

    async function leave() {
        if(vc.id == "404312098970140672") return;
        if(Client.patrons.has(msg.guild.id)) {
            if(Client.patrons.get(msg.guild.id).level > 0) return;
        }
        await Client.playermanager.leave(msg.guild.id);
        await clearInterval(guild.interval);
        guild.queue = [];
        guild.previous = null;
        await guild.votes.clear();
        guild.isPaused = false;
        guild.isPlaying = false;
        guild.process = 0;
    }

    function validURL(str) {
        const regexp = /^(http[s]?:\/\/){0,1}(www\.){0,1}[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,5}[\.]{0,1}/;
        if (!regexp.test(str)) {
            return false;
        } else { return true; }
    }
}