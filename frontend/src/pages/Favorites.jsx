import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Folder, Trash2, ExternalLink, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
// import ErrorMessage from '../components/common/ErrorMessage';
import api from '../utils/api';

/**
 * 我的收藏页面
 */
const Favorites = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  /**
   * 获取收藏列表
   */
  const fetchFavorites = useCallback(async (reset = false, targetPage) => {
    // 未登录时不请求
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const currentPage = reset ? 1 : (targetPage !== undefined ? targetPage : page);
      
      const params = {
        page: currentPage,
        limit: 20
      };
      
      if (selectedFolder) {
        params.folderId = selectedFolder;
      }

      const response = await api.get('/interactions/favorites', { params });
      
      const newFavorites = response.data.favorites || [];
      
      if (reset) {
        setFavorites(newFavorites);
        setPage(1);
      } else {
        setFavorites(prev => [...prev, ...newFavorites]);
      }
      
      setHasMore(newFavorites.length === 20);
    } catch (err) {
      // 认证错误静默处理，不显示错误提示
      if (!err.isAuthError) {
        toast.error('获取收藏列表失败');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, selectedFolder, toast, isAuthenticated]);

  /**
   * 获取收藏夹列表
   */
  const fetchFolders = useCallback(async () => {
    // 未登录时不请求
    if (!isAuthenticated) return;
    
    try {
      const response = await api.get('/interactions/folders');
      setFolders(response.data.folders || []);
    } catch (err) {
      console.error('获取收藏夹失败:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFolders();
      fetchFavorites(true);
    } else {
      setLoading(false);
    }
  }, [fetchFolders, fetchFavorites, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites(true);
    }
  }, [selectedFolder, isAuthenticated]);

  /**
   * 取消收藏
   */
  const handleRemoveFavorite = async (favoriteId) => {
    if (!window.confirm('确定要取消收藏这篇日记吗？')) return;

    try {
      await api.post('/interactions/favorite', {
        diaryId: favorites.find(f => f.id === favoriteId)?.diaryId
      });
      
      setFavorites(prev => prev.filter(f => f.id !== favoriteId));
    } catch (err) {
      console.error('取消收藏失败:', err);
      toast.error('取消收藏失败');
    }
  };

  /**
   * 加载更多
   */
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFavorites(false, nextPage);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Bookmark className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            我的收藏
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            共收藏 {favorites.length} 篇日记
          </p>
        </div>

        {/* <ErrorMessage message={error} /> */}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 侧边栏 - 收藏夹 */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Folder size={18} />
                收藏夹
              </h2>
              
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedFolder(null)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedFolder === null
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>全部收藏</span>
                  <span className="text-xs text-gray-400">
                    {folders.reduce((sum, f) => sum + (f.count || 0), 0)}
                  </span>
                </button>
                
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedFolder === folder.id
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="truncate">{folder.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{folder.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 收藏列表 */}
          <div className="flex-1">
            {loading && favorites.length === 0 ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : favorites.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
                <Bookmark className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  还没有收藏
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  看到喜欢的日记就收藏起来吧
                </p>
                <button
                  onClick={() => navigate('/diaries')}
                  className="btn-primary px-6 py-2 rounded-full"
                >
                  去浏览日记
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {favorites.map((favorite) => (
                  <div
                    key={favorite.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div
                        onClick={() => navigate(`/diaries/${favorite.diary.id}`)}
                        className="flex-1 cursor-pointer"
                      >
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                          {favorite.diary.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                          {favorite.diary.content?.replace(/<[^>]*>/g, '').slice(0, 150)}...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>作者：{favorite.diary.user?.username}</span>
                          <span>
                            {new Date(favorite.diary.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => navigate(`/diaries/${favorite.diary.id}`)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          title="查看"
                        >
                          <ExternalLink size={18} />
                        </button>
                        <button
                          onClick={() => handleRemoveFavorite(favorite.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="取消收藏"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 加载更多 */}
                {hasMore && (
                  <div className="text-center pt-4">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="px-6 py-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? '加载中...' : '加载更多'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Favorites;
