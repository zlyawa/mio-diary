import { lazy, Suspense, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoadingSpinner from './components/common/LoadingSpinner';

// 错误边界组件
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('应用错误:', error, errorInfo);
    console.error('错误堆栈:', error.stack);
    console.error('错误详情:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
              应用出现错误
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              抱歉，应用遇到了一个意外错误。请刷新页面重试。
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded text-sm overflow-auto max-h-60">
                <summary className="cursor-pointer font-bold mb-2 text-gray-700 dark:text-gray-300">错误详情</summary>
                <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// 懒加载组件，实现代码分割
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Features = lazy(() => import('./pages/Features'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DiaryList = lazy(() => import('./pages/DiaryList'));
const DiaryDetail = lazy(() => import('./pages/DiaryDetail'));
const DiaryForm = lazy(() => import('./pages/DiaryForm'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProtectedRoute = lazy(() => import('./pages/ProtectedRoute'));

// 加载组件
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="large" />
  </div>
);

// 主应用组件
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* 公开路由 */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/features" element={<Features />} />

                {/* 受保护路由 */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/diaries"
                  element={
                    <ProtectedRoute>
                      <DiaryList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/diaries/new"
                  element={
                    <ProtectedRoute>
                      <DiaryForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/diaries/:id"
                  element={
                    <ProtectedRoute>
                      <DiaryDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/diaries/:id/edit"
                  element={
                    <ProtectedRoute>
                      <DiaryForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile/:username"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* 404重定向 */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;