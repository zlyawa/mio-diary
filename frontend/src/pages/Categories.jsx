import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit3,
  Trash2,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Palette,
  X,
  AlertCircle,
  BookOpen,
  ArrowLeft,
  MoreVertical,
} from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
// import ErrorMessage from '../components/common/ErrorMessage';

/**
 * 预设颜色列表
 */
const PRESET_COLORS = [
  '#FF6B6B', // 红色
  '#FF8E53', // 橙色
  '#FFCD56', // 黄色
  '#4BC0C0', // 青色
  '#36A2EB', // 蓝色
  '#9966FF', // 紫色
  '#FF99CC', // 粉色
  '#8B4513', // 棕色
  '#2C3E50', // 深蓝灰
  '#27AE60', // 绿色
  '#F39C12', // 金黄色
  '#E74C3C', // 深红色
  '#9B59B6', // 深紫色
  '#1ABC9C', //  turquoise
  '#34495E', // 灰色
];

/**
 * 递归渲染分类树
 */
const CategoryTreeItem = ({
  category,
  level,
  expandedIds,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddChild,
  onCategoryClick,
  renderCategory,
}) => {
  const isExpanded = expandedIds.has(category.id);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div className="category-tree-item">
      <div
        className={`flex items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group ${
          level > 0 ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''
        }`}
      >
        {/* 展开/折叠按钮 */}
        <button
          onClick={() => onToggleExpand(category.id)}
          className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
            hasChildren
              ? 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'
              : 'invisible'
          }`}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* 颜色标识 */}
        <div
          className="w-4 h-4 rounded-full flex-shrink-0 border border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: category.color || '#9CA3AF' }}
        />

        {/* 文件夹图标 */}
        <div className="text-gray-500 dark:text-gray-400">
          {hasChildren && isExpanded ? <FolderOpen size={18} /> : <Folder size={18} />}
        </div>

        {/* 分类名称 - 可点击跳转到日记列表 */}
        <button
          onClick={() => onCategoryClick(category)}
          className="flex-1 font-medium text-gray-900 dark:text-white truncate text-left hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          title="查看该分类下的日记"
        >
          {category.name}
        </button>

        {/* 日记数量 */}
        <button
          onClick={() => onCategoryClick(category)}
          className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          title="查看该分类下的日记"
        >
          {category.diaryCount || 0} 篇
        </button>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {level < 2 && (
            <button
              onClick={() => onAddChild(category)}
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
              title="添加子分类"
            >
              <Plus size={16} />
            </button>
          )}
          <button
            onClick={() => onEdit(category)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="编辑"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => onDelete(category)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* 子分类 */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {category.children.map((child) =>
            renderCategory(child, level + 1)
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 分类管理页面
 */
const Categories = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState(new Set());

  // 模态框状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    parentId: '',
    color: '#4BC0C0',
  });

  // 删除确认模态框
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [targetCategoryId, setTargetCategoryId] = useState('');

  /**
   * 获取分类列表
   */
  const fetchCategories = useCallback(async () => {
    // 未登录时不请求
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await api.get('/categories');
      setCategories(response.data.categories || []);
      setFlatCategories(response.data.flatCategories || []);
    } catch (err) {
      console.error('获取分类失败:', err);
      // 认证错误静默处理，不显示错误提示
      if (!err.isAuthError) {
        toast.error(err.response?.data?.message || '获取分类失败');
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
    } else {
      setIsLoading(false);
    }
  }, [fetchCategories, isAuthenticated]);

  /**
   * 切换展开/折叠
   */
  const toggleExpand = useCallback((id) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  /**
   * 展开所有
   */
  const expandAll = useCallback(() => {
    const allIds = new Set();
    const collectIds = (cats) => {
      cats.forEach((cat) => {
        allIds.add(cat.id);
        if (cat.children) collectIds(cat.children);
      });
    };
    collectIds(categories);
    setExpandedIds(allIds);
  }, [categories]);

  /**
   * 折叠所有
   */
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  /**
   * 打开创建模态框
   */
  const openCreateModal = (parentCategory = null) => {
    setModalMode('create');
    setEditingCategory(null);
    setFormData({
      name: '',
      parentId: parentCategory?.id || '',
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
    });
    setIsModalOpen(true);
  };

  /**
   * 打开编辑模态框
   */
  const openEditModal = (category) => {
    setModalMode('edit');
    setEditingCategory(category);
    setFormData({
      name: category.name,
      parentId: category.parentId || '',
      color: category.color || '#4BC0C0',
    });
    setIsModalOpen(true);
  };

  /**
   * 关闭模态框
   */
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', parentId: '', color: '#4BC0C0' });
  };

  /**
   * 提交表单
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }

    try {
      if (modalMode === 'create') {
        await api.post('/categories', {
          name: formData.name.trim(),
          parentId: formData.parentId || null,
          color: formData.color,
        });
      } else {
        await api.put(`/categories/${editingCategory.id}`, {
          name: formData.name.trim(),
          color: formData.color,
        });
      }
      
      closeModal();
      await fetchCategories();
    } catch (err) {
      console.error('保存分类失败:', err);
      toast.error(err.response?.data?.message || '保存失败');
    }
  };

  /**
   * 打开删除确认框
   */
  const openDeleteModal = (category) => {
    setDeletingCategory(category);
    setTargetCategoryId('');
    setIsDeleteModalOpen(true);
  };

  /**
   * 关闭删除确认框
   */
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingCategory(null);
    setTargetCategoryId('');
  };

  /**
   * 删除分类
   */
  const handleDelete = async () => {
    if (!deletingCategory) return;

    try {
      await api.delete(`/categories/${deletingCategory.id}`, {
        data: {
          targetCategoryId: targetCategoryId || null,
        },
      });
      
      closeDeleteModal();
      await fetchCategories();
    } catch (err) {
      console.error('删除分类失败:', err);
      toast.error(err.response?.data?.message || '删除失败');
    }
  };

  /**
   * 点击分类，跳转到日记列表
   */
  const handleCategoryClick = useCallback((category) => {
    navigate(`/diaries?categoryId=${category.id}`);
  }, [navigate]);

  /**
   * 渲染分类树
   */
  const renderCategory = useCallback(
    (category, level = 0) => (
      <CategoryTreeItem
        key={category.id}
        category={category}
        level={level}
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        onAddChild={openCreateModal}
        onCategoryClick={handleCategoryClick}
        renderCategory={renderCategory}
      />
    ),
    [expandedIds, toggleExpand, handleCategoryClick]
  );

  /**
   * 获取可选的目标分类（排除要删除的分类及其子分类）
   */
  const getAvailableTargetCategories = () => {
    if (!deletingCategory) return [];

    const excludeIds = new Set([deletingCategory.id]);
    
    // 递归收集所有子分类ID
    const collectChildrenIds = (cats) => {
      cats.forEach((cat) => {
        if (cat.parentId === deletingCategory.id || excludeIds.has(cat.parentId)) {
          excludeIds.add(cat.id);
          collectChildrenIds(cats);
        }
      });
    };
    
    collectChildrenIds(flatCategories);
    
    return flatCategories.filter((cat) => !excludeIds.has(cat.id));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              返回
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              分类管理
            </h1>
          </div>
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <Plus size={20} />
            新建分类
          </button>
        </div>

        {/* 错误提示 */}
        {/* <ErrorMessage message={error} /> */}

        {/* 统计和操作栏 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <span>总分类: <strong className="text-gray-900 dark:text-white">{flatCategories.length}</strong></span>
              <span>
                日记总数:{" "}
                <strong className="text-gray-900 dark:text-white">
                  {flatCategories.reduce((sum, cat) => sum + (cat.diaryCount || 0), 0)}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                展开全部
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                折叠全部
              </button>
            </div>
          </div>
        </div>

        {/* 分类列表 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <LoadingSpinner size="large" />
            </div>
          ) : categories.length > 0 ? (
            <div className="p-4">
              {categories.map((category) => renderCategory(category))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                还没有分类
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                创建分类来更好地组织你的日记
              </p>
              <button
                onClick={() => openCreateModal()}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <Plus size={18} />
                创建第一个分类
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 创建/编辑模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {modalMode === 'create' ? '新建分类' : '编辑分类'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* 分类名称 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  分类名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="输入分类名称"
                  maxLength={50}
                />
              </div>

              {/* 父分类选择（仅创建时显示） */}
              {modalMode === 'create' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    父分类
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">-- 作为顶级分类 --</option>
                    {flatCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 颜色选择 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  颜色标识
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        formData.color === color
                          ? 'border-gray-900 dark:border-white scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">自定义:</span>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {formData.color.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* 按钮 */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  {modalMode === 'create' ? '创建' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {isDeleteModalOpen && deletingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                确认删除
              </h2>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              确定要删除分类 <strong>"{deletingCategory.name}"</strong> 吗？
              {deletingCategory.children?.length > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  该分类包含 {deletingCategory.children.length} 个子分类，将一并删除。
                </span>
              )}
            </p>

            {/* 目标分类选择 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                将该分类下的日记移动至
              </label>
              <select
                value={targetCategoryId}
                onChange={(e) => setTargetCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">-- 设为无分类 --</option>
                {getAvailableTargetCategories().map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                不选择则将日记设为无分类状态
              </p>
            </div>

            {/* 按钮 */}
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;