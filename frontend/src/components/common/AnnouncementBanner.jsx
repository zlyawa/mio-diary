import { useState, useEffect } from 'react';
import { X, Bell, AlertTriangle, Info, CheckCircle, Megaphone } from 'lucide-react';
import DOMPurify from 'dompurify';
import api from '../../utils/api';

/**
 * 公告横幅组件
 * 从后端获取并显示系统公告
 */
const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(new Set());
  const [loading, setLoading] = useState(true);

  /**
   * 获取公告列表
   */
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await api.get('/config/announcements');
        const activeAnnouncements = (response.data.announcements || []).filter(a => a.isActive);
        setAnnouncements(activeAnnouncements);
      } catch (err) {
        console.error('获取公告失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  /**
   * 自动轮播公告
   */
  useEffect(() => {
    if (announcements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  /**
   * 从本地存储读取已关闭的公告
   */
  useEffect(() => {
    const saved = localStorage.getItem('dismissedAnnouncements');
    if (saved) {
      try {
        setDismissed(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('解析已关闭公告失败:', e);
      }
    }
  }, []);

  /**
   * 关闭公告
   */
  const handleDismiss = (id) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(id);
    setDismissed(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify([...newDismissed]));
  };

  /**
   * 获取公告样式配置
   */
  const getTypeConfig = (type) => {
    const configs = {
      info: {
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-800 dark:text-blue-200',
        icon: Info,
        iconColor: 'text-blue-500'
      },
      warning: {
        bg: 'bg-amber-50 dark:bg-amber-900/30',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-800 dark:text-amber-200',
        icon: AlertTriangle,
        iconColor: 'text-amber-500'
      },
      success: {
        bg: 'bg-green-50 dark:bg-green-900/30',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-800 dark:text-green-200',
        icon: CheckCircle,
        iconColor: 'text-green-500'
      },
      error: {
        bg: 'bg-red-50 dark:bg-red-900/30',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-800 dark:text-red-200',
        icon: AlertTriangle,
        iconColor: 'text-red-500'
      },
      announcement: {
        bg: 'bg-purple-50 dark:bg-purple-900/30',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-800 dark:text-purple-200',
        icon: Megaphone,
        iconColor: 'text-purple-500'
      }
    };
    return configs[type] || configs.info;
  };

  // 加载中或没有公告时不显示
  if (loading || announcements.length === 0) return null;

  // 过滤已关闭的公告
  const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id));
  if (visibleAnnouncements.length === 0) return null;

  // 当前显示的公告
  const currentAnnouncement = visibleAnnouncements[currentIndex % visibleAnnouncements.length];
  const typeConfig = getTypeConfig(currentAnnouncement.type);
  const IconComponent = typeConfig.icon;

  return (
    <div className={`relative z-40 ${typeConfig.bg} border-b ${typeConfig.border} transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <IconComponent className={`w-5 h-5 flex-shrink-0 ${typeConfig.iconColor}`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {currentAnnouncement.isPinned && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
                    置顶
                  </span>
                )}
                <span className={`font-medium ${typeConfig.text} truncate`}>
                  {currentAnnouncement.title}
                </span>
              </div>
              <p 
                className={`text-sm ${typeConfig.text} opacity-80 truncate mt-0.5`}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentAnnouncement.content, { ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'a', 'br'], ALLOWED_ATTR: ['href', 'target', 'rel'] }) }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {/* 公告指示器 */}
            {visibleAnnouncements.length > 1 && (
              <div className="flex items-center gap-1">
                {visibleAnnouncements.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex % visibleAnnouncements.length
                        ? `${typeConfig.iconColor.replace('text-', 'bg-')} w-4`
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* 关闭按钮 */}
            <button
              onClick={() => handleDismiss(currentAnnouncement.id)}
              className={`p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${typeConfig.text}`}
              title="关闭公告"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
