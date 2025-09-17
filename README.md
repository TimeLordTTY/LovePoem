# 她的诗集 - LovePoem

> 她名中有晓，所以每一首诗都带一点光

## 项目简介

这是一个为白秦（笔名）打造的个人诗集网站，用于展示和分享她的诗歌作品。网站采用现代化的设计风格，支持白天/夜晚主题切换，体现"白秦/晓"的意象融合。

## 技术栈

### 前端
- **Vue 3** - 渐进式JavaScript框架
- **Vite** - 快速的前端构建工具
- **Vue Router** - 官方路由管理器
- **Pinia** - Vue状态管理
- **Element Plus** - Vue 3 UI组件库
- **Axios** - HTTP客户端

### 后端
- **Spring Boot 3.1.5** - Java企业级应用框架
- **MyBatis Plus** - MyBatis增强工具
- **MySQL 5.7** - 关系型数据库
- **JWT** - 身份验证
- **Apache POI** - Office文档处理
- **Flexmark** - Markdown解析器

## 功能特性

### 🌅 主题切换
- **白天主题（晓）**: 晨光、飞鸟、浅粉/金色渐变
- **夜晚主题（白秦）**: 星空、月光、深蓝/银白

### 📝 内容管理
- 文章发布与管理
- 系列文章组织
- 标签分类系统
- Markdown支持
- Word文档导入

### 👥 用户体系
- 游客模式（公开内容浏览）
- 作者权限（内容创建与编辑）
- 管理员权限（全站管理）

### 📱 响应式设计
- 移动端适配
- 现代化UI设计
- 流畅的动画效果

## 快速开始

### 环境要求
- Node.js 16+
- Java 17+
- MySQL 5.7+
- Maven 3.6+

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/TimeLordTTY/LovePoem.git
cd LovePoem
```

2. **数据库设置**
```bash
# 创建数据库
mysql -u root -p < database/schema.sql

# 初始化数据
mysql -u root -p < database/init_data.sql
```

3. **后端启动**
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

4. **前端启动**
```bash
cd frontend
npm install
npm run dev
```

5. **访问应用**
- 前端: http://localhost:3000
- 后端API: http://localhost:8080/api

### 默认账号
- 管理员: admin / 123456
- 作者: baiqin / 123456

## 项目结构

```
LovePoem/
├── frontend/                 # Vue3前端项目
│   ├── src/
│   │   ├── components/      # 可复用组件
│   │   ├── views/          # 页面组件
│   │   ├── router/         # 路由配置
│   │   ├── store/          # 状态管理
│   │   ├── api/            # API接口
│   │   └── styles/         # 样式文件
│   ├── package.json
│   └── vite.config.js
├── backend/                  # Spring Boot后端项目
│   ├── src/main/java/com/herpoem/site/
│   │   ├── controller/     # 控制器层
│   │   ├── service/        # 业务逻辑层
│   │   ├── mapper/         # 数据访问层
│   │   ├── model/          # 数据模型
│   │   ├── config/         # 配置类
│   │   └── util/           # 工具类
│   ├── src/main/resources/
│   │   ├── mapper/         # MyBatis XML
│   │   └── application.yml # 应用配置
│   └── pom.xml
└── database/                 # 数据库脚本
    ├── schema.sql           # 数据库结构
    └── init_data.sql        # 初始化数据
```

## 开发计划

- [x] 项目初始化和基础架构
- [x] 用户认证系统
- [x] 文章管理功能
- [x] 主题切换功能
- [ ] 文章导入功能（Markdown/Word）
- [ ] 系列管理功能
- [ ] 标签管理功能
- [ ] 搜索功能
- [ ] 评论系统
- [ ] 部署配置

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 致谢

- 感谢白秦提供的美好诗歌作品
- 感谢开源社区提供的优秀工具和框架

---

> 在文字的世界里，每一个字都是光 ✨
