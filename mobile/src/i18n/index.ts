import { getDeviceLocale } from '../utils/deviceLocale';

// Strongly-typed shape of our translation namespaces
export interface I18nNamespaces {
  config: {
    required: string;
    clientIdMessage: string;
  };
  auth: {
    success: {
      title: string;
      message: string;
    };
    serverResponse: {
      title: string;
      message: string;
    };
  };
}

export type Locale = 'en' | 'ja';
export type Resources = Record<Locale, I18nNamespaces>;

const resources: Resources = {
  en: {
    config: {
      required: 'Configuration required',
      clientIdMessage: 'Please set extra.blueskyClientId in app.json or provide client_id manually.'
    },
    auth: {
      success: {
        title: 'Authentication successful',
        message: 'Login information received.'
      },
      serverResponse: {
        title: 'Authentication: Server response',
        message: 'Server did not return a sessionId. Please check backend implementation.'
      }
    }
  },
  ja: {
    config: {
      required: '設定が必要',
      clientIdMessage: 'app.json の extra.blueskyClientId を設定するか、手動で client_id を入力してください。'
    },
    auth: {
      success: {
        title: '認証成功',
        message: 'ログイン情報を受け取りました。'
      },
      serverResponse: {
        title: '認証: サーバ応答',
        message: 'サーバが sessionId を返しませんでした。バックエンドの実装を確認してください。'
      }
    }
  }
};

function lookup(rs: I18nNamespaces, key: string): string | undefined {
  const parts = key.split('.');
  let cur: any = rs;
  for (const p of parts) {
    if (!cur) return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function getLang(): Locale {
  const raw = getDeviceLocale();
  if (!raw) return 'en';
  const code = raw.split('-')[0];
  return code === 'ja' ? 'ja' : 'en';
}

export function t(key: string): string {
  const lang = getLang();
  const rs = resources[lang];
  return lookup(rs, key) ?? key;
}
