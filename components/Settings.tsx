import React, { useState, useEffect } from 'react';
import { api } from './utils/api.tsx';
import { SpinnerIcon } from './icons/SpinnerIcon.tsx';
import { useStudio } from './contexts/StudioContext.tsx';
import { useGoogleAuth } from './contexts/GoogleAuthContext.tsx';
import { GoogleDriveIcon } from './icons/GoogleDriveIcon.tsx';

interface SettingsProps {
    serverUrl: string;
    setServerUrl: (url: string) => void;
    isBackendReady: boolean;
    checkConnection: () => Promise<void>;
    googleClientId: string;
    setGoogleClientId: (id: string) => void;
}

type Status = 'idle' | 'testing' | 'success' | 'error';

/**
 * 设置页面组件，用于配置和管理后端服务器连接。
 */
const Settings: React.FC<SettingsProps> = ({ serverUrl, setServerUrl, isBackendReady, checkConnection, googleClientId, setGoogleClientId }) => {
    // 组件内部的 URL 输入状态，与 App 的主状态分离，以便用户可以编辑而不立即触发全局更新
    const [urlInput, setUrlInput] = useState(serverUrl);
    const [clientIdInput, setClientIdInput] = useState(googleClientId);
    const [status, setStatus] = useState<Status>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [copied, setCopied] = useState(false);

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

    // Google 设置的状态
    const { authStatus, authError } = useGoogleAuth();


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
     * 保存 Google Client ID。
     */
    const handleGoogleSave = () => {
        const trimmedId = clientIdInput.trim();
        setGoogleClientId(trimmedId);
        localStorage.setItem('googleClientId', trimmedId);
        // The context will re-initialize automatically. We can provide feedback.
        alert('Google Client ID 已保存。页面将重新加载以应用更改。');
        window.location.reload();
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

    const handleCopyOrigin = () => {
        navigator.clipboard.writeText(window.location.origin);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };
    
    // 根据状态返回不同的文本颜色
    const getStatusColor = (s: Status) => {
        switch (s) {
            case 'success': return 'text-green-600 dark:text-green-400';
            case 'error': return 'text-red-600 dark:text-red-400';
            case 'testing': return 'text-blue-600 dark:text-blue-400';
            default: return 'text-zinc-500 dark:text-zinc-400';
        }
    };

    const getGoogleStatus = () => {
        if (authError) {
            return { text: '认证失败。请检查下面的提示或浏览器控制台。', color: 'text-red-600 dark:text-red-400' };
        }
        switch (authStatus) {
            case 'ready':
                return { text: '已就绪。', color: 'text-green-600 dark:text-green-400' };
            case 'missing_keys':
                 return { text: 'Google Drive API 已禁用，因为客户端ID未配置。', color: 'text-zinc-500 dark:text-zinc-400' };
            case 'initializing':
                return { text: '正在初始化 Google 服务...', color: 'text-blue-600 dark:text-blue-400' };
            case 'error':
                return { text: '初始化失败。请检查浏览器控制台日志。', color: 'text-red-600 dark:text-red-400' };
            default:
                return { text: '未知状态。', color: 'text-zinc-500 dark:text-zinc-400' };
        }
    };
    
    const googleStatus = getGoogleStatus();


    return (
        <div className="max-w-2xl mx-auto h-full flex flex-col justify-center py-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">设置</h2>
                <p className="mt-2 max-w-xl mx-auto text-zinc-600 dark:text-zinc-400">
                    配置用于 AI 分析的后端服务器和用于数据导出的 Google Drive 集成。
                </p>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 p-6 mt-8 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">后端服务器</h3>
                <div>
                    <label htmlFor="server-url" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        服务器 URL
                    </label>
                    <input
                        type="url"
                        id="server-url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="http://localhost:8080"
                        className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 text-base px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                        onClick={() => handleTestConnection(urlInput)} 
                        disabled={status === 'testing'}
                        className="w-full px-4 py-2.5 font-semibold rounded-lg shadow-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {status === 'testing' ? <SpinnerIcon /> : null}
                        测试连接
                    </button>
                    <button 
                        onClick={handleSave}
                        className="w-full px-4 py-2.5 font-semibold text-white rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
                    >
                        保存并连接
                    </button>
                </div>
                
                {statusMessage && (
                     <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                         <p className={`text-sm text-center ${getStatusColor(status)}`}>{statusMessage}</p>
                     </div>
                )}
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 p-6 mt-6 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
                 <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <GoogleDriveIcon className="h-5 w-5" />
                    Google Drive 集成
                </h3>
                <div>
                    <label htmlFor="google-client-id" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Google Client ID
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            id="google-client-id"
                            value={clientIdInput}
                            onChange={(e) => setClientIdInput(e.target.value)}
                            placeholder="在此处粘贴您的 Client ID"
                            className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 text-base px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            aria-describedby="client-id-status"
                        />
                        <button
                            onClick={handleGoogleSave}
                            className="px-4 py-2.5 font-semibold text-white rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 flex-shrink-0 transition-colors"
                        >
                            保存
                        </button>
                    </div>
                </div>
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                     <p id="client-id-status" className={`text-sm text-center ${googleStatus.color}`}>
                        <span className="font-semibold">状态:</span> {googleStatus.text}
                     </p>
                </div>
                 {authError && (
                    <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-xs whitespace-pre-wrap text-left border border-red-200 dark:border-red-500/30">
                        {authError}
                    </div>
                 )}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-xs border border-blue-200 dark:border-blue-500/30 space-y-2">
                    <p className="font-semibold text-sm">如何配置</p>
                    <ol className="list-decimal list-inside space-y-3">
                        <li>前往 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-blue-600 dark:hover:text-blue-200">Google Cloud Console</a>。</li>
                        <li>创建或选择一个“Web 应用程序”类型的“OAuth 2.0 客户端 ID”。</li>
                        <li>
                            在“授权 JavaScript 来源”下，添加此应用的当前 URL。
                            <div className="mt-1 flex items-center gap-2">
                                <code className="bg-blue-100 dark:bg-blue-800/50 px-2 py-1.5 rounded text-blue-900 dark:text-blue-200 text-xs sm:text-sm flex-grow break-all">{window.location.origin}</code>
                                <button
                                    onClick={handleCopyOrigin}
                                    className="px-3 py-1 text-xs font-semibold bg-zinc-200 dark:bg-zinc-700 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors w-20 text-center"
                                    aria-live="polite"
                                >
                                    {copied ? '已复制!' : '复制'}
                                </button>
                            </div>
                        </li>
                        <li>导航至 <strong>OAuth 同意屏幕</strong> 页面。</li>
                        <li>将 <strong>发布状态</strong> 设置为 <strong>“测试”</strong>。</li>
                        <li>在 <strong>测试用户</strong> 部分，点击“添加用户”并输入您自己的 Google 帐户电子邮件地址。</li>
                        <li>返回 <strong>凭据</strong> 页面，复制您的客户端 ID 并粘贴到上方。</li>
                        <li>在 Google Cloud Console 和此处保存您的更改。</li>
                    </ol>
                    <div className="!mt-4 pt-3 border-t border-blue-200/50 dark:border-blue-500/30">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-500/30 space-y-1">
                            <p><strong>重要提示：</strong>您需要的是<strong>客户端 ID</strong>，它是一个以 <code className="bg-amber-100 dark:bg-amber-800/50 p-1 rounded">.apps.googleusercontent.com</code> 结尾的长字符串。</p>
                            <p>请<strong>不要</strong>点击“下载 JSON”按钮。该 JSON 文件包含客户端密钥，适用于服务器端应用程序，在此处无法使用，并会导致错误。</p>
                        </div>
                    </div>
                    <p className="!mt-3 pt-3 border-t border-blue-200/50 dark:border-blue-500/30">
                        如果您看到 <code className="font-mono">Error 400: invalid_request</code> 错误，这几乎总是由于“授权 JavaScript 来源”与应用的 URL 不匹配。如果您看到关于“不符合 Google 政策”的错误，请确保您已在 OAuth 同意屏幕中将自己添加为<strong>测试用户</strong>。
                    </p>
                </div>
            </div>

        </div>
    );
};

export default Settings;