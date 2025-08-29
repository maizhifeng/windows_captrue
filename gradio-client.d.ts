declare module '@gradio/client' {
  // This provides minimal type definitions for the @gradio/client module
  // when it's loaded via an importmap in the browser. This satisfies the
  // TypeScript compiler, which would otherwise not be able to find the module's types.
  
  export class Client {
    /**
     * Connects to a Gradio app.
     * @param url The full URL of the Gradio app to connect to.
     * @param options Optional configuration for the connection.
     * @returns A promise that resolves to a Client instance.
     */
    static connect(url: string, options?: any): Promise<Client>;

    /**
     * Makes a prediction to a specific API endpoint.
     * @param endpoint The API endpoint string (e.g., '/predict').
     * @param payload The payload object for the prediction.
     * @returns A promise that resolves to the prediction result. The shape of the result
     * is determined by the Gradio app's API.
     */
    predict(endpoint: string, payload: any): Promise<any>;
  }
}

// Minimal types for Google Identity Services (GSI) client, loaded via CDN
declare var google: {
    accounts: {
        id: any;
        oauth2: {
            initTokenClient: (config: {
                client_id: string;
                scope: string;
                callback: (tokenResponse: any) => void;
            }) => {
                requestAccessToken: (overrideConfig?: any) => void;
            };
            revoke: (token: string, callback: () => void) => void;
        };
    };
};