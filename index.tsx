import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

/**
 * 渲染主 React 应用程序。
 */
const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("找不到用于挂载的根元素");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

/**
 * 在页面上显示一个格式化的错误消息。
 * @param message - 要显示的主要错误消息。
 * @param details - 错误的详细信息，通常是 Error.message。
 */
const renderError = (message: string, details: string) => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
        rootElement.innerHTML = `
            <div class="h-screen w-screen flex items-center justify-center p-4">
                <div class="bg-red-900/50 border border-red-700 text-red-300 p-6 rounded-lg max-w-2xl text-left">
                    <h2 class="text-xl font-bold text-red-200">应用程序错误</h2>
                    <p class="mt-2">${message}</p>
                    <pre class="mt-4 text-xs bg-black/30 p-2 rounded-md overflow-auto">${details}</pre>
                </div>
            </div>
        `;
    }
};


// 检查 TensorFlow.js 是否已加载
if (typeof tf !== 'undefined' && tf.setBackend) {
  // 尝试将 TensorFlow.js 的后端设置为 WebGL 以获得广泛的兼容性和性能
  tf.setBackend('webgl').then(() => {
    console.log("TensorFlow.js 后端已设置为 'webgl'");
    // 后端设置成功后，渲染应用程序
    renderApp();
  }).catch((err: Error) => {
    // 如果设置 WebGL 后端失败，则显示错误信息
    console.error("设置 TF.js WebGL 后端失败:", err);
    renderError(
      "此应用程序需要 WebGL，但无法初始化。请确保您使用的是支持 WebGL 的现代浏览器，并在浏览器设置中启用它。",
      err.message
    );
  });
} else {
    // 如果 TensorFlow.js 库本身未加载，则显示错误
    console.error("未找到 TensorFlow.js 库 (tf)。无法设置后端。");
    renderError(
        "TensorFlow.js 库加载失败。",
        "全局 `tf` 对象不可用。请检查 index.html 中的脚本标签和您的网络连接。"
    );
}
