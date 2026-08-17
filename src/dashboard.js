const express = require('express');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware đọc dữ liệu Form
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Phục vụ các file tĩnh từ thư mục public (chứa avatar.jpg)
app.use(express.static(path.join(__dirname, '../public')));

// Cấu hình thư mục views chứa file index.ejs
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

const DEFAULT_GUILD_ID = 'default';

// Đường dẫn static avatar nội bộ từ thư mục public
const SHIKI_AVATAR = "/avatar.jpg";

// Tự động chuyển hướng từ trang chủ về đường dẫn tùy chỉnh
app.get('/', (req, res) => {
  res.redirect('/shikieikiyamaxanadu584');
});

// Route Trang chủ Dashboard
app.get('/shikieikiyamaxanadu584', async (req, res) => {
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

    res.render('index', { 
      stats, 
      config, 
      message: null,
      serverCount: stats.guilds,
      pingMs: `${stats.ping} ms`,
      clientId: process.env.CLIENT_ID || '',
      avatarUrl: SHIKI_AVATAR
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Lỗi kết nối cơ sở dữ liệu Tòa Án Hỉ Ngạn!');
  }
});

// Route hiển thị trang Điều Khoản Dịch Vụ (TOS)
app.get('/shikieikiyamaxanadu584/terms', (req, res) => {
  res.render('tos');
});

// Route hiển thị trang Chính Sách Bảo Mật (Privacy Policy)
app.get('/shikieikiyamaxanadu584/privacy', (req, res) => {
  res.render('privacy');
});

// Route lưu cấu hình
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
      message: 'Sắc lệnh cấu hình đã được áp dụng thành công!',
      serverCount: stats.guilds,
      pingMs: `${stats.ping} ms`,
      clientId: process.env.CLIENT_ID || '',
      avatarUrl: SHIKI_AVATAR
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Lỗi khi cập nhật cài đặt!');
  }
});

app.listen(PORT, () => {
  console.log(`[Shiki-Eiki Dashboard] Đã bật bảng điều khiển tại http://localhost:${PORT}/shikieikiyamaxanadu584`);
});