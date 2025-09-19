// 应用配置
const config = {
  development: {
    API_BASE_URL: 'http://localhost:8080/api',
    APP_TITLE: '我的半截诗 - 本地开发'
  },
  production: {
    API_BASE_URL: '/api',
    APP_TITLE: '我的半截诗'
  }
}

// 根据环境变量获取配置
const env = import.meta.env.MODE || 'development'
const currentConfig = config[env] || config.development

export default currentConfig
