import { getDeviceLocale } from '../utils/deviceLocale';

type Resources = Record<string, any>;

const resources: Record<string, Resources> = {
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

function lookup(rs: Resources, key: string): string | undefined {
  const parts = key.split('.');
  let cur: any = rs;
  for (const p of parts) {
    if (!cur) return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function t(key: string): string {
  const lang = getDeviceLocale();
  const rs = resources[lang] || resources['en'];
  return lookup(rs, key) ?? key;
}

export default { t };
