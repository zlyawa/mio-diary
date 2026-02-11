import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { 
  PenTool, 
  Shield, 
  Sparkles,
  ArrowRight,
  Check,
  Zap,
  BookOpen
} from 'lucide-react';

/**
 * 打字机效果 Hook
 */
const useTypewriter = (text, speed = 100, delay = 500) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    let timeoutId;

    const startTyping = () => {
      if (index < text.length) {
        setDisplayText(text.substring(0, index + 1));
        index++;
        timeoutId = setTimeout(startTyping, speed);
      } else {
        setIsComplete(true);
      }
    };

    timeoutId = setTimeout(startTyping, delay);

    return () => clearTimeout(timeoutId);
  }, [text, speed, delay]);

  return { displayText, isComplete };
};

/**
 * 功能配置 - 定义展示的功能模块（二次元风格）
 */
const FEATURES_CONFIG = [
  {
    id: 'writing',
    icon: PenTool,
    title: '梦想写作',
    description: '超好用的编辑器，让你的文字闪闪发光✨',
    color: 'pink',
    features: [
      '随心所欲的富文本编辑',
      '记录每个可爱的心情',
      '上传美美的图片',
      '自动保存草稿哦'
    ],
    emoji: '📝'
  },
  {
    id: 'security',
    icon: Shield,
    title: '绝对安全',
    description: '你的秘密日记只有你能看到哦！',
    color: 'green',
    features: [
      '超级安全的身份认证',
      '数据加密超级安全',
      'Token 自动刷新保护',
      '安全上传文件'
    ],
    emoji: '🛡️'
  }
];

/**
 * 颜色配置 - 用于功能卡片样式（二次元配色）
 */
const COLOR_CONFIG = {
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    border: 'border-pink-200 dark:border-pink-800',
    iconBg: 'bg-pink-100 dark:bg-pink-900',
    iconColor: 'text-pink-500 dark:text-pink-400',
    text: 'text-pink-500 dark:text-pink-400',
    gradient: 'from-pink-400 to-pink-600'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    iconBg: 'bg-purple-100 dark:bg-purple-900',
    iconColor: 'text-purple-500 dark:text-purple-400',
    text: 'text-purple-500 dark:text-purple-400',
    gradient: 'from-purple-400 to-purple-600'
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
    iconColor: 'text-blue-500 dark:text-blue-400',
    text: 'text-blue-500 dark:text-blue-400',
    gradient: 'from-blue-400 to-blue-600'
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    iconBg: 'bg-green-100 dark:bg-green-900',
    iconColor: 'text-green-500 dark:text-green-400',
    text: 'text-green-500 dark:text-green-400',
    gradient: 'from-green-400 to-green-600'
  }
};

/**
 * 功能卡片组件（二次元风格）
 * 展示单个功能模块的详细信息
 */
const FeatureCard = ({ feature }) => {
  const { icon: Icon, title, description, color, features, emoji } = feature;
  const colorConfig = COLOR_CONFIG[color] || COLOR_CONFIG.pink;

  return (
    <div className={`group relative p-6 rounded-3xl border-2 ${colorConfig.bg} ${colorConfig.border} hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02]`}>
      {/* 装饰性 emoji */}
      <div className="absolute -top-3 -right-3 text-4xl opacity-80 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300">
        {emoji}
      </div>

      {/* 图标 */}
      <div className={`w-16 h-16 rounded-2xl ${colorConfig.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
        <Icon className={`w-8 h-8 ${colorConfig.iconColor}`} />
      </div>

      {/* 标题和描述 */}
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-5 text-base">
        {description}
      </p>

      {/* 功能列表 */}
      <ul className="space-y-3">
        {features.map((item, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 group-hover:translate-x-1 transition-transform duration-300">
            <span className="text-lg">{item.charAt(0)}</span>
            <span className="group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">{item.slice(2)}</span>
          </li>
        ))}
      </ul>

      {/* 装饰性背景 */}
      <div className={`absolute -bottom-6 -left-6 w-32 h-32 ${colorConfig.iconBg} rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-xl`} />
    </div>
  );
};

/**
 * Features 页面组件（二次元风格）
 * 展示应用的核心功能特性
 */
const Features = () => {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { displayText, isComplete } = useTypewriter('欢迎来到 Mio 的魔法日记本', 150, 300);

  /**
   * 处理开始按钮点击
   * 已登录用户跳转到总览页，未登录用户跳转到登录页
   */
  const handleStartClick = () => {
    if (isAuthenticated) {
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      {/* 页面头部 */}
      <section className="relative overflow-hidden min-h-[600px]">
        {/* 背景图片 */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url('/IMG_20260211_123845.jpg')`,
            filter: 'brightness(0.7)'
          }}
        />
        
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

        {/* 装饰性背景 - 漂浮的 emoji */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 text-6xl animate-bounce" style={{ animationDelay: '0s' }}>✨</div>
          <div className="absolute top-20 right-20 text-5xl animate-bounce" style={{ animationDelay: '0.5s' }}>🌸</div>
          <div className="absolute top-1/3 right-1/3 text-5xl animate-bounce" style={{ animationDelay: '1.5s' }}>⭐</div>
          <div className="absolute bottom-10 right-10 text-6xl animate-bounce" style={{ animationDelay: '2s' }}>🌙</div>
          <div className="absolute top-40 left-1/2 text-4xl animate-bounce" style={{ animationDelay: '0.3s' }}>💫</div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 min-h-[600px] flex items-center justify-center">
          <div className="text-center">
            {/* 欢迎标题 */}
            <div className="mb-6 text-7xl md:text-8xl animate-pulse">
              👋
            </div>

            {/* 标题徽章 - 打字机效果 */}
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/30 backdrop-blur-sm mb-8 shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-base font-medium text-white min-h-[24px]">
                {displayText}
                <span className="inline-block w-2 h-4 bg-white ml-1 animate-pulse" />
              </span>
            </div>

            {/* 主标题 */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              记录你的每一个美好瞬间 🌟
            </h1>

            {/* 副标题 */}
            <p className="text-lg md:text-xl text-white/95 max-w-3xl mx-auto mb-12 leading-relaxed">
              嘿嘿~ 欢迎来到这个超可爱的日记本！
              <br />
              在这里，你可以尽情写下心情、记录生活、追忆美好~
              <br />
              每一篇日记都是属于你的独特回忆呢！📖✨
            </p>

            {/* CTA 按钮 - 已登录跳转总览页，未登录跳转登录页 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleStartClick}
                className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-pink-500 font-bold text-lg rounded-2xl hover:bg-pink-50 transition-all hover:scale-105 shadow-xl hover:shadow-2xl group"
              >
                <BookOpen className="w-6 h-6 group-hover:scale-125 transition-transform" />
                <span>{isAuthenticated ? '进入我的日记本' : '开始你的日记之旅'}</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* 装饰性文字 */}
            <div className="mt-8 flex items-center justify-center gap-4 text-white/80 text-sm">
              <span>🎨 超级可爱的界面</span>
              <span>•</span>
              <span>🔒 绝对安全的保护</span>
              <span>•</span>
              <span>✨ 超多好玩的功能</span>
            </div>
          </div>
        </div>

        {/* 波浪分隔线 */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            className="w-full h-16 md:h-24"
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 60L48 70C96 80 192 100 288 95C384 90 480 60 576 50C672 40 768 50 864 60C960 70 1056 80 1152 75C1248 70 1344 50 1392 40L1440 30V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0V60Z"
              fill={isDark ? '#111827' : '#FDF2F8'}
            />
          </svg>
        </div>
      </section>

      {/* 功能卡片网格 */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-12 md:mb-16">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            超棒的功能等你来发现！
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            这些功能都超级好用哦~ 让你的日记变得更有趣！🎀
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          {FEATURES_CONFIG.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </section>

      {/* 快速入门 */}
      <section className="bg-white dark:bg-gray-800 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-5">
          <div className="absolute top-10 left-10 text-9xl">🌸</div>
          <div className="absolute bottom-10 right-10 text-9xl">🌙</div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center mb-12">
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              三步开启你的日记之旅！
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              超简单，马上就能开始写日记啦~ 📝
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 步骤 1 */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors">
                创建账户 ✨
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                注册个超可爱的账户吧~
              </p>
            </div>

            {/* 步骤 2 */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors">
                开始写作 📝
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                记录下今天发生的有趣事情~
              </p>
            </div>

            {/* 步骤 3 */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                分析回顾 📊
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                看看自己的心情变化吧！
              </p>
            </div>
          </div>

          {/* 底部 CTA */}
          <div className="mt-16 text-center">
            <button
              onClick={handleStartClick}
              className="inline-flex items-center justify-center gap-3 px-12 py-5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-bold text-lg rounded-2xl hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 transition-all hover:scale-105 shadow-xl hover:shadow-2xl group"
            >
              <Zap className="w-6 h-6 group-hover:animate-pulse" />
              <span>{isAuthenticated ? '查看我的日记' : '现在就开始吧！'}</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="mt-6 text-gray-500 dark:text-gray-400 text-sm">
              免费使用 • 随时可以退出 ✨
            </p>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 dark:from-gray-800 dark:via-purple-900/30 dark:to-blue-900/30 border-t border-pink-200 dark:border-purple-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center">
            <div className="text-4xl mb-4">✨</div>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
              © 2026 Mio 的日记本
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              用心记录每一个美好瞬间 ✨ 陪伴你的每一天 🌸
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Features;