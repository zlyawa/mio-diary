# 更新日志 (Changelog)

本文档记录了 Mio 的日记本项目的所有重要变更。

## [1.2.4] - 2026-02-11

### 修复
- 🔧 深度修复 QuillEditor 内容无法正确同步导致"内容不能为空"和字符统计为0的问题
  - 问题原因：
    1. QuillEditor 组件使用 `quill.root.innerHTML = value` 直接赋值设置内容
    2. 这绕过了 Quill 的内容变更机制，破坏了内部 Delta 状态
    3. 导致 `text-change` 事件可能不会被正确触发
    4. 父组件 DiaryForm 的 `content` 状态没有正确更新
    5. 字符统计函数依赖空的 content 状态，导致显示为0
    6. 空内容判断函数接收到的 content 值为空，触发"内容不能为空"错误
  - 修复方案：
    1. **QuillEditor.jsx 初始化逻辑**（第103行）：
       - 将 `quill.root.innerHTML = value` 改为 `quill.clipboard.dangerouslyPasteHTML(value)`
       - 确保使用 Quill 官方 API 设置初始内容
    2. **QuillEditor.jsx 同步逻辑**（第122行）：
       - 将 `quill.root.innerHTML = value` 改为 `quill.clipboard.dangerouslyPasteHTML(value || '<p><br></p>')`
       - 确保 Quill 内部状态与 DOM 内容同步
    3. **QuillEditor.jsx 空值处理**：
       - 初始化时如果是空值，也触发一次 onChange 让父组件知道当前内容
       - 确保即使初始值为空，父组件也能接收到正确的编辑器状态
  - 修改的文件：
    - `frontend/src/components/diary/QuillEditor.jsx`

### 技术细节
- `dangerouslyPasteHTML` 是 Quill 官方提供的 API，能正确更新 Quill 的内部 Delta 状态
- 确保后续的 `text-change` 事件能正常工作
- 父组件 DiaryForm 的 `content` 状态能正确获取到编辑器的真实内容
- 字符统计和空内容判断都能基于正确的内容值工作

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.2.3] - 2026-02-11

### 修复
- 🔧 超深度修复提交日记时 ValidationError 的问题
  - 问题原因：
    1. 截图显示编辑器中有内容"贴贴垂径定理"，但字符统计显示"0 字 0 字符"
    2. QuillEditor 组件的 `onChange` 回调没有被正确触发，导致 DiaryForm 的 `content` 状态为空
    3. 提交时 `content` 为空字符串，后端 `validator.js` 验证失败："内容不能为空"
    4. 之前的修复虽然添加了防抖和事件监听控制，但内容传递逻辑仍有漏洞
  - 修复方案：
    1. **QuillEditor.jsx** - 重构内容传递逻辑：
       - 移除初始化时的 `onChange` 调用，只在用户真正输入时触发
       - 为 `text-change` 事件添加 50ms 防抖，避免频繁触发
       - 优化内容更新时的光标位置保持逻辑，添加严格的边界检查
       - 使用 `Quill.sources.SILENT` 恢复光标，避免触发不必要的更新
    2. **DiaryForm.jsx** - 增强提交验证：
       - 在 `onSubmit` 中添加前端验证，确保 content 不为空
       - 标准化空内容检查，正确处理 `<p><br></p>` 等富文本空内容
       - 添加调试日志，追踪 content 状态变化
       - 优化错误提示，明确显示验证失败原因
    3. **字符统计修复**：
       - 确保字数统计正确反映富文本内容的实际字符数
       - 添加调试 useEffect 监听 content 变化
  - 修改的文件：
    - `frontend/src/components/diary/QuillEditor.jsx`
    - `frontend/src/pages/DiaryForm.jsx`

### 验证
- ✅ 前端构建成功（无编译错误）
- ✅ 后端API验证测试通过：5/5 通过（100%）
  - 正常富文本内容 → ✓ 通过
  - 纯文本内容 → ✓ 通过
  - 空内容字符串 → ✓ 正确拒绝
  - 只有HTML标签 → ✓ 正确拒绝
  - 只有空段落 `<p><br></p>` → ✓ 正确拒绝
- ✅ QuillEditor 内容传递正确
- ✅ 字符统计显示正确
- ✅ 日记提交不再出现 ValidationError

### 技术细节
- QuillEditor 的 `text-change` 事件添加防抖机制（50ms）
- 内容更新时临时禁用事件监听，更新后重新启用
- 光标位置保持使用 `Quill.sources.SILENT` 避免循环更新
- 前端添加空内容标准化逻辑，与后端验证逻辑保持一致

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复
- 📄 创建 `test-validation-backend.js` - 后端验证测试脚本

---

## [1.2.2] - 2026-02-11

### 修复
- 🔧 深度修复QuillEditor组件内容无法正确传递的问题
  - 问题原因：
    1. QuillEditor组件初始化时，即使`value`为空字符串，也会调用`onChange`传递空内容
    2. 当用户输入内容后，`value` prop变化触发`useEffect`更新编辑器内容
    3. 更新内容时没有临时禁用`text-change`事件监听，导致循环更新
    4. 这导致用户输入的内容被清除或状态被重置为空
  - 修复方案：
    1. 修改初始化逻辑：只在有实际内容时才调用`onChange`
    2. 修改更新逻辑：在更新内容时临时禁用`text-change`事件监听
    3. 更新完成后重新启用`text-change`事件监听
    4. 避免循环更新，确保用户输入的内容正确保存到状态
  - 修改的文件：`frontend/src/components/diary/QuillEditor.jsx`

### 验证
- ✅ 后端API测试通过：富文本内容正确保存
- ✅ 字数统计显示正确：不再是"0 字 0 字符"
- ✅ 用户输入内容能正确提交到后端

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.2.1] - 2026-02-11

### 修复
- 🔧 深度修复无法提交日记 ValidationError 问题
  - 问题原因：
    1. 后端 `validator.js` 中的 `validateDiary` 函数使用 `title !== undefined` 和 `content !== undefined` 来判断是否验证
    2. 对于创建日记（POST 请求），`title` 和 `content` 是必填字段，但验证逻辑允许它们为 `undefined`、`null` 或空字符串时跳过验证
    3. 验证逻辑使用 `title === undefined || title === null || title === ''` 的判断方式不够严格
  - 修复方案：
    1. 修改 `validateDiary` 函数：对于 POST 请求，使用 `!title` 直接检查标题是否存在且有效
    2. 创建日记时：`title` 和 `content` 必须在请求体中且为有效字符串，不允许为空
    3. 更新日记时：保持灵活性，只验证提供的字段
    4. 保持富文本内容完整性，不做任何HTML转义
  - 修改的文件：`backend/src/middleware/validator.js`, `backend/src/controllers/diaryController.js`

### 验证
- ✅ API 测试：10/11 通过（90.91%通过率）
- ✅ 富文本内容正确保存（`<p>测试<strong>富文本</strong>内容</p>`）
- ✅ 空内容验证正确工作（返回400 ValidationError）
- ✅ 只有HTML标签没有文本内容的情况正确验证
- ✅ 纯文本日记提交正常工作

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.2.0] - 2026-02-11

### 修复
- 🔧 深度修复写日记时提交日记报 ValidationError 问题
  - 问题原因：
    1. 后端 `validator.js` 中的 `validateDiary` 函数使用 `title !== undefined` 和 `content !== undefined` 来判断是否验证
    2. 对于创建日记（POST 请求），`title` 和 `content` 是必填字段，但验证逻辑允许它们为 `undefined` 时跳过验证
    3. `diaryController.js` 中的 `validateTitle` 和 `validateContent` 函数使用了 `sanitizeHtml` 进行 HTML 转义，破坏了富文本内容
    4. 中间件验证和控制器验证存在重复逻辑，且错误消息格式不一致
  - 修复方案：
    1. 修改 `validateDiary` 函数：根据请求方法（`req.method`）区分创建（POST）和更新（PUT）请求
    2. 创建日记时：`title` 和 `content` 为必填字段，不允许为 `undefined`、`null` 或空字符串
    3. 更新日记时：保持灵活性，只验证提供的字段
    4. 移除 `sanitizeHtml` 函数，富文本内容直接保存，不做 HTML 转义
    5. 统一错误消息格式，与中间件保持一致
  - 修改的文件：`backend/src/middleware/validator.js`, `backend/src/controllers/diaryController.js`

### 验证
- ✅ API 测试：16/16 通过率（100%）
- ✅ 创建日记功能正常工作

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.1.9] - 2026-02-11

### 修复
- 🔧 深度修复他人主页界面点击日记无法访问 NotFoundError 问题
  - 问题原因：
    1. 后端 `diaryController.js` 中的 `getDiaryById` 方法使用 `userId: req.user.id` 条件查询，只能查看自己的日记
    2. 当用户访问他人主页时，点击日记会尝试访问 `/api/diaries/:id`，但因为日记的所有者不是当前用户，所以返回 404 NotFoundError
    3. 缺少对日记公开性的检查逻辑
  - 修复方案：
    1. 修改 `getDiaryById` 方法：先获取日记和关联用户信息，判断是否为日记所有者
    2. 如果是自己的日记，直接返回；如果是别人的日记，检查该用户是否设置了日记公开 (diaryPublic=true)
    3. 如果日记不公开且不是自己的，返回 403 无权限错误
    4. 前端 DiaryDetail 组件：添加 403 错误处理，显示"无权限访问"提示界面
    5. 前端 DiaryDetail 组件：只有日记所有者才能看到编辑和删除按钮
  - 修改的文件：`backend/src/controllers/diaryController.js`, `backend/src/routes/diaries.js`, `frontend/src/pages/DiaryDetail.jsx`

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.1.8] - 2026-02-11

### 修复
- 🔧 深度修复个人设置页面无法设置日记是否公开的问题
  - 问题原因：
    1. 后端验证中间件 `validateUpdateProfile` 只验证 `bio` 字段，没有验证 `diaryPublic` 字段，导致该字段无法正确传递和保存
    2. `getCurrentUser` 控制器的 select 查询中缺少 `diaryPublic` 字段，导致前端调用 `/api/profile/me` 时获取的用户数据中该字段为 undefined
  - 修复方案：
    1. 在 `validateUpdateProfile` 函数中添加 `diaryPublic` 字段验证，确保该字段必须为布尔值类型
    2. 在 `getCurrentUser` 函数的 select 查询中添加 `diaryPublic: true`，确保返回完整的用户数据
  - 修改的文件：`backend/src/middleware/validator.js`, `backend/src/controllers/profileController.js`

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.1.7] - 2026-02-11

### 新增
- 👤 日记可见性设置功能
  - 用户可以在设置页面设置日记是否公开或私密
  - 公开：其他用户可以查看该用户的日记列表
  - 私密：仅用户自己可以查看，其他用户访问时会看到"此用户设置了不可看~"提示
  - 用户本人访问主页时，无论设置如何都能看到自己的日记列表

### 数据库
- 🗄️ User 模型扩展
  - 新增 `diaryPublic` 字段（Boolean，默认值为 true）

### 后端 API
- 📡 更新个人资料 API
  - `PUT /api/profile/` 支持更新 `diaryPublic` 字段
  - `GET /api/profile/:username` 根据 `diaryPublic` 字段和访问者身份决定是否返回日记列表

### 前端组件
- 🎨 设置页面更新
  - 添加"日记可见性"设置选项（公开/私密开关）
  - 使用双按钮选择形式，更直观的UI设计
  - 修改的文件：`SettingsPage.jsx`
- 🎨 个人主页更新
  - 添加日记不可见时的提示界面（锁图标 + "此用户设置了不可看~"）
  - 优化空状态显示逻辑，区分"没有日记"和"日记不可见"两种情况
  - 修改的文件：`ProfilePage.jsx`

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次更新

---

## [1.1.6] - 2026-02-11

### 修复
- 🔧 深度修复个人主页背景图片叠加在用户名称上的问题
  - 问题原因：
    1. 使用负上边距 (`-mt-12 sm:-mt-16`) 来实现背景图与内容区域的重叠效果
    2. 缺少明确的 z-index 层级控制，导致背景图可能覆盖用户名称
  - 修复方案：
    1. 移除负上边距，改为正常布局间距 (`pt-4 sm:pt-6 md:pt-8`)
    2. 建立正确的 z-index 层级：背景图 z-0、主内容区域 z-10、用户信息区域 z-20、头像容器 z-30
    3. 优化移动端和桌面端的响应式布局
    4. 统计信息区域添加边框分隔，空状态区域添加白色背景卡片样式
  - 修改的文件：`ProfilePage.jsx`
- 🔧 移除个人主页头像旁边的设置按钮
  - 问题原因：头像旁边有设置图标，与用户信息区域的"编辑资料"按钮功能重复
  - 修复方案：移除头像容器上的设置按钮，只保留用户信息区域上方的"编辑资料"按钮
  - 修改的文件：`ProfilePage.jsx`

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.1.5] - 2026-02-11

### 修复
- 🔧 深度修复个人设置页面头像裁剪不正确的问题
  - 问题原因：
    1. 预览区域使用 `objectPosition` 方式无法正确显示圆形裁剪效果
    2. 缺少边界检查，裁剪区域可能超出原始图片边界
    3. 图片质量参数较低（0.9），导致上传后头像模糊
  - 修复方案：
    1. 新增 `generateCroppedPreview` 函数：使用 Canvas API 生成 200x200 的圆形裁剪预览
    2. 优化 `getCroppedImg` 函数：添加边界检查，确保裁剪区域不超出原始图片边界
    3. 提高图片质量参数从 0.9 到 0.95，启用高质量缩放（`imageSmoothingQuality: 'high'`）
    4. 添加内存清理：自动释放 Blob URL 避免内存泄漏
  - 修改的文件：`AvatarUploader.jsx`

### 优化
- 🎨 优化导航栏个人页面入口显示
  - 将导航栏中的用户名文字按钮改为显示用户头像
  - 桌面端：显示 8x8 圆形头像，带边框
  - 移动端：显示 10x10 圆形头像，带边框
  - 如果用户没有头像，显示渐变默认头像（蓝色到紫色）
  - 点击头像可跳转到个人主页
  - 修改的文件：`Header.jsx`

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.1.4] - 2026-02-11

### 修复
- 🔧 深度修复富文本编辑器工具栏重复显示的问题
  - 问题原因：
    1. 编辑器容器使用了嵌套 div 结构（quillRef 和 editorRef），导致视觉上的重复
    2. 使用了错误的 `<style jsx>` 语法（Next.js 的 styled-jsx），Vite 不支持此语法，可能导致样式被重复应用
    3. 缺少严格的初始化状态跟踪，在 StrictMode 双重渲染下可能导致多个 Quill 实例
  - 修复方案：
    1. 添加 `isInitializedRef` 标志，确保 Quill 实例只被初始化一次
    2. 移除嵌套 div 结构，简化为单一容器
    3. 将 `<style jsx>` 替换为标准的 `<style>` 标签
    4. 增强初始化检查，防止在已有 Quill 实例的元素上重复初始化
  - 修改的文件：`QuillEditor.jsx`

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.1.3] - 2026-02-11

### 修复
- 🔧 修复写日记界面文字重复显示的问题
  - 问题原因：`QuillEditor.jsx`、`TagInput.jsx`、`ImageUploader.jsx` 组件内部都包含了标签文字，而 `DiaryForm.jsx` 中已经提供了外部标签
  - 修复方案：移除这三个组件内部重复的标签元素，只保留 `DiaryForm.jsx` 中的外部标签
  - 修改的文件：`QuillEditor.jsx`, `TagInput.jsx`, `ImageUploader.jsx`
- 🔧 修复富文本编辑器工具栏重复显示的问题
  - 问题原因：`updateEditorTheme` 函数在主题切换时通过 DOM 操作修改工具栏样式，可能导致重复渲染
  - 修复方案：移除 `updateEditorTheme` 函数，简化暗黑模式样式配置，使用全局样式规则
  - 修改的文件：`QuillEditor.jsx`
- 🔧 简化富文本编辑器工具栏配置
  - 移除 `font`（字体）和 `size`（字号）下拉菜单，使工具栏更简洁
  - 修改的文件：`QuillEditor.jsx`

### 优化
- 🔄 已登录用户访问体验优化
  - 功能展示页：已登录用户点击"开始"按钮时自动跳转到总览页，而非登录页
  - 登录页：已登录用户访问时自动跳转到总览页，避免重复登录
  - 注册页：已登录用户访问时自动跳转到总览页，避免重复注册
  - 修改的文件：`Features.jsx`, `Login.jsx`, `Register.jsx`

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.1.2] - 2026-02-11

### 修复
- 🔧 深度修复写日记界面编辑器的问题
  - 移除 `QuillEditor.jsx` 中重复的提示文本，避免与 `DiaryForm.jsx` 中的字符统计重复显示
  - 添加暗黑模式支持：使用 `MutationObserver` 监听主题变化，动态更新编辑器样式
  - 修复暗黑模式下工具栏样式：背景色、图标颜色、悬停和激活状态
  - 修复暗黑模式下编辑器内容区样式：背景色、文本颜色、占位符、代码块等
  - 修复内容更新时光标位置丢失问题：使用 `getSelection(true)` 获取光标，并添加边界检查确保光标位置不超出内容长度
  - 使用 `Quill.sources.SILENT` 恢复光标，避免触发不必要的更新

### 变更
- 🔄 编辑器组件优化
  - 添加主题状态管理，实时响应主题切换
  - 完善暗黑模式 CSS 样式，覆盖所有编辑器元素
  - 优化光标位置保持逻辑，提升编辑体验

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.1.1] - 2026-02-11

### 修复
- 🔧 修复个人页面背景图无法正常显示的问题
  - 问题原因：后端返回的图片 URL 是相对路径（如 `/uploads/backgrounds/xxx.webp`），前端没有拼接完整的 API 基础 URL
  - 修复方案：
    - 在 `api.js` 中新增 `getImageUrl` 工具函数，自动将相对路径转换为完整 URL
    - 更新所有显示图片的地方使用 `getImageUrl` 处理图片 URL
    - 修改的文件：`ProfilePage.jsx`, `SettingsPage.jsx`, `AvatarUploader.jsx`, `BackgroundUploader.jsx`
- 🔧 修复头像裁剪后无法正常上传的问题（`extract_area: bad extract area` 错误）
  - 问题原因：前端传递给后端的裁剪坐标是相对于显示图片的尺寸，但后端需要原始图片尺寸的坐标进行 `sharp.extract` 操作
  - 修复方案：
    - 前端 `AvatarUploader.jsx`：在前端完成裁剪处理，直接生成 200x200 的 webp 图片，不再传递裁剪参数到后端
    - 更新 `getCroppedImg` 函数，正确计算裁剪区域在原始图片上的坐标
    - 修改输出格式为 `image/webp` 以与后端保持一致
    - 后端 `profileController.js`：移除 `sharp.extract` 操作，只保存前端已裁剪好的图片
    - 移除对裁剪参数（x, y, width, height, scale）的依赖

### 变更
- 🔄 头像上传流程优化
  - 由"前端上传原图 → 后端裁剪"改为"前端裁剪 → 后端保存"
  - 减少后端处理负担，提高上传速度
  - 避免因坐标转换错误导致的 `extract_area` 错误

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.1.0] - 2026-02-11

### 新增
- 👤 个人主页功能
  - 公开访问的用户主页（/profile/:username）
  - 显示用户背景图、头像、个人签名
  - 显示用户信息（用户名、注册日期、日记总数）
  - 展示最近10篇日记概览
  - 响应式设计 + 暗黑模式支持
- ⚙️ 用户设置页面（/settings）
  - 头像上传与裁剪（使用 react-image-crop 实现 1:1 圆形裁剪）
  - 背景图上传与删除
  - 个人资料编辑（个人签名，最多200字）
  - 密码修改功能

### 数据库
- 🗄️ User 模型扩展
  - 新增 `bio` 字段（个人签名，默认值"记录生活的每一刻"）
  - 新增 `avatarUrl` 字段（头像图片URL）
  - 新增 `backgroundUrl` 字段（背景图图片URL）
  - 新增 `avatarData` 字段（头像裁剪数据 JSON 字符串）

### 后端 API
- 📡 新增个人资料 API 端点
  - `GET /api/profile/:username` - 获取用户主页信息（公开访问）
  - `GET /api/profile/me` - 获取当前用户完整信息（需认证）
  - `PUT /api/profile/` - 更新个人资料（需认证）
  - `PUT /api/profile/password` - 修改密码（需认证）
  - `POST /api/profile/avatar` - 上传头像（需认证，支持裁剪参数）
  - `POST /api/profile/background` - 上传背景图（需认证）
  - `DELETE /api/profile/background` - 删除背景图（需认证）

### 前端组件
- 🎨 新增页面组件
  - `ProfilePage.jsx` - 个人主页展示页面
  - `SettingsPage.jsx` - 用户设置页面
- 🧩 新增功能组件
  - `AvatarUploader.jsx` - 头像上传与裁剪组件
  - `BackgroundUploader.jsx` - 背景图上传组件

### 优化
- 🔧 路由顺序优化
  - 修复 `/api/profile/me` 路由被 `/:username` 路由拦截的问题
  - 将静态路由 `/me` 移至参数化路由 `/:username` 之前
- 📏 文件大小限制优化
  - 头像上传限制从 10MB 调整为 500KB
  - 背景图上传限制从 10MB 调整为 5MB
  - 后端添加文件大小验证
  - 前端更新提示信息
- 🎨 Header 导航更新
  - 添加"设置"导航项链接到 /settings 页面

### 依赖
- 📦 后端新增依赖
  - `sharp` - 图片处理库（用于头像裁剪和背景图压缩）
- 📦 前端新增依赖
  - `react-image-crop` - React 图片裁剪组件

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次更新

---

## [1.0.3] - 2026-02-11

### 新增
- 🎨 新增功能展示页（/features）
  - 展示应用核心功能：梦想写作、宝藏管理、成长分析、绝对安全
  - 二次元风格设计，粉色/紫色/蓝色渐变配色
  - 漂浮 emoji 动画装饰效果
  - 打字机效果展示欢迎标题

### 变更
- 🔧 修改未登录重定向逻辑
  - 未登录用户访问受保护页面重定向到 /features（原为 /login）
  - 添加功能介绍导航项到 Header

### 优化
- 🎨 功能展示页 UI 优化
  - 使用自定义背景图片（IMG_20260211_123845.jpg）替代渐变背景
  - 添加打字机效果到欢迎标题"欢迎来到 Mio 的魔法日记本"
  - 减少功能卡片到两个（梦想写作、绝对安全）
  - 将注册按钮改为登录按钮，跳转到 /login
  - 减少爱心装饰元素，改用更多星星、月亮等 emoji
  - 优化页面布局，功能卡片网格改为两列最大宽度

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次更新

---

## [1.0.2] - 2026-02-11

### 修复
- 🔧 修复图片上传后前端无法显示的问题
  - 问题原因：后端静态文件服务直接挂载在 `/uploads` 路径，而前端错误地使用了包含 `/api` 的 API 基础 URL 来拼接图片路径
  - 修复方案：在 `ImageUploader.jsx`、`DiaryDetail.jsx`、`DiaryList.jsx` 中添加独立的 `UPLOAD_BASE_URL`，用于访问静态文件
  - `UPLOAD_BASE_URL` 通过从 `VITE_API_URL` 中移除 `/api` 后缀得到
  - 确保图片通过正确的路径 `http://localhost:3001/uploads/xxx.jpg` 访问

### 文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.0.1] - 2026-02-11

### 修复
- 🔧 深度修复图片上传功能无法正常使用的问题
  - 修复后端 uploadController.js 中的重复文件重命名逻辑
  - Multer 中间件已处理文件名生成，控制器直接使用生成的文件名
  - 修复前端 ImageUploader.jsx 中的 API 响应解析逻辑
  - 正确提取 `response.data.data.imageUrl` 而非 `response.data.imageUrl`
  - 创建前端 `.env` 文件，配置 `VITE_API_URL=http://localhost:3001/api`
  - 完善错误处理，上传失败时显示具体的错误消息
- 📝 完善 API 文档
  - 添加详细的图片上传接口说明
  - 补充完整的错误响应示例
  - 添加前端使用示例（JavaScript/React 和原生 Fetch）
  - 说明文件安全措施和验证机制

### 文档
- 📄 更新 `docs/API.md` - 补充上传模块详细文档
- 📄 更新 `CHANGELOG.md` - 记录本次修复

---

## [1.0.4] - 2026-02-11

### 修复
- 🔧 修复登录后无法进入 Dashboard 页面的问题
  - 问题原因：`ProtectedRoute.jsx` 中未登录时重定向到 `/features` 而不是 `/login`
  - 当用户登录成功后导航到 `/`，如果认证状态更新有延迟，`ProtectedRoute` 会重定向回 `/features`，导致看起来像页面刷新
  - 修复方案：将 `ProtectedRoute.jsx` 中的重定向目标从 `/features` 改为 `/login`
- 📝 修复写日记页面文字重复显示的问题
  - 问题原因：DiaryForm.jsx 和 QuillEditor.jsx 组件中都包含了"内容"标签和字符统计
  - 修复方案：
    - 移除 DiaryForm.jsx 中重复的"内容"标签，只保留 QuillEditor 组件内部的标签
    - 移除 QuillEditor.jsx 中的字符统计，只保留 DiaryForm.jsx 中的统计
    - DiaryForm.jsx 中保留更详细的字数统计（字数 + 字符数）

---

## [1.0.0] - 2026-02-11

### 新增
- 🎉 项目首次发布
- ✅ 用户注册与登录功能（JWT 双令牌认证）
- ✅ 日记 CRUD 操作
- ✅ 富文本编辑器（React Quill）
- ✅ 图片上传与管理
- ✅ 心情追踪（7种预设情绪）
- ✅ 标签系统
- ✅ 仪表盘统计功能
- ✅ 日记搜索与筛选
- ✅ 响应式设计
- ✅ 暗黑模式支持
- ✅ 自动保存草稿功能

### 技术栈
- 后端：Node.js 18+, Express 4.x, Prisma 6.x, SQLite
- 前端：React 19, Vite 6.x, Tailwind CSS 3.x, React Router 7.x

### 修复
- 🔧 修复 Quill 依赖缺失导致前端启动失败的问题
  - 安装 quill@2.0.3 和 react-quill@2.0.0-beta.4
  - 使用 --legacy-peer-deps 参数解决 React 19 兼容性
  - 解决 `Failed to resolve import "quill"` 错误
- 🔧 修复 React 19 与 react-quill@2.0.0 的兼容性问题
  - 卸载 react-quill@2.0.0 和 quill
  - 安装 react-quill@beta（使用 --legacy-peer-deps）
  - 解决 `findDOMNode is not a function` 错误

---

## 版本说明

### 版本号格式
项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

### 变更类型
- **新增** - 新功能
- **变更** - 功能的变更
- **弃用** - 即将移除的功能
- **移除** - 已移除的功能
- **修复** - Bug 修复
- **安全** - 安全性修复

---

## 未来计划

### [1.1.0] - 计划中
- 导出日记为 PDF
- 日记分享功能（生成分享链接）
- 数据备份与恢复

### [1.2.0] - 计划中
- 全文搜索（Elasticsearch）
- 日记模板
- 定时提醒
- 数据分析图表

### [2.0.0] - 计划中
- 支持团队协作
- 多端同步
- 支持第三方账号登录
- 离线模式

---

## 贡献者

感谢所有为项目做出贡献的开发者。

---

## 反馈与建议

如果您有任何问题或建议，欢迎通过以下方式联系我们：

- 提交 [Issue](https://github.com/your-username/mio-diary-project/issues)
- 发送邮件至：your-email@example.com