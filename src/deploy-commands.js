const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const commands = [
  // --- QUẢN TRỊ (MODERATION) ---
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Shiki-Eiki Yamaxanadu: Trục xuất vĩnh viễn kẻ vi phạm khỏi máy chủ')
    .addUserOption(opt => opt.setName('target').setDescription('Đối tượng chịu án').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Tội danh / Lý do'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Shiki-Eiki Yamaxanadu: Đuổi kẻ vi phạm khỏi máy chủ')
    .addUserOption(opt => opt.setName('target').setDescription('Đối tượng chịu án').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Tội danh / Lý do'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Shiki-Eiki Yamaxanadu: Phạt cấm ngôn sám hối')
    .addUserOption(opt => opt.setName('target').setDescription('Đối tượng').setRequired(true))
    .addIntegerOption(opt => opt.setName('duration').setDescription('Thời gian cấm ngôn (phút)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Shiki-Eiki Yamaxanadu: Dọn dẹp tin nhắn rác')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Số lượng tin nhắn (1-100)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  // --- ÂM NHẠC ---
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Shiki-Eiki Yamaxanadu: Phát nhạc thanh tịnh từ YouTube')
    .addStringOption(opt => opt.setName('query').setDescription('Tên bài hát hoặc URL').setRequired(true)),

  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Shiki-Eiki Yamaxanadu: Dừng phát nhạc và rời kênh thoại'),

  // --- KINH TẾ / ĐỎ ĐEN ---
  new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Shiki-Eiki Yamaxanadu: Nhận bổng lộc mỗi ngày'),

  new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Shiki-Eiki Yamaxanadu: Tung đồng xu định đoạt vận may')
    .addStringOption(opt => opt.setName('choice').setDescription('Chọn ngửa hoặc sấp').setRequired(true).addChoices(
      { name: 'Ngửa (heads)', value: 'heads' },
      { name: 'Sấp (tails)', value: 'tails' }
    ))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Mức tiền cược').setRequired(true)),

  new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Shiki-Eiki Yamaxanadu: Vòng quay phán quyết (Slots)')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Mức tiền cược').setRequired(true)),

  // --- MINIGAME ---
  new SlashCommandBuilder()
    .setName('oan-tu-xi')
    .setDescription('Shiki-Eiki Yamaxanadu: Thử tài Oẳn Tù Tì')
    .addStringOption(opt => opt.setName('choice').setDescription('Nước đi của bạn').setRequired(true).addChoices(
      { name: 'Kéo', value: 'keo' },
      { name: 'Búa', value: 'bua' },
      { name: 'Bao', value: 'bao' }
    )),

  new SlashCommandBuilder()
    .setName('doan-so')
    .setDescription('Shiki-Eiki Yamaxanadu: Đoán số vô vi (1-10)')
    .addIntegerOption(opt => opt.setName('number').setDescription('Số bạn chọn (1-10)').setRequired(true))
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    console.log('[Shiki-Eiki Yamaxanadu] Đang tiến hành đăng ký hệ thống lệnh...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('[Shiki-Eiki Yamaxanadu] Đăng ký thành công!');
  } catch (error) {
    console.error('[Shiki-Eiki Error]', error);
  }
})();