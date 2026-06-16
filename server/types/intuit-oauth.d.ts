declare module 'intuit-oauth' {
  interface OAuthClientOptions {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'production';
    redirectUri: string;
    logging?: boolean;
  }

  interface AuthorizeUriOptions {
    scope: string[];
    state?: string;
  }

  interface Token {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    realmId?: string;
  }

  interface AuthResponse {
    getJson(): Token;
    token: {
      realmId: string;
      access_token: string;
      refresh_token: string;
    };
  }

  class OAuthClient {
    constructor(options: OAuthClientOptions);
    authorizeUri(options: AuthorizeUriOptions): string;
    createToken(url: string): Promise<AuthResponse>;
    refresh(): Promise<AuthResponse>;
    setToken(token: { refresh_token: string; access_token?: string }): void;
  }

  export = OAuthClient;
}
