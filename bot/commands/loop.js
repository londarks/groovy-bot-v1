const fs = require("fs");

module.exports.run = (Client, msg, args, info) => {

    var guild = Client.servers.get(msg.guild.id);

    texts = JSON.parse(fs.readFileSync( "./bot/json/lang/" + guild.language + ".json", 'utf8'));

    if(msg.member.voiceChannel != msg.guild.me.voiceChannel) return Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.general_same_channel, texts.error_title);

    if(Client.functions.checkDJ(guild, msg) == false) return Client.functions.createEmbed(msg.channel, Client.emotes.get("error") + texts.general_no_dj + "`" + guild.djRole + "`!", texts.error_title);

    if(guild.loopSong) {
        guild.loopSong = false;
        if(info) {
            Client.functions.createEmbed(msg.channel, Client.emotes.get("check") + texts.command_loop_deactivated_text, texts.command_loop_deactivated_title);
        }
    } else {
        guild.loopSong = true;
        if(info) {
            Client.functions.createEmbed(msg.channel, Client.emotes.get("check") + texts.command_loop_activated_text, texts.command_loop_activated_title);            
        }
    }
}