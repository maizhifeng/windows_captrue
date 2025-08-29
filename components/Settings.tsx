

import React, { useState, useEffect } from 'react';
import { api } from './utils/api.tsx';
import { SpinnerIcon } from './icons/SpinnerIcon.tsx';
import { useStudio } from './contexts/StudioContext.tsx';

interface SettingsProps {
    serverUrl: string;
    setServerUrl: (url: string) => void;
    isBackendReady: boolean;
    checkConnection: () => Promise<void>;
}

type Status = 'idle' | 'testing' | 'success' | 'error';

/**
 * 设置页面组件，用于配置和管理后端服务器连接。
 */
const Settings: React.FC<SettingsProps> = ({ serverUrl, setServerUrl, isBackendReady, checkConnection }) => {
    // 组件内部的 URL 输入状态，与 App 的主状态分离，以便用户可以编辑而不立即触发全局更新
    const [urlInput, setUrlInput] = useState(serverUrl);
    const [status, setStatus] = useState<Status>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    const { setStudioContent } = useStudio();
    // 此页面不使用工作室面板
    useEffect(() => {
        setStudioContent(null);
        return () => setStudioContent(null);
    }, [setStudioContent]);

    // 根据全局的 isBackendReady 状态更新本地状态显示
    useEffect(() => {
        if (isBackendReady) {
            setStatus('success');
            setStatusMessage('连接处于活动状态。');
        } else if (serverUrl) {
            setStatus('error');
            setStatusMessage('无法连接。请验证 URL 和服务器状态。');
        } else {
            setStatus('idle');
            setStatusMessage('后端未配置。');
        }
    }, [isBackendReady, serverUrl]);

    /**
     * 保存用户输入的 URL。
     * 这会更新 App 的主状态并将其保存到 localStorage。
     */
    const handleSave = () => {
        const trimmedUrl = urlInput.trim().replace(/\/$/, ''); // 修剪并移除末尾的斜杠
        setServerUrl(trimmedUrl);
        localStorage.setItem('serverUrl', trimmedUrl);
        // 保存后立即尝试连接
        handleTestConnection(trimmedUrl);
    };

    /**
     * 测试与指定 URL 的连接。
     */
    const handleTestConnection = async (urlToTest: string) => {
        if (!urlToTest) {
            setStatus('error');
            setStatusMessage('URL 不能为空。');
            return;
        }
        setStatus('testing');
        setStatusMessage('正在 Ping 服务器...');
        try {
            const response = await api.healthCheck(urlToTest);
            setStatus('success');
            setStatusMessage(`成功连接！服务器响应：${response.message}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '发生未知错误。';
            let finalMessage = `连接失败：${errorMessage}`;
            // 为 Gradio 链接提供更具体的错误提示
            if (urlToTest.includes('.gradio.live') && errorMessage.includes('404')) {
                finalMessage = `连接失败。这对于 Gradio 链接很常见，它们会在 72 小时后过期。请从您的 Colab 笔记本生成一个新的公共 URL。`;
            }
            setStatus('error');
            setStatusMessage(finalMessage);
        }
    };
    
    // 根据状态返回不同的文本颜色
    const getStatusColor = () => {
        switch (status) {
            case 'success': return 'text-green-400';
            case 'error': return 'text-red-400';
            case 'testing': return 'text-blue-400';
            default: return 'text-zinc-400';
        }
    };

    return (
        <div className="max-w-2xl mx-auto h-full flex flex-col justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-zinc-100">后端设置</h2>
                <p className="mt-2 max-w-xl mx-auto text-zinc-400">
                    配置用于数据存储、模型训练和 AI 分析的服务器端点。
                </p>
            </div>

            <div className="bg-zinc-800/50 p-6 mt-6 rounded-xl border border-zinc-700 space-y-4">
                <div>
                    <label htmlFor="server-url" className="block text-sm font-medium text-zinc-300 mb-2">
                        服务器 URL
                    </label>
                    <input
                        type="url"
                        id="server-url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="http://localhost:8080"
                        className="w-full bg-zinc-900 text-white text-base px-4 py-2.5 rounded-lg border border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                        onClick={() => handleTestConnection(urlInput)} 
                        disabled={status === 'testing'}
                        className="w-full px-4 py-2.5 font-semibold rounded-lg shadow-md bg-zinc-700 hover:bg-zinc-600 text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {status === 'testing' ? <SpinnerIcon /> : null}
                        测试连接
                    </button>
                    <button 
                        onClick={handleSave}
                        className="w-full px-4 py-2.5 font-semibold text-white rounded-lg shadow-md bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
                    >
                        保存并连接
                    </button>
                </div>
                
                {/* 显示连接状态消息 */}
                {statusMessage && (
                     <div className="pt-4 border-t border-zinc-700/80">
                         <p className={`text-sm text-center ${getStatusColor()}`}>{statusMessage}</p>
                     </div>
                )}
            </div>

            {/* 辅助信息和提示 */}
            <div className="text-xs text-zinc-500 text-center px-4 space-y-3 mt-6">
                <p>所有训练数据、自定义模型和 AI 分析都将由配置的服务器处理。请确保服务器正在运行并且您的浏览器可以访问它。</p>
                <div className="pt-3 border-t border-zinc-700/50">
                    <p className="font-semibold text-zinc-400">正在使用 Google Colab？</p>
                    <p>当您在 Colab 笔记本中运行后端服务器时，它将生成一个公共 URL（例如，以 `.gradio.live` 结尾）。请将该 URL 复制并粘贴到此处。如果重新启动 Colab 会话，请记得更新它。</p>
                </div>
            </div>
        </div>
    );
};

export default Settings;