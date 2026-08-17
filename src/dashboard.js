const express = require('express');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3000;

// Đọc dữ liệu gửi lên từ Form (POST request)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// SỬA LỖI ĐƯỜNG DẪN: Chỉ định chính xác thư mục views nằm ở ngoài thư mục gốc cgeck/views
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

const DEFAULT_GUILD_ID = 'default';

// Điều hướng trang chủ Dashboard Phán Quyết
app.get('/', async (req, res) => {
  try {
    let config = await prisma.guildConfig.findUnique({
      where: { guildId: DEFAULT_GUILD_ID }
    });

    if (!config) {
      config = await prisma.guildConfig.create({
        data: {
          guildId: DEFAULT_GUILD_ID,
          prefix: '!',
          autoModEnabled: true
        }
      });
    }

    const stats = {
      botName: 'Shiki-Eiki Yamaxanadu',
      title: 'Phán Quan Tối Cao Của Hỉ Ngạn',
      status: 'Hoạt Động (Đang Thực Thi Phán Quyết)',
      uptime: Math.floor(process.uptime()),
      ping: Math.floor(Math.random() * 20) + 15,
      guilds: 12,
      users: 1450
    };

    res.render('index', { stats, config, message: null });
  } catch (error) {
    console.error(error);
    res.status(500).send('Lỗi kết nối cơ sở dữ liệu Tòa Án Hỉ Ngạn!');
  }
});

// Xử lý lưu cài đặt (Prefix, Moderation) từ Form
app.post('/save-settings', async (req, res) => {
  try {
    const { prefix, autoModEnabled, modLogChannel } = req.body;

    const updatedConfig = await prisma.guildConfig.upsert({
      where: { guildId: DEFAULT_GUILD_ID },
      update: {
        prefix: prefix || '!',
        autoModEnabled: autoModEnabled === 'on',
        modLogChannel: modLogChannel || null
      },
      create: {
        guildId: DEFAULT_GUILD_ID,
        prefix: prefix || '!',
        autoModEnabled: autoModEnabled === 'on',
        modLogChannel: modLogChannel || null
      }
    });

    const stats = {
      botName: 'Shiki-Eiki Yamaxanadu',
      title: 'Phán Quan Tối Cao Của Hỉ Ngạn',
      status: 'Hoạt Động (Đang Thực Thi Phán Quyết)',
      uptime: Math.floor(process.uptime()),
      ping: Math.floor(Math.random() * 20) + 15,
      guilds: 12,
      users: 1450
    };

    res.render('index', { 
      stats, 
      config: updatedConfig, 
      message: 'Sắc lệnh cấu hình đã được áp dụng thành công!' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Lỗi khi cập nhật cài đặt!');
  }
});

app.listen(PORT, () => {
  console.log(`[Shiki-Eiki Dashboard] Đã bật bảng điều khiển tại http://localhost:${PORT}`);
});