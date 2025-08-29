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
                            const errorDescription = tokenResponse.error_description || '无';
                            const errorUri = tokenResponse.error_uri || '无';

                            let userFriendlyMessage = `Google 认证失败。`;

                            switch (errorCode) {
                                case 'invalid_request':
                                    userFriendlyMessage += `\n\n原因：请求无效。这通常意味着您的应用URL与Google Cloud Console中的“授权JavaScript来源”不匹配。\n\n解决方案：请确保您访问应用的URL (例如 https://....aistudio.dev) 已被准确无误地添加到您OAuth客户端的“授权JavaScript来源”列表中。`;
                                    break;
                                case 'invalid_client':
                                    userFriendlyMessage += `\n\n原因：客户端无效。\n\n解决方案：请检查Google Cloud Console中的OAuth客户端ID配置是否正确，以及它是否已启用。`;
                                    break;
                                case 'access_denied':
                                    userFriendlyMessage = `您已拒绝授权请求。如需使用此功能，请重试并授权应用访问您的Google Drive。`;
                                    break;
                                case 'unauthorized_client':
                                    userFriendlyMessage += `\n\n原因：客户端未被授权使用此流程。\n\n解决方案：请检查您的Google Cloud项目配置，确保OAuth客户端类型正确（应为“Web应用程序”）。`;
                                    break;
                                default:
                                    userFriendlyMessage += `\n\n收到了一个未知的错误。`;
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
