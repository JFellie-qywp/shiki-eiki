const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const { PrismaClient } = require('@prisma/client');
const play = require('play-dl');
const googleTTS = require('google-tts-api');
require('dotenv').config();

const prisma = new PrismaClient();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

// Khởi tạo Spotify token cho play-dl
play.setToken({
  spotify: {
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    refresh_token: '',
    market: 'VN'
  }
});

const musicQueues = new Map();
const voiceConnections = new Map();

client.once('ready', () => {
  console.log(`⚖️  Shiki-Eiki Yamaxanadu đã sẵn sàng thực thi công lý dưới tên: ${client.user.tag}`);
});

// ==========================================
// 1. AUTO-RESPONDER & TTS & AUTOMOD
// ==========================================
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  let config = await prisma.guildConfig.findUnique({ where: { guildId: 'default' } });
  const currentPrefix = config?.prefix || '!';

  // --- AUTOMODERATION ---
  if (config?.autoModEnabled) {
    const badWords = ['chửi_thề_1', 'chửi_thề_2', 'dm', 'vcl']; 
    const hasBadWord = badWords.some(word => message.content.toLowerCase().includes(word));

    if (hasBadWord) {
      await message.delete().catch(() => {});
      const warningMsg = await message.channel.send(`⚖️ **[Shiki-Eiki Yamaxanadu Phán Quyết]**: Ngôn từ của <@${message.author.id}> vi phạm chuẩn mực!`);
      setTimeout(() => warningMsg.delete().catch(() => {}), 5000);

      if (config.modLogChannel) {
        const logChannel = message.guild.channels.cache.get(config.modLogChannel);
        if (logChannel) {
          logChannel.send(`🛡️ **AutoMod Log**: Đã xóa tin nhắn vi phạm từ **${message.author.tag}** tại <#${message.channel.id}>.`);
        }
      }
      return;
    }
  }

  // --- TTS IN VOICE CHANNEL ---
  const activeVoice = voiceConnections.get(message.guild.id);
  if (activeVoice && activeVoice.textChannelId === message.channel.id) {
    if (!message.content.startsWith(currentPrefix) && message.content.length < 200) {
      const textToRead = `${message.author.username} nói: ${message.content}`;
      try {
        const ttsUrl = googleTTS.getAudioUrl(textToRead, {
          lang: 'vi',
          slow: false,
          host: 'https://translate.google.com',
        });
        const resource = createAudioResource(ttsUrl);
        activeVoice.player.play(resource);
      } catch (err) {
        console.error('Lỗi TTS:', err);
      }
    }
  }

  // --- AUTO RESPONDER & PREFIX ---
  if (message.content.startsWith(currentPrefix)) {
    const args = message.content.slice(currentPrefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'ping') {
      return message.reply(`🏓 Pong! Độ trễ phán quyết: ${client.ws.ping}ms. Prefix hiện tại: \`${currentPrefix}\``);
    }
  }

  const content = message.content.toLowerCase();
  if (content === 'ping' && !message.content.startsWith(currentPrefix)) {
    return message.reply(`📓 Pong! Trật tự ổn định. (Prefix: \`${currentPrefix}\`)`);
  }

  if (content.includes('hello') || content.includes('chào') || content.includes('shiki')) {
    return message.reply(`Chào ${message.author}. Shiki-Eiki Yamaxanadu nhắc bạn: Nhớ tích đức hành thiện!`);
  }

  if (content.includes('shiki đâu') || content.includes('yamaxanadu đâu')) {
    return message.reply('Shiki-Eiki Yamaxanadu luôn ở đây để phân định đúng sai cho máy chủ.');
  }
});

// ==========================================
// 2. XỬ LÝ LỆNH SLASH
// ==========================================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guildId, member, guild } = interaction;

  // Đồng bộ User
  let userData = await prisma.user.findUnique({ where: { id: interaction.user.id } });
  if (!userData) {
    userData = await prisma.user.create({ data: { id: interaction.user.id } });
  }

  let config = await prisma.guildConfig.findUnique({ where: { guildId: 'default' } });
  const currency = config?.currencySymbol || 'Âm Phủ Nhuận';

  // ---------------- LỆNH MODERATION ----------------
  if (commandName === 'ban') {
    const target = options.getUser('target');
    const reason = options.getString('reason') || 'Tội danh không được miễn trừ';
    await guild.members.ban(target, { reason });
    return interaction.reply({ content: `⚖️ **[Shiki-Eiki Yamaxanadu Phán Quyết]**: Đã ban thành công **${target.tag}**. Lý do: *${reason}*` });
  }

  if (commandName === 'kick') {
    const targetMember = options.getMember('target');
    const reason = options.getString('reason') || 'Vi phạm nội quy';
    await targetMember.kick(reason);
    return interaction.reply({ content: `⚖️ **[Shiki-Eiki Yamaxanadu Phán Quyết]**: Đã trục xuất **${targetMember.user.tag}**. Lý do: *${reason}*` });
  }

  if (commandName === 'timeout') {
    const targetMember = options.getMember('target');
    const duration = options.getInteger('duration');
    await targetMember.timeout(duration * 60 * 1000);
    return interaction.reply({ content: `📜 **Shiki-Eiki Yamaxanadu**: Đã cưỡng chế **${targetMember.user.tag}** sám hối trong **${duration} phút**.` });
  }

  if (commandName === 'clear') {
    const amount = options.getInteger('amount');
    if (amount < 1 || amount > 100) return interaction.reply({ content: 'Số lượng dọn dẹp phải từ 1 đến 100.', ephemeral: true });
    await interaction.channel.bulkDelete(amount, true);
    return interaction.reply({ content: `🧹 **Shiki-Eiki Yamaxanadu**: Đã quét sạch **${amount}** tin nhắn rác.`, ephemeral: true });
  }

  // ---------------- LỆNH THOẠI & TTS ----------------
  if (commandName === 'join') {
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return interaction.reply({ content: 'Hãy tham gia một Kênh thoại trước!', ephemeral: true });

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    voiceConnections.set(guildId, { connection, player, textChannelId: interaction.channelId });
    return interaction.reply(`🎙️ **Shiki-Eiki Yamaxanadu** đã tham gia kênh thoại <#${voiceChannel.id}>!`);
  }

  if (commandName === 'leave') {
    const activeVoice = voiceConnections.get(guildId);
    if (!activeVoice) return interaction.reply({ content: 'Bot không ở trong kênh thoại!', ephemeral: true });

    activeVoice.connection.destroy();
    voiceConnections.delete(guildId);
    return interaction.reply('🔇 **Shiki-Eiki Yamaxanadu**: Đã rời kênh thoại.');
  }

  // ---------------- LỆNH PHÁT NHẠC (SPOTIFY / YOUTUBE) ----------------
  if (commandName === 'play') {
    await interaction.deferReply();
    const query = options.getString('query');
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) return interaction.editReply('Hãy tham gia Kênh thoại trước!');

    try {
      let stream;
      let title = '';

      const playType = await play.validate(query);

      if (playType && playType.startsWith('sp')) {
        if (play.is_expired()) {
          await play.refreshToken();
        }

        let spotifyData = await play.spotify(query);
        
        if (playType === 'sp_track') {
          const searched = await play.search(`${spotifyData.name} ${spotifyData.artists[0].name}`, { limit: 1 });
          if (!searched.length) return interaction.editReply('Không tìm thấy bản audio tương ứng trên YouTube.');
          
          stream = await play.stream(searched[0].url);
          title = `[Spotify] ${spotifyData.name} - ${spotifyData.artists[0].name}`;
        } else if (playType === 'sp_playlist' || playType === 'sp_album') {
          const tracks = await spotifyData.all_tracks();
          const firstTrack = tracks[0];
          const searched = await play.search(`${firstTrack.name} ${firstTrack.artists[0].name}`, { limit: 1 });
          
          stream = await play.stream(searched[0].url);
          title = `[Spotify Playlist] ${firstTrack.name} (Tất cả ${tracks.length} bài đã thêm vào danh sách)`;
        }
      } else {
        const ytInfo = await play.search(query, { limit: 1 });
        if (!ytInfo.length) return interaction.editReply('Shiki-Eiki Yamaxanadu không tìm thấy bản âm thanh này.');

        stream = await play.stream(ytInfo[0].url);
        title = ytInfo[0].title;
      }

      const resource = createAudioResource(stream.stream, { inputType: stream.type });
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();
      player.play(resource);
      connection.subscribe(player);

      musicQueues.set(guildId, { connection, player });

      return interaction.editReply(`🎵 **Shiki-Eiki Yamaxanadu**: Đang phát **${title}**`);
    } catch (err) {
      console.error(err);
      return interaction.editReply('Gặp lỗi khi xử lý bài hát Spotify/YouTube.');
    }
  }

  if (commandName === 'stop') {
    const queue = musicQueues.get(guildId);
    if (!queue) return interaction.reply({ content: 'Không có bản nhạc nào đang phát!', ephemeral: true });
    
    queue.player.stop();
    queue.connection.destroy();
    musicQueues.delete(guildId);

    return interaction.reply('🎶 **Shiki-Eiki Yamaxanadu**: Đã ngừng nhạc và ngắt kết nối.');
  }

  // ---------------- LỆNH QUẢN LÝ TIỀN TỆ (CASH & BANK) ----------------
  if (commandName === 'balance') {
    const total = userData.cash + userData.bank;
    return interaction.reply(
      `🏛️ **Sổ Tiết Kiệm - ${interaction.user.username}**\n` +
      `💵 **Cash (Tiền mặt):** \`${userData.cash}\` ${currency}\n` +
      `🏦 **Bank (Ngân hàng):** \`${userData.bank}\` ${currency}\n` +
      `💰 **Tổng tài sản:** \`${total}\` ${currency}`
    );
  }

  if (commandName === 'deposit') {
    const amountInput = options.getString('amount');
    let amount = amountInput.toLowerCase() === 'all' ? userData.cash : parseInt(amountInput);

    if (isNaN(amount) || amount <= 0) return interaction.reply({ content: 'Số tiền không hợp lệ!', ephemeral: true });
    if (userData.cash < amount) return interaction.reply({ content: `Bạn chỉ có **${userData.cash} ${currency}** Cash.`, ephemeral: true });

    await prisma.user.update({
      where: { id: interaction.user.id },
      data: { cash: { decrement: amount }, bank: { increment: amount } }
    });

    return interaction.reply(`🏦 Đã gửi **${amount} ${currency}** Cash vào Ngân hàng!`);
  }

  if (commandName === 'withdraw') {
    const amountInput = options.getString('amount');
    let amount = amountInput.toLowerCase() === 'all' ? userData.bank : parseInt(amountInput);

    if (isNaN(amount) || amount <= 0) return interaction.reply({ content: 'Số tiền không hợp lệ!', ephemeral: true });
    if (userData.bank < amount) return interaction.reply({ content: `Ngân hàng của bạn chỉ có **${userData.bank} ${currency}**.`, ephemeral: true });

    await prisma.user.update({
      where: { id: interaction.user.id },
      data: { cash: { increment: amount }, bank: { decrement: amount } }
    });

    return interaction.reply(`💵 Đã rút **${amount} ${currency}** từ Ngân hàng ra Cash!`);
  }

  if (commandName === 'daily') {
    const now = new Date();
    const diffHours = Math.abs(now - new Date(userData.lastDaily)) / 36e5;

    if (diffHours < 24 && userData.cash !== 1000) {
      return interaction.reply({ content: `Bạn đã nhận bổng lộc hôm nay rồi!`, ephemeral: true });
    }

    await prisma.user.update({
      where: { id: interaction.user.id },
      data: { cash: { increment: 500 }, lastDaily: now }
    });

    return interaction.reply(`🎁 Ban thưởng **500 ${currency}** (Cash). Tiền mặt hiện tại: **${userData.cash + 500} ${currency}**.`);
  }

  // ---------------- LỆNH GAMBLING (YÊU CẦU DÙNG CASH) ----------------
  if (commandName === 'coinflip') {
    const choice = options.getString('choice');
    const amount = options.getInteger('amount');

    if (amount <= 0) return interaction.reply({ content: 'Mức cược phải lớn hơn 0!', ephemeral: true });
    if (userData.cash < amount) {
      return interaction.reply({ content: `❌ Bạn không đủ Cash để cược! Hiện có **${userData.cash} ${currency}** Cash.`, ephemeral: true });
    }

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const win = choice === result;
    const change = win ? amount : -amount;

    await prisma.user.update({
      where: { id: interaction.user.id },
      data: { cash: { increment: change } }
    });

    const resultText = result === 'heads' ? 'Ngửa' : 'Sấp';
    return interaction.reply(
      `🪙 **Coinflip**: Kết quả ra mặt **${resultText}**!\n` +
      (win ? `🎉 Phán quyết có lợi! Nhận **+${amount} ${currency}** Cash!` : `📉 Thất bại! Mất **-${amount} ${currency}** Cash.`) +
      `\n💵 Cash hiện tại: **${userData.cash + change} ${currency}**`
    );
  }

  if (commandName === 'slots') {
    const amount = options.getInteger('amount');
    if (amount <= 0) return interaction.reply({ content: 'Mức cược phải lớn hơn 0!', ephemeral: true });
    if (userData.cash < amount) {
      return interaction.reply({ content: `❌ Số dư Cash không đủ! Hiện có **${userData.cash} ${currency}** Cash.`, ephemeral: true });
    }

    const items = ['🍎', '🍋', '🍒', '7️⃣'];
    const s1 = items[Math.floor(Math.random() * items.length)];
    const s2 = items[Math.floor(Math.random() * items.length)];
    const s3 = items[Math.floor(Math.random() * items.length)];

    let winMultiplier = 0;
    if (s1 === s2 && s2 === s3) {
      winMultiplier = s1 === '7️⃣' ? 10 : 5;
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
      winMultiplier = 2;
    }

    const netChange = winMultiplier > 0 ? (amount * winMultiplier) - amount : -amount;

    await prisma.user.update({
      where: { id: interaction.user.id },
      data: { cash: { increment: netChange } }
    });

    return interaction.reply(
      `🎰 **Slots**: [ ${s1} | ${s2} | ${s3} ]\n` +
      (winMultiplier > 0 ? `✨ Trúng thưởng! Nhận **+${netChange} ${currency}** Cash (x${winMultiplier})!` : `💸 Mất **-${amount} ${currency}** Cash.`) +
      `\n💵 Cash hiện tại: **${userData.cash + netChange} ${currency}**`
    );
  }

  // ---------------- MINIGAME ----------------
  if (commandName === 'oan-tu-xi') {
    const userChoice = options.getString('choice');
    const choices = ['keo', 'bua', 'bao'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    let res = 'Hòa!';
    if (
      (userChoice === 'keo' && botChoice === 'bao') ||
      (userChoice === 'bua' && botChoice === 'keo') ||
      (userChoice === 'bao' && botChoice === 'bua')
    ) {
      res = 'Bạn chiến thắng!';
    } else if (userChoice !== botChoice) {
      res = 'Shiki-Eiki Yamaxanadu chiến thắng!';
    }

    return interaction.reply(`🎮 Bạn ra **${userChoice}** | Shiki-Eiki Yamaxanadu ra **${botChoice}**\n👉 Kết quả: **${res}**`);
  }

  if (commandName === 'doan-so') {
    const guessedNumber = options.getInteger('number');
    const targetNumber = Math.floor(Math.random() * 10) + 1;

    if (guessedNumber === targetNumber) {
      return interaction.reply(`🎯 **Shiki-Eiki Yamaxanadu**: Chuẩn xác! Con số bí mật chính là **${targetNumber}**.`);
    } else {
      return interaction.reply(`❌ **Shiki-Eiki Yamaxanadu**: Sai rồi! Con số định mệnh là **${targetNumber}**, không phải **${guessedNumber}**.`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);