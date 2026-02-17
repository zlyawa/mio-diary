import { useState, useEffect, useCallback, useRef } from 'react';
import { Bookmark, FolderPlus, X, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

/**
 * 收藏按钮组件
 */
const FavoriteButton = ({ diaryId, initialFavorited = false, size = 'md' }) => {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const abortControllerRef = useRef(null);

  // 尺寸配置
  const sizeConfig = {
    sm: { icon: 14, button: 'px-2.5 py-1.5 text-xs gap-1' },
    md: { icon: 16, button: 'px-3 py-2 text-sm gap-1.5' },
    lg: { icon: 18, button: 'px-4 py-2 text-base gap-2' }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  /**
   * 获取收藏状态
   */
  const fetchFavoriteStatus = useCallback(async () => {
    if (!diaryId || !user) return;
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      // 获取我的收藏列表检查是否已收藏
      const response = await api.get('/interactions/favorites', {
        params: { limit: 100 },
        signal: abortControllerRef.current.signal
      });
      const isFavorited = response.data.favorites.some(f => f.diaryId === diaryId);
      setFavorited(isFavorited);
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return; // 忽略取消的请求
      }
      console.error('获取收藏状态失败:', err);
    }
  }, [diaryId, user]);

  useEffect(() => {
    fetchFavoriteStatus();
    
    return () => {
      // 组件卸载时取消请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFavoriteStatus]);

  /**
   * 获取收藏夹列表
   */
  const fetchFolders = useCallback(async () => {
    try {
      const response = await api.get('/interactions/folders');
      setFolders(response.data.folders || []);
    } catch (err) {
      console.error('获取收藏夹失败:', err);
    }
  }, []);

  /**
   * 打开收藏弹窗
   */
  const handleOpen = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    if (favorited) {
      // 如果已收藏，直接取消收藏
      handleToggle();
      return;
    }

    // 获取收藏夹列表
    await fetchFolders();
    setShowModal(true);
  };

  /**
   * 切换收藏状态
   */
  const handleToggle = async (folderId = null) => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await api.post('/interactions/favorite', {
        diaryId,
        folderId
      });
      setFavorited(response.data.favorited);
      
      if (response.data.favorited) {
        setShowModal(false);
      }
    } catch (err) {
      console.error('收藏操作失败:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 创建新收藏夹
   */
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      const response = await api.post('/interactions/folders', {
        name: newFolderName.trim()
      });
      setFolders([...folders, response.data.folder]);
      setNewFolderName('');
    } catch (err) {
      console.error('创建收藏夹失败:', err);
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={loading}
        className={`
          ${config.button}
          rounded-lg
          inline-flex items-center
          transition-colors
          ${favorited
            ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }
          ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <Bookmark
          size={config.icon}
          className={`${favorited ? 'fill-current' : ''}`}
        />
        <span>{favorited ? '已收藏' : '收藏'}</span>
      </button>

      {/* 收藏夹选择弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md animate-scaleIn">
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                收藏到
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* 收藏夹列表 */}
            <div className="max-h-64 overflow-y-auto p-4 space-y-2">
              {/* 默认收藏夹 */}
              <button
                onClick={() => handleToggle(null)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">默认收藏夹</span>
                <Check size={18} className="text-indigo-600" />
              </button>

              {/* 自定义收藏夹 */}
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleToggle(folder.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FolderPlus size={18} className="text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{folder.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">{folder.count} 篇</span>
                </button>
              ))}
            </div>

            {/* 创建新收藏夹 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="新建收藏夹"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  maxLength={50}
                />
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || creatingFolder}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FavoriteButton;
