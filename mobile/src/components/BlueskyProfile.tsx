import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../stores/theme';

type Profile = {
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  [key: string]: any;
};

function isProfile(obj: any): obj is Profile {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.handle !== 'string') return false;
  if ('displayName' in obj && obj.displayName != null && typeof obj.displayName !== 'string') return false;
  if ('description' in obj && obj.description != null && typeof obj.description !== 'string') return false;
  if ('avatar' in obj && obj.avatar != null && typeof obj.avatar !== 'string') return false;
  return true;
}

// Primary fetch: use auth/me to show something immediately. atprotocol fetch is optional
async function fetchMeProfile(): Promise<Profile | null> {
  try {
    const meRes = await api.get<any>('/api/auth/me');
    const meData = meRes?.data;
    if (meData && typeof meData === 'object' && 'user' in meData && isProfile((meData as any).user)) {
      return (meData as any).user as Profile;
    }
    if (meData && isProfile(meData)) {
      return meData as Profile;
    }
  } catch (err) {
    // Log a single non-PII message. If a project logger exists, use it; otherwise fall back
    // to console.error. Optionally emit a sanitized debug-level log for deeper diagnosis
    // without leaking user handles/PII to production error logs.
    try {
      const logger = (globalThis as any).logger;
      if (logger && typeof logger.error === 'function') {
        logger.error('fetchMeProfile failed');
        if (typeof logger.debug === 'function') {
          try {
            // Minimal sanitization: extract message if present and redact @handles/emails
            let rawMsg: string | undefined;
            if (!err) rawMsg = undefined;
            else if (typeof err === 'string') rawMsg = err;
            else if (err && typeof (err as any).message === 'string') rawMsg = (err as any).message;
            const sanitized = rawMsg ? rawMsg.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted]').replace(/@[A-Za-z0-9._-]+/g, '[redacted]') : undefined;
            logger.debug('fetchMeProfile raw error (sanitized)', sanitized ? { message: sanitized } : { note: 'no message' });
          } catch (e) {
            // ignore sanitization errors
          }
        }
      } else {
        console.error('fetchMeProfile failed');
      }
    } catch (e) {
      // ignore logging errors
    }
  }
  return null;
}

async function fetchAtprotoProfile(identifier: string | null | undefined): Promise<Profile | null> {
  if (!identifier) return null;
  const q = `?actor=${encodeURIComponent(identifier)}`;
  try {
    const res: any = await api.get<any>(`/api/atprotocol/profile${q}`);
    const data = res?.data;
    if (isProfile(data)) return data;
  } catch (err) {
    try {
      (globalThis as any).logger?.error?.('fetchAtprotoProfile failed', { identifier, err });
    } catch (e) {
      // ignore
    }
    console.error('fetchAtprotoProfile failed', { identifier, err });
  }
  return null;
}


const BlueskyProfile: React.FC = () => {
  const { identifier } = useAuth();
  const qc = useQueryClient();
  // Use cached data if available so UI can render immediately while a background
  // fetch refreshes the profile. Keep a moderate staleTime to avoid frequent refetches.
  const getCachedProfile = (qc: ReturnType<typeof useQueryClient>, identifier?: string | null): Profile | undefined => {
    const keys = [ ['profile','atproto', identifier], ['profile','me'], ['auth','me'] ] as const;
    for (const k of keys) {
      try {
        const v = qc.getQueryData<Profile>(k as any);
        if (v !== undefined && isProfile(v)) return v;
      } catch (e) {
        // ignore and continue
      }
    }
    return undefined;
  };

  const cached = getCachedProfile(qc, identifier);
  // Use auth/me for the immediate profile; enable atprotocol fetch automatically when identifier present
  const profileMeQ = useQuery({ queryKey: ['profile','me'], queryFn: fetchMeProfile, staleTime: 1000 * 60 * 5 });
  const profileAtprotoQ = useQuery({ queryKey: ['profile','atproto', identifier], queryFn: () => fetchAtprotoProfile(identifier), enabled: Boolean(identifier), staleTime: 1000 * 60 * 60 });
  const [avatarFailed, setAvatarFailed] = React.useState(false);
  const { colors } = useTheme();

  React.useEffect(() => { setAvatarFailed(false); }, [profileMeQ.data, profileAtprotoQ.data]);

  // prefer atproto if available, else fall back to auth/me, else cached, else empty
  const p: any = profileAtprotoQ.data || profileMeQ.data || cached || {};
  // Show quickly even if auth/me is still loading: render placeholder without inner border so
  // it blends into the outer card (flat appearance)
  if (profileMeQ.isLoading && !profileMeQ.data) {
    return (
      <View style={[styles.section, { backgroundColor: colors.surface } ]}>
        <View style={styles.profileColumn}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }, styles.avatarSpacing] }>
            <Text style={[styles.avatarInitials, { color: colors.surface }]}>--</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.display, { color: colors.text }]}>読み込み中...</Text>
            <Text style={[styles.handle, { color: colors.secondaryText }]}>@...</Text>
          </View>
        </View>
      </View>
    );
  }

  const getInitials = (nameOrHandle?: string) => {
    const s = (nameOrHandle || '').trim();
    if (!s) return '';
    const parts = s.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const openInBluesky = async (handle?: string) => {
    if (!handle) return;
    const encoded = encodeURIComponent(handle);
    const appUrl = `bsky://profile?handle=${encoded}`;
    const webUrl = `https://bsky.app/profile/${encoded}`;
    try {
      const can = await Linking.canOpenURL(appUrl);
      const target = can ? appUrl : webUrl;
      await Linking.openURL(target);
    } catch (e) {
      try { await Linking.openURL(webUrl); } catch (_) { /* ignore */ }
    }
  };

  const loading = (profileMeQ.isFetching || profileAtprotoQ.isFetching) && !profileMeQ.data && !profileAtprotoQ.data;

  return (
    // Do not render an inner framed box; let the parent card provide the border so the
    // combined UI appears flat.
    <View style={[styles.section, { backgroundColor: colors.surface } ]}>
      <View style={styles.profileColumn}>
        {loading && (
          <View style={{ position: 'absolute', top: 18, right: 18 }}>
            <ActivityIndicator size='small' color={colors.secondaryText} />
          </View>
        )}
        {p?.avatar && !avatarFailed ? (
          <Image
            source={{ uri: p.avatar, cache: 'force-cache' as any }}
            style={[styles.avatar, styles.avatarSpacing]}
            resizeMode='cover'
            accessibilityLabel='User avatar'
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }, styles.avatarSpacing] }>
            <Text style={[styles.avatarInitials, { color: colors.surface }]}>{getInitials(p.displayName || p.handle || identifier)}</Text>
          </View>
        )}

        <View style={styles.profileInfo}>
          <Text style={[styles.display, { color: colors.text }]}>{p.displayName || identifier || ''}</Text>
          <TouchableOpacity accessibilityRole='link' onPress={() => openInBluesky(p.handle || identifier || '')} activeOpacity={0.7}>
            <Text style={[styles.handle, { color: colors.accent }]}>@{p.handle || (identifier || '')}</Text>
          </TouchableOpacity>
          {/* Profile description intentionally removed per UI requirement */}
        </View>

        {(profileMeQ.isError || profileAtprotoQ.isError) && (
          <TouchableOpacity onPress={() => { qc.invalidateQueries({ queryKey: ['profile','me'] }); qc.invalidateQueries({ queryKey: ['profile','atproto', identifier || ''] }); }} style={[styles.licenseBtn, { marginTop: 12, backgroundColor: colors.accent }]} accessibilityRole='button'>
            <Text style={[styles.licenseBtnText]}>プロフィール再取得</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  section: { padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  handle: { fontWeight: '600', fontSize: 14 },
  display: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  desc: { marginTop: 8, lineHeight: 18, textAlign: 'center' },
  licenseBtn: { marginTop: 8, paddingVertical:8, paddingHorizontal:12, borderRadius:6, alignSelf:'flex-start' },
  licenseBtnText: { color:'#fff', fontWeight:'700', fontSize:12 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 20, fontWeight: '700' },
  profileInfo: { flex: 1, alignItems: 'center' },
  profileColumn: { flexDirection: 'column', alignItems: 'center', gap: 6 },
  avatarSpacing: { marginBottom: 4 }
});

export default BlueskyProfile;
