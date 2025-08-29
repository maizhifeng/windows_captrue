import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// FIX: Add 'missing_keys' to AuthStatus to provide a more specific status when the Google Client ID is not configured. This resolves a type error in Settings.tsx.
export type AuthStatus = 'initializing' | 'ready' | 'error' | 'missing_keys';
interface GoogleAuthContextType {
  isSignedIn: boolean;
  authStatus: AuthStatus;
  authError: string | null;
  isAuthReady: boolean;
  signIn: () => void;
  signOut: () => void;
  getAccessToken: () => string | null;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | null>(null);

interface GoogleAuthProviderProps {
    children: React.ReactNode;
    clientId: string;
}

export const GoogleAuthProvider: React.FC<GoogleAuthProviderProps> = ({ children, clientId }) => {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing');
    const [authError, setAuthError] = useState<string | null>(null);
    
    const tokenClientRef = useRef<any>(null);
    const accessTokenRef = useRef<string | null>(null);

    useEffect(() => {
        if (!clientId) {
            console.warn("Google Client ID is not configured. Google Drive features will be disabled.");
            setAuthStatus('missing_keys');
            return;
        }

        // 动态加载 Google Identity Services 脚本
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            // 脚本加载后，安全地初始化客户端
            if (!window.google || !window.google.accounts) {
                console.error("GSI script loaded, but `google` object not found.");
                setAuthStatus('error');
                return;
            }
            try {
                tokenClientRef.current = google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: SCOPES,
                    callback: (tokenResponse: any) => {
                        if (tokenResponse.error) {
                            const errorCode = tokenResponse.error;
                            const errorDescription = tokenResponse.error_description || '无详细信息';
                            const errorUri = tokenResponse.error_uri || '无';

                            let userFriendlyMessage = `Google 认证失败。`;

                            switch (errorCode) {
                                case 'invalid_request':
                                    userFriendlyMessage = `Google 登录失败，因为请求无效 (invalid_request)。

这通常是由以下两个原因之一引起的：
1. **来源不匹配：** 您当前访问此应用的 URL 与您在 Google Cloud Console 中为 OAuth 客户端配置的 **“授权 JavaScript 来源”** 不完全匹配。
2. **重复请求：** 您可能过于频繁地尝试登录。

**解决方案：**
1. 仔细检查并确保 URL 完全匹配，包括 \`http\` 或 \`https\`。
2. 前往 **设置** 页面，使用“复制”按钮获取正确的 URL，并将其粘贴到 Google Cloud Console 中。
3. 如果 URL 正确，请等待几秒钟再重试。`;
                                    break;
                                
                                case 'access_denied':
                                    userFriendlyMessage = `Google 登录失败，因为访问被拒绝 (access_denied)。

这几乎总是因为您的应用在 Google Cloud 中处于“测试”模式，而您当前的 Google 帐户尚未被添加为测试用户。

**解决方案：**
1. 前往 Google Cloud Console 中的 **OAuth 同意屏幕**。
2. 找到 **“测试用户”** 部分。
3. 点击 **“添加用户”** 并输入您用于登录的电子邮件地址。
4. 保存更改并重试。`;
                                    break;
                                    
                                case 'popup_closed_by_user':
                                    userFriendlyMessage = `登录弹出窗口已由用户关闭。

如果您在弹出窗口中看到了 Google 的错误消息（例如，“此应用无法验证”或关于“政策”的错误），这通常与 \`access_denied\` 错误的原因相同：您的应用处于“测试”模式，而您不是测试用户。

**解决方案：**
1. 前往 Google Cloud Console 中的 **OAuth 同意屏幕**。
2. 找到 **“测试用户”** 部分。
3. 点击 **“添加用户”** 并输入您用于登录的电子邮件地址。
4. 保存更改并重试。`;
                                    break;

                                case 'invalid_client':
                                case 'unauthorized_client':
                                    userFriendlyMessage = `Google 登录失败，因为客户端配置无效 (${errorCode})。

**解决方案：**
1. 请检查您在 **设置** 页面中输入的 **Google Client ID** 是否正确无误。
2. 确保您复制的是 **客户端 ID**，而不是客户端密钥。
3. 检查 Google Cloud Console 中的 OAuth 客户端是否已启用，并且类型为“Web 应用程序”。`;
                                    break;

                                default:
                                    userFriendlyMessage = `发生了一个未知的 Google 认证错误。`;
                                    break;
                            }

                            const fullErrorDetails = `${userFriendlyMessage}\n\n---\n技术细节:\n错误码: ${errorCode}\n描述: ${errorDescription}\n更多信息: ${errorUri}`;

                            console.error('Google Auth Error:', tokenResponse);
                            setAuthError(fullErrorDetails.trim());
                            setIsSignedIn(false);
                            accessTokenRef.current = null;
                            return;
                        }
                        accessTokenRef.current = tokenResponse.access_token;
                        setIsSignedIn(true);
                        setAuthError(null);
                    },
                });
                setAuthStatus('ready');
            } catch (e) {
                console.error("Error initializing Google token client:", e);
                setAuthStatus('error');
            }
        };
        
        script.onerror = () => {
            console.error("GSI script failed to load.");
            setAuthStatus('error');
        };

        document.body.appendChild(script);

        // 清理函数，在组件卸载时移除脚本
        return () => {
            document.body.removeChild(script);
        };
    }, [clientId]); // 仅在挂载时运行一次

    const signIn = useCallback(() => {
        if (authStatus === 'ready' && tokenClientRef.current) {
            setAuthError(null); // 在新的登录尝试前清除旧的错误
            // 通过传递 { prompt: 'select_account' } 来强制显示用户同意/账户选择对话框。
            // 这比静默的 requestAccessToken() 调用更可靠，后者在多种情况下会失败并导致 "invalid_request" 错误。
            tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
        }
    }, [authStatus]);

    const signOut = useCallback(() => {
        const token = accessTokenRef.current;
        if (token && window.google) {
            google.accounts.oauth2.revoke(token, () => {
                accessTokenRef.current = null;
                setIsSignedIn(false);
            });
        }
    }, []);

    const getAccessToken = useCallback(() => accessTokenRef.current, []);

    const contextValue = useMemo(() => ({
        isSignedIn,
        authStatus,
        authError,
        isAuthReady: authStatus === 'ready',
        signIn,
        signOut,
        getAccessToken,
    }), [isSignedIn, authStatus, authError, signIn, signOut, getAccessToken]);

    return (
        <GoogleAuthContext.Provider value={contextValue}>
            {children}
        </GoogleAuthContext.Provider>
    );
};

export const useGoogleAuth = () => {
    const context = useContext(GoogleAuthContext);
    if (!context) {
        throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
    }
    return context;
};
