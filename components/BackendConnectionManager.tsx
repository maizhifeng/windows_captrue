

import React, { useState } from 'react';

interface BackendConnectionManagerProps {
    serverUrl: string;
    setServerUrl: (url: string) => void;
    initialError: string | null;
}

/**
 * 当需要后端但未配置或连接失败时显示的组件。
 * 强制用户输入一个有效的服务器 URL 才能继续。
 */
const BackendConnectionManager: React.FC<BackendConnectionManagerProps> = ({ serverUrl, setServerUrl, initialError }) => {
    const [urlInput, setUrlInput] = useState(serverUrl);
    
    /**
     * 保存 URL 并触发 App 组件中的重新连接逻辑。
     */
    const handleSaveAndConnect = () => {
        const trimmedUrl = urlInput.trim().replace(/\/$/, '');
        localStorage.setItem('serverUrl', trimmedUrl);
        setServerUrl(trimmedUrl);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8 text-zinc-400">
            <div className="w-full max-w-lg mx-auto">
                <h3 className="text-2xl font-bold text-white mb-3">连接到后端服务器</h3>
                <p className="mb-8 text-zinc-400">
                    输入您的 AI Vision 服务器的 URL 以启用分析、数据收集和模型训练。
                </p>

                <div className="bg-zinc-800 p-8 rounded-xl border border-zinc-700 space-y-4 text-left shadow-lg">
                     <div>
                        <label htmlFor="server-url-setup" className="block text-sm font-medium text-zinc-300 mb-2">
                            服务器 URL
                        </label>
                        <input
                            type="url"
                            id="server-url-setup"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveAndConnect()}
                            placeholder="http://localhost:8080 或 Colab URL"
                            className="w-full bg-zinc-900 text-white text-base px-4 py-2.5 rounded-lg border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            aria-label="服务器 URL 输入"
                        />
                    </div>
                    <button 
                        onClick={handleSaveAndConnect}
                        className="w-full px-4 py-3 font-semibold text-white rounded-lg shadow-md bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        disabled={!urlInput.trim()}
                    >
                        保存并连接
                    </button>
                    {/* 显示来自 App 组件的初始错误信息 */}
                    {initialError && (
                         <div className="pt-4 border-t border-zinc-700/80">
                             <p className="text-sm text-center text-red-400" role="alert">{initialError}</p>
                         </div>
                    )}
                </div>

                <div className="mt-8 text-xs text-zinc-500 px-4 space-y-3">
                     <div className="pt-3 border-t border-zinc-700/50">
                        <p className="font-semibold text-zinc-400">正在使用 Google Colab？</p>
                        <p>当您在 Colab 笔记本中运行后端服务器时，它会生成一个公共 URL（例如，以 `.gradio.live` 结尾）。请将该 URL 复制并粘贴到此处。如果重新启动 Colab 会话，请记得更新它。</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BackendConnectionManager;