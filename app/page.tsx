'use client';

import dynamic from 'next/dynamic';
import type { User } from '@supabase/supabase-js';
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CatCoat, CatPhoto, MapCat } from './CatMap';
import { isInsidePnuCampus, PNU_CENTER } from './campus';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

const CatMap = dynamic(() => import('./CatMap'), { ssr: false, loading: () => <div className="map-loading">지도를 불러오는 중…</div> });
const LEGACY_DEFAULT_CAT_PHOTO = 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=85';

const starterCats: MapCat[] = [
  {
    id: 'starter-cheese', name: '치즈', place: '중앙도서관 앞', note: '점심시간에 벤치 아래에서 낮잠을 자요.', spottedBy: '민지', spottedAt: '2026-08-27T12:40:00+09:00', lat: 35.23468, lng: 129.07856, coat: 'orange',
    photo: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=85', personality: '느긋하고 사람을 잘 따르는 편', likes: '햇빛, 참치 간식, 벤치 밑', favoriteSpot: '중앙도서관 앞 벤치', caution: '낮잠 잘 때는 만지지 않기',
    gallery: [
      { id: 'cheese-1', url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=85', spottedAt: '2026-08-27T12:40:00+09:00', caption: '도서관 앞에서 낮잠 중', uploadedBy: '민지' },
      { id: 'cheese-2', url: 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=900&q=85', spottedAt: '2026-08-26T16:10:00+09:00', caption: '햇빛 받는 치즈', uploadedBy: '수빈' },
      { id: 'cheese-3', url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=900&q=85', spottedAt: '2026-08-26T13:25:00+09:00', uploadedBy: '하늘' },
    ],
  },
  {
    id: 'starter-cloud', name: '구름', place: '학생회관 화단', note: '사람을 좋아하지만 천천히 다가가 주세요.', spottedBy: '하늘', spottedAt: '2026-08-26T17:20:00+09:00', lat: 35.23167, lng: 129.08247, coat: 'white',
    photo: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&w=900&q=85', personality: '조심스럽지만 친해지면 애교가 많아요', likes: '화단, 나뭇잎 장난', favoriteSpot: '학생회관 화단 안쪽', caution: '먼저 손을 내밀고 기다려 주세요',
    gallery: [{ id: 'cloud-1', url: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&w=900&q=85', spottedAt: '2026-08-26T17:20:00+09:00', caption: '화단 옆 구름이', uploadedBy: '하늘' }],
  },
  {
    id: 'starter-tuxedo', name: '턱시도', place: '넉넉한터 근처', note: '흰 양말 같은 앞발이 포인트예요.', spottedBy: '준호', spottedAt: '2026-08-25T14:30:00+09:00', lat: 35.23577, lng: 129.07684, coat: 'black',
    photo: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?auto=format&fit=crop&w=900&q=85', personality: '호기심이 많고 씩씩해요', likes: '산책하는 학생 따라가기', favoriteSpot: '넉넉한터 계단 옆', caution: '갑자기 안아 올리지 않기',
    gallery: [
      { id: 'tuxedo-1', url: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?auto=format&fit=crop&w=900&q=85', spottedAt: '2026-08-25T14:30:00+09:00', caption: '넉터 산책', uploadedBy: '준호' },
      { id: 'tuxedo-2', url: 'https://images.unsplash.com/photo-1529778873920-4da4926a72c2?auto=format&fit=crop&w=900&q=85', spottedAt: '2026-08-24T18:05:00+09:00', uploadedBy: '다은' },
    ],
  },
];

type Tab = 'map' | 'cats' | 'report' | 'gallery' | 'profile' | 'mine' | 'myPage';
type AuthMode = 'login' | 'signup';
type DbPhoto = { id: string; photo_url: string; caption: string; spotted_at: string; uploader_name: string; created_at: string };
type DbCat = { id: string; name: string; place: string; note: string; spotted_by: string; spotted_at: string; lat: number; lng: number; coat: CatCoat; cover_photo_url: string | null; personality?: string; likes?: string; favorite_spot?: string; caution?: string; cat_photos?: DbPhoto[] };

function mapDbCat(row: DbCat): MapCat {
  const photos = (row.cat_photos ?? []).map((photo) => ({ id: photo.id, url: photo.photo_url, caption: photo.caption, spottedAt: photo.spotted_at, createdAt: photo.created_at, uploadedBy: photo.uploader_name }));
  const gallery = [...photos].sort((a, b) => b.spottedAt.localeCompare(a.spottedAt));
  const firstUploadedPhoto = [...photos].sort((a, b) => (a.createdAt || a.spottedAt).localeCompare(b.createdAt || b.spottedAt))[0];
  const savedCover = row.cover_photo_url === LEGACY_DEFAULT_CAT_PHOTO ? null : row.cover_photo_url;
  return { id: row.id, name: row.name, place: row.place, note: row.note, spottedBy: row.spotted_by, spottedAt: row.spotted_at, lat: row.lat, lng: row.lng, coat: row.coat, photo: savedCover ?? firstUploadedPhoto?.url ?? null, gallery, personality: row.personality ?? '', likes: row.likes ?? '', favoriteSpot: row.favorite_spot ?? '', caution: row.caution ?? '' };
}

function formatSeen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatGalleryDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(date);
}

async function filesToDataUrls(files: File[]) {
  return Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  })));
}

export default function Home() {
  const [cats, setCats] = useState<MapCat[]>(starterCats);
  const [selected, setSelected] = useState<MapCat | null>(null);
  const [tab, setTab] = useState<Tab>('map');
  const [draftPoint, setDraftPoint] = useState<[number, number]>(PNU_CENTER);
  const [focusPosition, setFocusPosition] = useState<[number, number] | null>(null);
  const [draftPhotos, setDraftPhotos] = useState<string[]>([]);
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [showLocationConsent, setShowLocationConsent] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!hasSupabaseConfig);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [myName, setMyName] = useState('고양이 친구');
  const [myBio, setMyBio] = useState('부산대 고양이들을 조용히 지켜보고 있어요.');
  const [saving, setSaving] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState<CatPhoto | null>(null);
  const [galleryDate, setGalleryDate] = useState('');
  const [galleryCaption, setGalleryCaption] = useState('');
  const [showGalleryComposer, setShowGalleryComposer] = useState(false);
  const [galleryDraftFile, setGalleryDraftFile] = useState<File | null>(null);
  const [galleryDraftPreview, setGalleryDraftPreview] = useState('');
  const [isChoosingLocation, setIsChoosingLocation] = useState(false);
  const [hasChosenLocation, setHasChosenLocation] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const loadSharedCats = useCallback(async () => {
    if (!supabase) return [] as MapCat[];
    const { data, error } = await supabase.from('cats').select('*, cat_photos(*)').order('created_at', { ascending: false });
    if (error) throw error;
    const next = (data as DbCat[]).map(mapDbCat);
    setCats(next);
    setSelected((current) => current ? next.find((cat) => cat.id === current.id) ?? null : null);
    return next;
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('nyangdo-location-choice')) setShowLocationConsent(true);
    if (!supabase) {
      const saved = localStorage.getItem('nyangdo-pnu-v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as MapCat[];
          if (Array.isArray(parsed) && parsed.length) {
            const migrated = parsed.map((cat) => {
              const photo = cat.photo === LEGACY_DEFAULT_CAT_PHOTO ? null : cat.photo;
              const gallery = cat.gallery?.length ? cat.gallery : photo ? [{ id: `${cat.id}-cover`, url: photo, spottedAt: cat.spottedAt, uploadedBy: cat.spottedBy }] : [];
              return { ...cat, photo, gallery };
            });
            setCats(migrated); setSelected(null);
          }
        } catch { /* Keep sample gallery when local draft data is unreadable. */ }
      }
      return;
    }
    const client = supabase;
    void client.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setAuthReady(true); }).catch(() => setAuthReady(true));
    void loadSharedCats().catch(() => setNotice('공유 데이터를 불러오지 못했어요. DB 설정을 확인해 주세요.'));
    const authListener = client.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setAuthReady(true); });
    const live = client.channel('nyangdo-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cats' }, () => void loadSharedCats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cat_photos' }, () => void loadSharedCats())
      .subscribe();
    return () => { authListener.data.subscription.unsubscribe(); void client.removeChannel(live); };
  }, [loadSharedCats]);

  useEffect(() => { if (!hasSupabaseConfig) localStorage.setItem('nyangdo-pnu-v2', JSON.stringify(cats)); }, [cats]);

  useEffect(() => {
    if (user) {
      setMyName(String(user.user_metadata?.display_name || user.email?.split('@')[0] || '고양이 친구'));
      setMyBio(String(user.user_metadata?.bio || '부산대 고양이들을 조용히 지켜보고 있어요.'));
      return;
    }
    if (!hasSupabaseConfig) {
      try {
        const saved = JSON.parse(localStorage.getItem('nyangdo-my-profile') || '{}') as { name?: string; bio?: string };
        if (saved.name) setMyName(saved.name);
        if (saved.bio) setMyBio(saved.bio);
      } catch { /* Keep the friendly local profile defaults. */ }
    }
  }, [user]);

  const filteredCats = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return keyword ? cats.filter((cat) => `${cat.name} ${cat.place}`.toLowerCase().includes(keyword)) : cats;
  }, [cats, query]);

  const galleryGroups = useMemo(() => {
    const groups = new Map<string, CatPhoto[]>();
    for (const photo of selected?.gallery ?? []) {
      const day = photo.spottedAt.slice(0, 10);
      groups.set(day, [...(groups.get(day) ?? []), photo]);
    }
    return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [selected]);

  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2400); };

  const jumpToGalleryDate = (day: string) => {
    setGalleryDate(day);
    window.requestAnimationFrame(() => {
      const target = document.getElementById(`gallery-${day}`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else flash('선택한 날짜에는 등록된 사진이 없어요.');
    });
  };

  const openReport = (lat = draftPoint[0], lng = draftPoint[1]) => {
    if (!isInsidePnuCampus(lat, lng)) return flash('부산대학교 부산캠퍼스 안의 고양이만 등록할 수 있어요.');
    setDraftPoint([lat, lng]); setDraftPhotos([]); setDraftFiles([]); setSelected(null); setIsChoosingLocation(false); setHasChosenLocation(false); setTab('report');
  };

  const beginLocationSelection = () => {
    setSelected(null);
    setTab('map');
    setIsChoosingLocation(true);
    setHasChosenLocation(false);
    flash('지도에서 고양이를 발견한 위치를 눌러 주세요.');
  };

  const chooseDraftLocation = (lat: number, lng: number) => {
    if (!isChoosingLocation) return;
    if (!isInsidePnuCampus(lat, lng)) return flash('부산대학교 부산캠퍼스 안에서 위치를 골라 주세요.');
    setDraftPoint([lat, lng]);
    setHasChosenLocation(true);
  };

  const cancelLocationSelection = () => {
    setIsChoosingLocation(false);
    setHasChosenLocation(false);
  };

  const cancelReport = () => {
    setDraftFiles([]);
    setDraftPhotos([]);
    setSelected(null);
    cancelLocationSelection();
    setTab('map');
    if (photoInput.current) photoInput.current.value = '';
  };

  const handlePhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, 8);
    if (!files.length) return;
    if (files.some((file) => file.size > 5_000_000)) return flash('사진은 한 장당 5MB 이하로 골라 주세요.');
    setDraftFiles(files); setDraftPhotos(await filesToDataUrls(files));
  };

  const uploadFilesForCat = async (catId: string, files: File[], uploaderName: string, caption = '') => {
    if (!supabase || !user) return [] as CatPhoto[];
    const uploaded: CatPhoto[] = [];
    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/${catId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('cat-photos').upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicFile } = supabase.storage.from('cat-photos').getPublicUrl(path);
      const spottedAt = new Date().toISOString();
      const photoId = crypto.randomUUID();
      const { error: insertError } = await supabase.from('cat_photos').insert({ id: photoId, cat_id: catId, photo_url: publicFile.publicUrl, storage_path: path, caption, spotted_at: spottedAt, uploaded_by: user.id, uploader_name: uploaderName });
      if (insertError) throw insertError;
      uploaded.push({ id: photoId, url: publicFile.publicUrl, spottedAt, createdAt: spottedAt, caption, uploadedBy: uploaderName });
    }
    return uploaded;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (hasSupabaseConfig && !user) { flash('고양이를 등록하려면 먼저 로그인해 주세요.'); setTab('myPage'); return; }
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name')).trim();
    const place = String(data.get('place')).trim();
    const note = String(data.get('note')).trim() || '아직 소개가 없어요.';
    const spottedBy = String(data.get('spottedBy')).trim() || user?.email?.split('@')[0] || '익명의 친구';
    const coat = String(data.get('coat')) as CatCoat;
    const catId = crypto.randomUUID();
    const spottedAt = new Date().toISOString();
    setSaving(true);
    try {
      let gallery: CatPhoto[] = draftPhotos.map((url, index) => ({ id: `${catId}-${index}`, url, spottedAt, uploadedBy: spottedBy }));
      let coverPhoto = gallery[0]?.url ?? null;
      if (supabase && user) {
        const { error } = await supabase.from('cats').insert({ id: catId, name, place, note, spotted_by: spottedBy, spotted_at: spottedAt, lat: draftPoint[0], lng: draftPoint[1], coat, cover_photo_url: null, created_by: user.id });
        if (error) throw error;
        gallery = await uploadFilesForCat(catId, draftFiles, spottedBy);
        coverPhoto = gallery[0]?.url ?? null;
        if (coverPhoto) await supabase.from('cats').update({ cover_photo_url: coverPhoto }).eq('id', catId);
      }
      const cat: MapCat = { id: catId, name, place, note, spottedBy, spottedAt, lat: draftPoint[0], lng: draftPoint[1], coat, photo: coverPhoto, gallery };
      setCats((current) => [cat, ...current]); setSelected(cat); setFocusPosition([cat.lat, cat.lng]); setTab('map'); form.reset(); setDraftFiles([]); setDraftPhotos([]);
      flash(`${cat.name}와 사진 ${gallery.length}장을 등록했어요!`);
    } catch { flash('등록하지 못했어요. Supabase 설정을 확인해 주세요.'); }
    finally { setSaving(false); }
  };

  const closeGalleryComposer = () => {
    setShowGalleryComposer(false);
    setGalleryDraftFile(null);
    setGalleryDraftPreview('');
    setGalleryCaption('');
    if (galleryInput.current) galleryInput.current.value = '';
  };

  const handleGalleryPhotoPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) { event.target.value = ''; return flash('사진은 5MB 이하로 골라 주세요.'); }
    const [preview] = await filesToDataUrls([file]);
    setGalleryDraftFile(file);
    setGalleryDraftPreview(preview);
  };

  const handleGalleryUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !galleryDraftFile) return flash('먼저 폴라로이드에 사진을 골라 주세요.');
    if (hasSupabaseConfig && !user) { flash('사진을 올리려면 먼저 로그인해 주세요.'); setTab('myPage'); return; }
    setGalleryUploading(true);
    try {
      const uploader = user?.email?.split('@')[0] || '나';
      const spottedAt = new Date().toISOString();
      const caption = galleryCaption.trim();
      const files = [galleryDraftFile];
      const added = supabase && user ? await uploadFilesForCat(selected.id, files, uploader, caption) : (await filesToDataUrls(files)).map((url) => ({ id: crypto.randomUUID(), url, spottedAt, createdAt: spottedAt, uploadedBy: uploader, caption }));
      const firstPhoto = selected.photo ?? added[0]?.url ?? null;
      if (!selected.photo && firstPhoto && supabase && user) {
        const { error } = await supabase.from('cats').update({ cover_photo_url: firstPhoto }).eq('id', selected.id);
        if (error) throw error;
      }
      const updated = { ...selected, photo: firstPhoto, gallery: [...added, ...(selected.gallery ?? [])] };
      setSelected(updated); setCats((current) => current.map((cat) => cat.id === updated.id ? updated : cat)); closeGalleryComposer(); flash('폴라로이드 한 장을 갤러리에 추가했어요.');
    } catch { flash('사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { setGalleryUploading(false); }
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email')).trim();
    const password = String(data.get('password'));
    const displayName = String(data.get('displayName')).trim();
    const passwordConfirm = String(data.get('passwordConfirm'));
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');
    try {
      if (authMode === 'signup') {
        if (password.length < 8) throw new Error('비밀번호는 8자 이상으로 만들어 주세요.');
        if (password !== passwordConfirm) throw new Error('비밀번호가 서로 달라요.');
        const { data: signedUp, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: displayName || email.split('@')[0] } },
        });
        if (error) throw error;
        if (signedUp.user && signedUp.user.identities?.length === 0) throw new Error('already registered');
        if (!signedUp.session) {
          setAuthMessage(`${email}로 인증 메일을 보냈어요. 메일 속 링크를 누르면 가입이 완료돼요.`);
          form.reset();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/invalid login credentials/i.test(message)) setAuthError('이메일이나 비밀번호가 맞지 않아요.');
      else if (/email not confirmed/i.test(message)) setAuthError('메일함에서 이메일 인증을 먼저 완료해 주세요.');
      else if (/email address not authorized/i.test(message)) setAuthError('현재 Supabase 기본 메일은 프로젝트 관리자 이메일에만 인증 메일을 보낼 수 있어요.');
      else if (/already registered|already exists/i.test(message)) setAuthError('이미 가입된 이메일이에요. 로그인해 주세요.');
      else setAuthError(message || '처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setAuthBusy(false);
    }
  };

  const saveCatProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    if (hasSupabaseConfig && !user) { flash('프로필을 수정하려면 먼저 로그인해 주세요.'); setTab('myPage'); return; }
    const data = new FormData(event.currentTarget);
    const profile = {
      personality: String(data.get('personality')).trim(),
      likes: String(data.get('likes')).trim(),
      favoriteSpot: String(data.get('favoriteSpot')).trim(),
      caution: String(data.get('caution')).trim(),
    };
    try {
      if (supabase && user) {
        const { error } = await supabase.from('cats').update({ personality: profile.personality, likes: profile.likes, favorite_spot: profile.favoriteSpot, caution: profile.caution }).eq('id', selected.id);
        if (error) throw error;
      }
      const updated = { ...selected, ...profile };
      setSelected(updated);
      setCats((current) => current.map((cat) => cat.id === updated.id ? updated : cat));
      flash(`${selected.name}의 프로필을 저장했어요.`);
      setEditingProfile(false);
      setTab('profile');
    } catch { flash('프로필을 저장하지 못했어요.'); }
  };

  const saveMyProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('displayName')).trim() || '고양이 친구';
    const bio = String(data.get('bio')).trim();
    try {
      if (supabase && user) {
        const { data: updated, error } = await supabase.auth.updateUser({ data: { display_name: name, bio } });
        if (error) throw error;
        setUser(updated.user);
      } else {
        localStorage.setItem('nyangdo-my-profile', JSON.stringify({ name, bio }));
      }
      setMyName(name);
      setMyBio(bio);
      flash('내 프로필을 저장했어요.');
    } catch { flash('내 프로필을 저장하지 못했어요.'); }
  };

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) return flash('이 기기에서는 현재 위치를 사용할 수 없어요.');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const next: [number, number] = [coords.latitude, coords.longitude]; setFocusPosition(next);
      if (isInsidePnuCampus(coords.latitude, coords.longitude)) { setDraftPoint(next); if (isChoosingLocation) setHasChosenLocation(true); flash('현재 위치로 이동했어요.'); }
      else flash('현재 위치로 이동했어요. 등록은 부산캠퍼스 안에서만 가능해요.');
    }, () => flash('위치 권한을 허용해 주세요.'), { enableHighAccuracy: true, timeout: 8000 });
  };

  const locateMe = () => { if (localStorage.getItem('nyangdo-location-choice') !== 'granted') return setShowLocationConsent(true); requestCurrentLocation(); };
  const chooseCat = (cat: MapCat) => { setIsChoosingLocation(false); setHasChosenLocation(false); setSelected(cat); setFocusPosition([cat.lat, cat.lng]); setTab('map'); };

  if (hasSupabaseConfig && !authReady) {
    return <main className="app-shell auth-shell"><section className="auth-loading" aria-live="polite"><span className="auth-pixel-cat">=^･ω･^=</span><p>고양이 지도를 준비하고 있어요…</p></section></main>;
  }

  if (hasSupabaseConfig && !user) {
    return (
      <main className="app-shell auth-shell">
        <section className="auth-gate" aria-labelledby="auth-title">
          <div className="auth-shape auth-shape-one" aria-hidden="true" /><div className="auth-shape auth-shape-two" aria-hidden="true" />
          <header className="auth-brand"><span className="auth-mascot" aria-hidden="true"><i>• ᴗ •</i></span><h1 id="auth-title">meow map</h1><p>부산대 고양이들의 오늘을<br />친구들과 함께 기록해요</p></header>
          <div className="auth-card">
            {authMessage ? <div className="auth-mail-sent" role="status"><span>✉</span><b>인증 메일을 확인해 주세요</b><p>{authMessage}</p><button type="button" onClick={() => { setAuthMode('login'); setAuthMessage(''); }}>인증 후 로그인하기</button></div> : <form className="auth-form" onSubmit={handleAuth}>
              {authMode === 'signup' && <label className="auth-field"><span aria-hidden="true">♙</span><input required name="displayName" autoComplete="name" aria-label="닉네임" placeholder="닉네임" /></label>}
              <label className="auth-field"><span aria-hidden="true">✉</span><input required name="email" type="email" autoComplete="email" aria-label="이메일" placeholder="이메일" /></label>
              <label className="auth-field"><span aria-hidden="true">♙</span><input required name="password" type="password" minLength={8} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} aria-label="비밀번호" placeholder="비밀번호 (8자 이상)" /></label>
              {authMode === 'signup' && <label className="auth-field"><span aria-hidden="true">✓</span><input required name="passwordConfirm" type="password" minLength={8} autoComplete="new-password" aria-label="비밀번호 확인" placeholder="비밀번호 확인" /></label>}
              {authError && <p className="auth-error" role="alert">{authError}</p>}
              <button className="auth-submit" disabled={authBusy} type="submit">{authBusy ? '잠시만요…' : authMode === 'login' ? '로그인' : '회원가입'} </button>
            </form>}
            {!authMessage && <p className="auth-switch">{authMode === 'login' ? '아직 계정이 없나요?' : '이미 계정이 있나요?'} <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}>{authMode === 'login' ? '회원가입' : '로그인'}</button></p>}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="map-stage" aria-label="부산대학교 부산캠퍼스 고양이 위치 지도">
        <CatMap cats={cats} selectedId={selected?.id ?? null} onSelect={isChoosingLocation ? () => undefined : setSelected} onMapClick={chooseDraftLocation} focusPosition={focusPosition} />
        <header className="floating-header"><div className="brand-pill"><span className="mini-cat">=^･ω･^=</span><div><b>meow map</b><small>{hasSupabaseConfig ? 'PNU CAT MAP' : 'LOCAL PREVIEW'}</small></div></div><button className="count-pill" type="button" onClick={() => setTab('cats')}><span>{cats.length}</span> 마리</button></header>
        <div className="map-actions"><button type="button" onClick={locateMe} aria-label="사용자의 현재 위치로 지도 이동">⌖</button></div>
        {isChoosingLocation && <><div className="location-picker-tip"><small>LOCATION PICKER</small><b>{hasChosenLocation ? '이 위치가 맞나요?' : '고양이를 발견한 곳을 눌러주세요'}</b></div><div className="location-picker-actions"><button type="button" onClick={cancelLocationSelection}>취소</button><button type="button" disabled={!hasChosenLocation} onClick={() => openReport(draftPoint[0], draftPoint[1])}>이 위치로 등록하기 <span>↗</span></button></div></>}
        {selected && tab === 'map' && <article className={`selected-card is-clickable ${selected.photo ? '' : 'no-photo'}`}><button className="card-profile-hit" type="button" onClick={() => { setEditingProfile(false); setTab('profile'); }} aria-label={`${selected.name} 프로필 보기`} /><button className="card-close" type="button" onClick={() => setSelected(null)} aria-label="상세 카드 닫기">×</button>{selected.photo && <img src={selected.photo} alt={`${selected.name} 사진`} />}<div className="selected-copy"><div><span>최근 목격</span><small>{formatSeen(selected.spottedAt)}</small></div><h2>{selected.name}</h2><p>⌖ {selected.place}</p><button className="selected-gallery-link" type="button" onClick={() => { setGalleryDate(''); setTab('gallery'); }}>{selected.name}의 갤러리 <span>{selected.gallery?.length ?? 0}장</span></button></div><span className="profile-card-arrow" aria-hidden="true">›</span></article>}
      </section>

      {tab === 'cats' && <section className="overlay-panel cat-list-panel"><div className="panel-heading"><div><small>ALL CATS</small><h1>고양이 친구들</h1></div></div><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름이나 장소로 찾아보세요" /></label><div className="cat-list">{filteredCats.map((cat) => <button key={cat.id} className={`cat-row ${cat.photo ? '' : 'no-photo'}`} type="button" onClick={() => chooseCat(cat)}>{cat.photo && <img src={cat.photo} alt="" />}<span><b>{cat.name}</b><small>⌖ {cat.place}</small></span><i>{cat.gallery?.length ?? 0}장</i></button>)}</div></section>}

      {tab === 'gallery' && selected && <section className="overlay-panel gallery-panel">
        <div className="gallery-topbar"><button type="button" onClick={() => setTab('map')} aria-label="지도와 설명으로 돌아가기">‹</button><div><small>CAT GALLERY</small><h1>{selected.name}의 갤러리</h1></div><span>{selected.gallery?.length ?? 0}</span></div>
        <div className={`gallery-summary ${selected.photo ? '' : 'no-photo'}`}>{selected.photo && <img src={selected.photo} alt="" />}<div><b>{selected.name}의 하루들</b><p>⌖ {selected.place}</p></div></div>
        <button className="gallery-add-button" type="button" onClick={() => { setGalleryDraftFile(null); setGalleryDraftPreview(''); setGalleryCaption(''); setShowGalleryComposer(true); }}><span>＋</span> 사진 추가하기</button>
        {galleryGroups.length > 0 && <label className="gallery-calendar"><span>▦ 날짜로 이동</span><input type="date" value={galleryDate} min={galleryGroups.at(-1)?.[0]} max={galleryGroups[0]?.[0]} onChange={(event) => jumpToGalleryDate(event.target.value)} /></label>}
        <div className="gallery-days">{galleryGroups.map(([day, photos]) => <section className="gallery-day" id={`gallery-${day}`} key={day}><div className="date-divider"><b>{formatGalleryDate(day)}</b><span>{photos.length}장</span></div><div className="photo-grid">{photos.map((photo) => <button className="photo-tile" type="button" key={photo.id} onClick={() => setViewerPhoto(photo)}><img src={photo.url} alt={`${selected.name} ${formatGalleryDate(day)} 사진`} /></button>)}</div></section>)}{!galleryGroups.length && <div className="empty-gallery"><span>▧</span><b>아직 사진이 없어요</b><p>첫 번째 목격 사진을 남겨 주세요.</p></div>}</div>
        {showGalleryComposer && <section className="gallery-upload-sheet" role="dialog" aria-modal="true" aria-labelledby="gallery-upload-title">
          <div className="gallery-upload-topbar"><button type="button" onClick={closeGalleryComposer} aria-label="사진 추가 취소">‹</button><div><small>NEW POLAROID</small><h2 id="gallery-upload-title">사진 추가하기</h2></div></div>
          <form className="gallery-polaroid-form" onSubmit={handleGalleryUpload}>
            <input ref={galleryInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={handleGalleryPhotoPick} />
            <div className="upload-polaroid">
              <button className="upload-polaroid-photo" type="button" onClick={() => galleryInput.current?.click()}>
                {galleryDraftPreview ? <img src={galleryDraftPreview} alt="추가할 사진 미리보기" /> : <span><b>＋</b>사진을 눌러 추가해 주세요<small>JPG · PNG · WEBP / 최대 5MB</small></span>}
              </button>
              <label className="upload-polaroid-note"><span>사진 설명</span><textarea rows={3} value={galleryCaption} onChange={(event) => setGalleryCaption(event.target.value)} placeholder="예: 도서관 앞에서 낮잠 자는 중" /></label>
            </div>
            <button className="gallery-upload-submit" disabled={galleryUploading || !galleryDraftFile} type="submit">{galleryUploading ? '올리는 중…' : `${selected.name}의 갤러리에 추가하기`} <span>↗</span></button>
          </form>
        </section>}
      </section>}

      {viewerPhoto && selected && <section className="photo-viewer" role="dialog" aria-modal="true" aria-label={`${selected.name} 사진 크게 보기`}><button className="viewer-close" type="button" onClick={() => setViewerPhoto(null)} aria-label="사진 닫기">×</button><article className="polaroid-card"><div className="polaroid-image"><img src={viewerPhoto.url} alt={`${selected.name} 크게 보기`} /></div><div className="polaroid-caption"><small>{formatSeen(viewerPhoto.spottedAt)}</small><p>{viewerPhoto.caption || '아직 남겨진 설명이 없어요.'}</p><span>— {viewerPhoto.uploadedBy ?? '익명의 친구'}</span></div></article></section>}

      {tab === 'profile' && selected && <section className="overlay-panel cat-profile-panel"><div className="panel-handle" /><div className="profile-panel-nav"><button type="button" onClick={() => setTab('map')} aria-label="지도와 설명으로 돌아가기">‹</button><span>프로필</span></div><div className={`profile-hero ${selected.photo ? '' : 'no-photo'}`}>{selected.photo && <img src={selected.photo} alt={`${selected.name} 프로필 사진`} />}<div><small>CAT PROFILE</small><h1>{selected.name}</h1><p>⌖ {selected.place}</p></div></div>{editingProfile ? <div className="profile-editor"><div className="profile-section-title"><div><small>EDIT PROFILE</small><h2>프로필 내용 작성</h2></div><button type="button" onClick={() => setEditingProfile(false)}>취소</button></div><form onSubmit={saveCatProfile}><label><span>성격과 특징</span><textarea name="personality" rows={3} defaultValue={selected.personality} placeholder="예: 느긋하고 사람을 잘 따라요" /></label><label><span>좋아하는 것</span><input name="likes" defaultValue={selected.likes} placeholder="예: 햇빛, 참치 간식, 벤치 밑" /></label><label><span>자주 있는 장소</span><input name="favoriteSpot" defaultValue={selected.favoriteSpot} placeholder="예: 중앙도서관 앞 벤치" /></label><label><span>다가갈 때 주의할 점</span><textarea name="caution" rows={2} defaultValue={selected.caution} placeholder="예: 낮잠 잘 때는 만지지 않기" /></label><p>친구들이 함께 참고할 수 있는 정보만 적어 주세요.</p><button type="submit">{selected.name} 프로필 저장하기 <span>↗</span></button></form></div> : <div className="profile-view"><div className="profile-section-title"><div><small>OUR NOTES</small><h2>친구들이 알려준 {selected.name}</h2></div><span>공동 작성</span></div><dl className="profile-facts"><div><dt>성격과 특징</dt><dd>{selected.personality || '아직 적힌 내용이 없어요.'}</dd></div><div><dt>좋아하는 것</dt><dd>{selected.likes || '아직 적힌 내용이 없어요.'}</dd></div><div><dt>자주 있는 장소</dt><dd>{selected.favoriteSpot || '아직 적힌 내용이 없어요.'}</dd></div><div><dt>다가갈 때 주의할 점</dt><dd>{selected.caution || '아직 적힌 내용이 없어요.'}</dd></div></dl><button className="profile-edit-button" type="button" onClick={() => setEditingProfile(true)}>내용 추가·수정하기 <span>＋</span></button></div>}</section>}

      {tab === 'report' && <section className="overlay-panel report-panel"><div className="panel-heading"><div><small>NEW SIGHTING</small><h1>새 고양이 발견!</h1></div><button className="report-close" type="button" onClick={cancelReport} aria-label="고양이 등록 취소">×</button></div><form onSubmit={handleSubmit}><button type="button" className={`photo-uploader ${draftPhotos.length ? 'has-photo' : ''}`} onClick={() => photoInput.current?.click()}>{draftPhotos.length ? <div className="upload-preview-grid">{draftPhotos.slice(0, 4).map((photo, index) => <img key={photo} src={photo} alt={`선택한 사진 ${index + 1}`} />)}{draftPhotos.length > 4 && <b>+{draftPhotos.length - 4}</b>}</div> : <><span>＋</span><b>고양이 사진 여러 장 추가</b><small>한 번에 최대 8장</small></>}</button><input ref={photoInput} hidden type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handlePhotos} /><div className="field-row"><label><span>이름</span><input required name="name" placeholder="예: 치즈" /></label><label><span>발견 장소</span><input required name="place" placeholder="예: 도서관 뒤" /></label></div><label><span>고양이 털색</span><select required name="coat" defaultValue="orange"><option value="gray">회색 고등어</option><option value="orange">치즈</option><option value="calico">삼색이</option><option value="black">검정 / 턱시도</option><option value="white">흰색</option></select></label><label><span>발견한 사람</span><input name="spottedBy" placeholder="별명도 좋아요" /></label><label><span>특징이나 메모</span><textarea name="note" rows={3} placeholder="성격, 생김새, 자주 보이는 시간…" /></label><p className="location-confirm">● 선택한 지도 위치와 오늘 날짜가 함께 저장돼요</p><button className="save-button" disabled={saving} type="submit">{saving ? '등록하는 중…' : '지도와 갤러리에 등록하기'} <span>↗</span></button></form></section>}

      {tab === 'mine' && <section className="overlay-panel about-panel record-panel"><div className="panel-heading"><div><small>MY RECORD</small><h1>내 기록</h1></div></div><div className="record-summary"><span>♧</span><div><b>{cats.length}마리</b><small>지금 지도에서 만나고 있어요</small></div><i>{cats.reduce((count, cat) => count + (cat.gallery?.length ?? 0), 0)} PHOTOS</i></div><h2 className="record-title">최근 고양이</h2><div className="cat-list">{cats.slice(0, 4).map((cat) => <button key={cat.id} className={`cat-row ${cat.photo ? '' : 'no-photo'}`} type="button" onClick={() => chooseCat(cat)}>{cat.photo && <img src={cat.photo} alt="" />}<span><b>{cat.name}</b><small>⌖ {cat.place}</small></span><i>{formatSeen(cat.spottedAt)}</i></button>)}</div></section>}

      {tab === 'myPage' && <section className="overlay-panel about-panel auth-panel my-page-panel"><div className="panel-heading"><div><small>MY PAGE</small><h1>마이페이지</h1></div></div><div className="my-profile-card"><div className="my-avatar">{myName.slice(0, 1)}</div><div><small>{hasSupabaseConfig ? 'VERIFIED MEMBER' : 'LOCAL PROFILE'}</small><h2>{myName}</h2><p>{user?.email || '이 기기에 저장되는 미리보기 프로필'}</p></div></div><form className="my-profile-form" onSubmit={saveMyProfile}><label><span>닉네임</span><input name="displayName" defaultValue={myName} placeholder="지도에서 사용할 이름" /></label><label><span>한 줄 소개</span><textarea name="bio" rows={3} defaultValue={myBio} placeholder="고양이 친구들에게 나를 소개해 주세요" /></label><button type="submit">프로필 저장하기 <span>↗</span></button></form>{user && <button className="my-logout" type="button" onClick={() => { setTab('map'); void supabase?.auth.signOut(); }}>로그아웃</button>}</section>}

      {showLocationConsent && <section className="consent-backdrop" role="dialog" aria-modal="true" aria-labelledby="location-consent-title"><div className="consent-card"><div className="consent-icon" aria-hidden="true">⌖</div><small>LOCATION INFO</small><h2 id="location-consent-title">내 주변 고양이를<br />찾아볼까요?</h2><p>현재 위치로 지도를 이동합니다. 위치는 저장하지 않으며, 고양이 등록은 부산캠퍼스 안에서만 가능해요.</p><div className="consent-points"><span><b>01</b> 지도 중심 이동에만 사용</span><span><b>02</b> 언제든 기기 설정에서 변경</span></div><button className="consent-accept" type="button" onClick={() => { localStorage.setItem('nyangdo-location-choice', 'granted'); setShowLocationConsent(false); requestCurrentLocation(); }}>동의하고 위치 보기 <span>↗</span></button><button className="consent-later" type="button" onClick={() => { localStorage.setItem('nyangdo-location-choice', 'later'); setShowLocationConsent(false); }}>나중에 할게요</button></div></section>}

      <nav className="bottom-nav" aria-label="하단 메뉴"><button className={tab === 'map' && !isChoosingLocation ? 'active' : ''} type="button" onClick={() => { cancelLocationSelection(); setTab('map'); }}><span>⌖</span><small>지도</small></button><button className={tab === 'cats' ? 'active' : ''} type="button" onClick={() => { cancelLocationSelection(); setTab('cats'); }}><span>♧</span><small>고양이</small></button><button className="add-tab" type="button" onClick={beginLocationSelection} aria-label="새 고양이 위치 선택"><span>＋</span></button><button className={tab === 'mine' ? 'active' : ''} type="button" onClick={() => { cancelLocationSelection(); setTab('mine'); }}><span>♡</span><small>내 기록</small></button><button className={tab === 'myPage' ? 'active' : ''} type="button" onClick={() => { cancelLocationSelection(); setTab('myPage'); }}><span>♙</span><small>마이페이지</small></button></nav>
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
