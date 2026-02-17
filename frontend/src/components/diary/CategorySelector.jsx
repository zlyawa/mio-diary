import { useState, useEffect, useRef, useCallback } from 'react';
import { Folder, ChevronDown, X } from 'lucide-react';
import api from '../../utils/api';

/**
 * 递归渲染分类选项
 */
const CategoryOption = ({ category, level = 0 }) => {
  const indent = level * 20;
  
  return (
    <>
      <option 
        value={category.id}
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {'  '.repeat(level)}{level > 0 ? '└─ ' : ''}{category.name}
      </option>
      {category.children?.map((child) => (
        <CategoryOption key={child.id} category={child} level={level + 1} />
      ))}
    </>
  );
};

/**
 * 分类选择器组件
 * @param {string} value - 当前选中的分类ID
 * @param {function} onChange - 选择变化时的回调
 * @param {boolean} disabled - 是否禁用
 */
const CategorySelector = ({ value, onChange, disabled = false }) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 获取分类列表
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/categories');
        setCategories(response.data.categories || []);
      } catch (err) {
        console.error('获取分类失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取选中的分类信息
  const getSelectedCategory = useCallback(() => {
    const findCategory = (cats, id) => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        if (cat.children) {
          const found = findCategory(cat.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    return findCategory(categories, value);
  }, [categories, value]);

  // 渲染扁平化的分类列表（用于下拉选择）
  const renderFlatCategories = (cats, level = 0) => {
    const result = [];
    cats.forEach((cat) => {
      result.push({ ...cat, level });
      if (cat.children?.length > 0) {
        result.push(...renderFlatCategories(cat.children, level + 1));
      }
    });
    return result;
  };

  const flatCategories = renderFlatCategories(categories);
  const selectedCategory = getSelectedCategory();

  // 获取分类的完整路径名称
  const getCategoryPath = (catId) => {
    const findPath = (cats, id, path = []) => {
      for (const cat of cats) {
        if (cat.id === id) {
          return [...path, cat.name];
        }
        if (cat.children) {
          const result = findPath(cat.children, id, [...path, cat.name]);
          if (result) return result;
        }
      }
      return null;
    };
    return findPath(categories, catId);
  };

  const selectedPath = value ? getCategoryPath(value) : null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 选择框 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-colors ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-600'
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <Folder
            size={18}
            className={selectedCategory?.color ? '' : 'text-gray-400'}
            style={{ color: selectedCategory?.color || undefined }}
          />
          <span className={!selectedCategory ? 'text-gray-400' : ''}>
            {selectedPath ? selectedPath.join(' / ') : '选择分类'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              <X size={14} className="text-gray-400" />
            </button>
          )}
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* 下拉列表 */}
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              加载中...
            </div>
          ) : flatCategories.length > 0 ? (
            <>
              {/* 无分类选项 */}
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  !value ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <Folder size={16} className="text-gray-400" />
                <span>无分类</span>
              </button>

              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* 分类列表 */}
              {flatCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    onChange(category.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    value === category.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  style={{ paddingLeft: `${(category.level * 16) + 16}px` }}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color || '#9CA3AF' }}
                  />
                  <Folder
                    size={16}
                    style={{ color: category.color || '#9CA3AF' }}
                  />
                  <span className="truncate">{category.name}</span>
                </button>
              ))}
            </>
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              暂无分类，请先创建
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategorySelector;