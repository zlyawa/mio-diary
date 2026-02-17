import React, { useRef, useEffect, useMemo } from 'react';
import ReactQuill from 'react-quill';
import DOMPurify from 'dompurify';
import 'react-quill/dist/quill.snow.css';

/**
 * Quill编辑器工具栏配置
 */
const toolbarOptions = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ size: ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ align: [] }],
  ['link', 'blockquote', 'code-block'],
  ['clean'],
];

/**
 * Quill编辑器格式配置
 */
const formats = [
  'header',
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'link',
  'blockquote',
  'code-block',
  'color',
  'background',
  'align',
];

/**
 * Quill富文本编辑器组件
 * 提供富文本编辑功能，支持多种格式和样式
 */
const QuillEditor = ({ 
  value = '', 
  onChange, 
  placeholder = '开始写下你的故事...',
  disabled = false,
  label = '内容',
  required = false
}) => {
  const quillRef = useRef(null);
  const editorRef = useRef(null);

  /**
   * 编辑器模块配置（带XSS防护）
   */
  const modules = useMemo(() => ({
    toolbar: toolbarOptions,
    clipboard: {
      matchVisual: false,
      // 自定义粘贴处理，对粘贴内容进行XSS过滤
      matchers: [
        // 过滤危险的HTML标签和属性
        ['script', () => ''],
        ['iframe', () => ''],
        ['object', () => ''],
        ['embed', () => ''],
        ['form', () => ''],
      ],
    },
  }), []);

  /**
   * 处理粘贴事件，净化粘贴内容
   */
  useEffect(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const handlePaste = (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      // 获取HTML内容
      let html = clipboardData.getData('text/html');
      if (html) {
        e.preventDefault();
        
        // 使用DOMPurify净化HTML
        const clean = DOMPurify.sanitize(html, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'span', 'div'],
          ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
          ALLOW_DATA_ATTR: false,
        });
        
        // 插入净化后的内容
        const selection = quill.getSelection(true);
        quill.clipboard.dangerouslyPasteHTML(selection.index, clean);
      }
    };

    const editorRoot = quill.root;
    editorRoot.addEventListener('paste', handlePaste, true);

    return () => {
      editorRoot.removeEventListener('paste', handlePaste, true);
    };
  }, []);

  /**
   * 处理编辑器内容变化
   */
  const handleChange = (content, delta, source, editor) => {
    if (onChange) {
      onChange(content);
    }
  };

  /**
   * 聚焦编辑器
   */
  const focus = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  /**
   * 清空编辑器
   */
  const clear = () => {
    if (editorRef.current) {
      editorRef.current.getEditor().setText('');
    }
  };

  /**
   * 暴露方法给父组件
   */
  useEffect(() => {
    if (quillRef.current && quillRef.current.getEditor) {
      editorRef.current = quillRef.current.getEditor();
    }
  }, []);

  return (
    <div className="mb-6">
      {/* 标签 */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* 编辑器容器 */}
      <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          modules={modules}
          formats={formats}
          readOnly={disabled}
          className="dark:text-gray-200 [&_.ql-editor]:min-h-[200px] [&_.ql-toolbar]:bg-gray-50 dark:[&_.ql-toolbar]:bg-gray-700 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-gray-200 dark:[&_.ql-toolbar]:border-gray-600"
        />
      </div>

      {/* 提示文本 */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <span>支持富文本格式：标题、列表、链接、代码块等</span>
        
      </div>
    </div>
  );
};

export default QuillEditor;