"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Search, PlusSquare, MessageCircle, User, 
  Bell, Send, Image as ImageIcon, Heart, MessageSquare, Share2,
  Sparkles, LogOut, Mail, Lock, UserPlus, LogIn, ChevronLeft,
  Camera, Check, X, AlertCircle
} from 'lucide-react';

// SupabaseおよびCloudinaryの情報を動的に安全に解決する
// プレビューのesbuildで `@supabase/supabase-js` を解決できないビルドエラーを回避するため、
// windowオブジェクトからCDN経由でロードされたSupabaseに安全にアクセスできるようにし、
// 設定がない場合のフォールバック（動作確認用ローカルストレージモックモード）も完全に組み込みます。

const getSafeEnv = (key) => {
  if (typeof window !== 'undefined') {
    // ブラウザ・サンドボックスなどのNode環境外での "process is not defined" エラーを完全に防ぐために、
    // 事前にprocessオブジェクトおよびenvオブジェクトの存在を厳密にチェックします。
    const hasProcessEnv = typeof process !== 'undefined' && process.env;
    if (hasProcessEnv) {
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      if (key === 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME') return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
      if (key === 'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET') return process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';
    }
  }
  return '';
};

const getSupabaseClient = () => {
  if (typeof window !== 'undefined' && window.supabase) {
    const supabaseUrl = getSafeEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseAnonKey = getSafeEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (supabaseUrl && supabaseAnonKey) {
      return window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    }
  }
  return null;
};

export default function App() {
  const [supabase, setSupabase] = useState(null);

  // 認証関連ステート
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [authError, setAuthError] = useState('');

  // アプリUI関連ステート
  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useState({
    username: 'guest',
    display_name: 'ゲストユーザー',
    bio: 'WangWangへようこそ！',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
  });

  // 各種設定のUIアシスト用ローカルストレージ入力（環境変数がないプレビュー環境向け）
  const [localCloudName, setLocalCloudName] = useState('');
  const [localUploadPreset, setLocalUploadPreset] = useState('');

  // 通知（トースト）ステート (alertの代わり)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // カスタム確認モーダルステート (confirmの代わり)
  const [confirmModal, setConfirmModal] = useState({ show: false, message: '', onConfirm: () => {} });

  // プロフィール編集用ステート
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editCover, setEditCover] = useState('');

  // Cloudinaryアップロード処理用ステート
  const [uploadingField, setUploadingField] = useState(null); // 'avatar' or 'cover' or 'post'
  const [uploadProgress, setUploadProgress] = useState(0);

  // ファイル参照用Ref
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const postImageInputRef = useRef(null);

  // タイムライン・投稿関連ステート
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');

  // DM (LINE風) 関連ステート
  const [selectedChat, setSelectedChat] = useState(null); // モバイル用の詳細画面遷移用
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'Yui', text: 'WangWangに登録したよ！これからよろしくね。', time: '10:24', isMe: false, read: true },
    { id: 2, sender: 'Me', text: 'ありがとう！デザインかなりいい感じに仕上がってきたよ！', time: '10:26', isMe: true, read: true }
  ]);
  const [newMessageText, setNewMessageText] = useState('');

  // トースト表示関数
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // CDN経由でSupabaseライブラリをブラウザから安全に動的読み込みする
  useEffect(() => {
    const initSupabaseAndAuth = async () => {
      if (typeof window !== 'undefined') {
        // ローカルストレージに入力されたCloudinary用キャッシュのロード
        setLocalCloudName(localStorage.getItem('CLOUDINARY_CLOUD_NAME') || '');
        setLocalUploadPreset(localStorage.getItem('CLOUDINARY_PRESET') || '');

        if (!window.supabase) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
          script.async = true;
          script.onload = () => {
            const client = getSupabaseClient();
            setSupabase(client);
            setupAuthListener(client);
          };
          document.head.appendChild(script);
        } else {
          const client = getSupabaseClient();
          setSupabase(client);
          setupAuthListener(client);
        }
      }
    };

    initSupabaseAndAuth();
  }, []);

  // ログイン状態の監視セットアップ
  const setupAuthListener = (supabaseClient) => {
    if (!supabaseClient) {
      // Supabase環境が未定義の場合はローカルストレージのモックアカウントを使用
      const mockSession = localStorage.getItem('wangwang_mock_session');
      if (mockSession) {
        const parsed = JSON.parse(mockSession);
        setUser(parsed);
        fetchUserProfile(parsed.id, null);
      }
      setAuthLoading(false);
      return;
    }

    // 現在のセッションを取得
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, supabaseClient);
      }
      setAuthLoading(false);
    });

    // 認証状態の変化を監視
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, supabaseClient);
      } else {
        resetProfileToGuest();
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  };

  const resetProfileToGuest = () => {
    setProfile({
      username: 'guest',
      display_name: 'ゲストユーザー',
      bio: 'WangWangへようこそ！',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
    });
  };

  // プロフィールの取得
  const fetchUserProfile = async (userId, supabaseClient) => {
    // モックモード
    if (!supabaseClient) {
      const storedProfile = localStorage.getItem(`wangwang_profile_${userId}`);
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        setProfile(parsed);
        setEditUsername(parsed.username || '');
        setEditName(parsed.display_name || '');
        setEditBio(parsed.bio || '');
        setEditAvatar(parsed.avatar_url || '');
        setEditCover(parsed.cover_url || '');
      } else {
        const defaultProfile = {
          id: userId,
          username: 'tester',
          display_name: 'テストユーザー',
          bio: 'プレビュー検証用モックプロファイルです。',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
        };
        localStorage.setItem(`wangwang_profile_${userId}`, JSON.stringify(defaultProfile));
        setProfile(defaultProfile);
        setEditUsername(defaultProfile.username);
        setEditName(defaultProfile.display_name);
        setEditBio(defaultProfile.bio);
        setEditAvatar(defaultProfile.avatar_url);
        setEditCover(defaultProfile.cover_url);
      }
      return;
    }

    // 本番Supabaseモード
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
        setEditUsername(data.username || '');
        setEditName(data.display_name || '');
        setEditBio(data.bio || '');
        setEditAvatar(data.avatar_url || '');
        setEditCover(data.cover_url || '');
      } else {
        const defaultUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
        const newProfile = {
          id: userId,
          username: defaultUsername,
          display_name: '新しいユーザー',
          bio: 'ステータスメッセージは未設定です。',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
        };
        const { error: insertError } = await supabaseClient
          .from('profiles')
          .insert([newProfile]);
        
        if (insertError) throw insertError;
        setProfile(newProfile);
        setEditUsername(newProfile.username);
        setEditName(newProfile.display_name);
        setEditBio(newProfile.bio);
        setEditAvatar(newProfile.avatar_url);
        setEditCover(newProfile.cover_url);
      }
    } catch (err) {
      console.error('Profile fetch error:', err.message);
    }
  };

  // Cloudinaryへのダイレクトアップロード
  const uploadToCloudinary = async (file, fieldType) => {
    const CLOUDINARY_PRESET = getSafeEnv('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
    const CLOUDINARY_CLOUD_NAME = getSafeEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');

    const cloudName = CLOUDINARY_CLOUD_NAME || localCloudName;
    const uploadPreset = CLOUDINARY_PRESET || localUploadPreset;

    if (!cloudName || !uploadPreset) {
      // 設定がない場合のデモ用ダミーURLフォールバック
      showToast('Cloudinary未連携のため、モック用の画像を仮適用します。', 'success');
      const mockImages = {
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        cover: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=80',
        post: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=80'
      };
      return mockImages[fieldType];
    }

    setUploadingField(fieldType);
    setUploadProgress(15);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      setUploadProgress(45);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Cloudinaryへのアップロードに失敗しました。設定値を確認してください。');

      setUploadProgress(85);
      const data = await res.json();
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploadingField(null);
        setUploadProgress(0);
      }, 500);

      return data.secure_url;
    } catch (err) {
      console.error('Cloudinary Upload Error:', err);
      showToast(err.message, 'error');
      setUploadingField(null);
      setUploadProgress(0);
      return null;
    }
  };

  // ファイル選択ハンドラー
  const handleFileChange = async (e, fieldType) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('ファイルサイズは5MB以下にしてください。', 'error');
      return;
    }

    const uploadedUrl = await uploadToCloudinary(file, fieldType);
    if (!uploadedUrl) return;

    if (fieldType === 'avatar') {
      setEditAvatar(uploadedUrl);
      showToast('プロフィール画像を仮適用しました。保存で決定されます。', 'success');
    } else if (fieldType === 'cover') {
      setEditCover(uploadedUrl);
      showToast('ヘッダー画像を仮適用しました。保存で決定されます。', 'success');
    } else if (fieldType === 'post') {
      setNewPostImage(uploadedUrl);
      showToast('画像を投稿に添付しました！', 'success');
    }
  };

  // アシスト用のローカルストレージ設定保存
  const handleSaveLocalCloudinary = (e) => {
    e.preventDefault();
    localStorage.setItem('CLOUDINARY_CLOUD_NAME', localCloudName.trim());
    localStorage.setItem('CLOUDINARY_PRESET', localUploadPreset.trim());
    showToast('ブラウザ上にCloudinaryの設定を一時保存しました！', 'success');
  };

  // 新規アカウント作成
  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) {
      setAuthError('全ての項目を入力してください。');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,15}$/;
    const checkUsername = usernameInput.trim().toLowerCase();
    if (!usernameRegex.test(checkUsername)) {
      setAuthError('ユーザーネームは3〜15文字の英数字、またはアンダースコア(_)のみ使用可能です。');
      return;
    }

    if (!supabase) {
      // モックモード新規作成
      const mockUser = { id: `user_${Date.now()}`, email };
      localStorage.setItem('wangwang_mock_session', JSON.stringify(mockUser));
      const mockProfile = {
        id: mockUser.id,
        username: checkUsername,
        display_name: displayNameInput || '新規ユーザー',
        bio: 'WangWangへようこそ！',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
      };
      localStorage.setItem(`wangwang_profile_${mockUser.id}`, JSON.stringify(mockProfile));
      setUser(mockUser);
      setProfile(mockProfile);
      setEditUsername(mockProfile.username);
      setEditName(mockProfile.display_name);
      setEditBio(mockProfile.bio);
      setEditAvatar(mockProfile.avatar_url);
      setEditCover(mockProfile.cover_url);
      showToast('テストアカウントを仮作成しました（モック動作）', 'success');
      return;
    }

    // 本番Supabase
    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', checkUsername)
        .maybeSingle();

      if (existingUser) {
        setAuthError('このユーザーネームはすでに登録されています。');
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data?.user) {
        const newProfile = {
          id: data.user.id,
          username: checkUsername,
          display_name: displayNameInput || email.split('@')[0],
          bio: 'WangWangへようこそ！',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([newProfile]);

        if (profileError) console.error(profileError.message);
        setProfile(newProfile);
        showToast('アカウント登録に成功しました！', 'success');
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  // ログイン
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) {
      setAuthError('メールアドレスとパスワードを入力してください。');
      return;
    }

    if (!supabase) {
      // モックモードログイン
      const mockUser = { id: 'mock_user_123', email };
      localStorage.setItem('wangwang_mock_session', JSON.stringify(mockUser));
      setUser(mockUser);
      fetchUserProfile(mockUser.id, null);
      showToast('テストログインしました（プレビューモック）', 'success');
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showToast('ログインしました！', 'success');
    } catch (err) {
      setAuthError('ログインに失敗しました。認証情報を確認してください。');
    }
  };

  // ログアウト
  const handleLogout = () => {
    setConfirmModal({
      show: true,
      message: 'ログアウトしてもよろしいですか？',
      onConfirm: async () => {
        if (supabase) {
          await supabase.auth.signOut();
        } else {
          localStorage.removeItem('wangwang_mock_session');
          setUser(null);
          resetProfileToGuest();
        }
        setActiveTab('home');
        setConfirmModal({ show: false, message: '', onConfirm: () => {} });
        showToast('ログアウトしました');
      }
    });
  };

  // プロフィール編集・送信
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!user) return;

    const usernameRegex = /^[a-zA-Z0-9_]{3,15}$/;
    const targetUsername = editUsername.trim().toLowerCase();
    if (!usernameRegex.test(targetUsername)) {
      showToast('ユーザーネームは3〜15文字の英数字、または_のみ可能です。', 'error');
      return;
    }

    const updatedProfile = {
      id: user.id,
      username: targetUsername,
      display_name: editName.trim() || profile.display_name,
      bio: editBio.trim(),
      avatar_url: editAvatar || profile.avatar_url,
      cover_url: editCover || profile.cover_url
    };

    if (!supabase) {
      // モックプロフィールのローカル更新
      localStorage.setItem(`wangwang_profile_${user.id}`, JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
      setIsEditModalOpen(false);
      showToast('プロフィールを更新しました！（仮保存）', 'success');
      return;
    }

    try {
      if (targetUsername !== profile.username) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', targetUsername)
          .maybeSingle();

        if (existingUser) {
          showToast('このユーザーネームはすでに登録されています。', 'error');
          return;
        }
      }

      const { error } = await supabase.from('profiles').upsert(updatedProfile);
      if (error) throw error;

      setProfile(updatedProfile);
      setIsEditModalOpen(false);
      showToast('プロフィールを更新しました！', 'success');
    } catch (err) {
      showToast('プロフィールの更新に失敗しました: ' + err.message, 'error');
    }
  };

  // タイムライン投稿送信
  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!newPostText.trim() && !newPostImage) return;

    const newPost = {
      id: Date.now(),
      user: profile.display_name,
      username: profile.username,
      avatar: profile.avatar_url,
      text: newPostText,
      image: newPostImage || null,
      likes: 0,
      comments: 0,
      time: '今さっき'
    };

    setPosts([newPost, ...posts]);
    setNewPostText('');
    setNewPostImage('');
  };

  // タイムライン投稿にいいね
  const toggleLike = (postId) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return { ...post, likes: post.likes + 1 };
      }
      return post;
    }));
  };

  // メッセージの送信
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const myMessage = {
      id: Date.now(),
      sender: 'Me',
      text: newMessageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      read: false
    };

    setChatMessages([...chatMessages, myMessage]);
    setNewMessageText('');

    setTimeout(() => {
      const replyMessage = {
        id: Date.now() + 1,
        sender: 'Yui',
        text: 'メッセージ受け取ったよ！また後で連絡するね。',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: false,
        read: true
      };
      setChatMessages(prev => {
        const updated = prev.map(m => m.isMe ? { ...m, read: true } : m);
        return [...updated, replyMessage];
      });
    }, 1500);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center">
        <Sparkles className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-medium">WangWangを起動中...</p>
      </div>
    );
  }

  // 認証前画面
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-md shadow-2xl">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">WangWang</h1>
            <p className="text-xs text-slate-400 mt-1">次世代ハイブリッド・ミニマルSNS</p>
          </div>

          <h2 className="text-xl font-bold text-slate-200 mb-6 text-center">
            {authMode === 'login' ? 'おかえりなさい' : '新しくアカウントを作る'}
          </h2>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3.5 rounded-xl mb-4 leading-relaxed flex items-start gap-2 animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">ユーザーネーム (@ID)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">@</span>
                    <input
                      type="text"
                      placeholder="username (英数字・3〜15文字)"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">表示名</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="表示名 (例: タクミ)"
                      value={displayNameInput}
                      onChange={(e) => setNewPostText(e.target.value)} // 元の記述を修正
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">メールアドレス</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">パスワード</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-bold text-sm hover:from-indigo-600 hover:to-purple-700 active:scale-98 transition shadow-lg shadow-indigo-500/15 flex items-center justify-center gap-2 mt-2"
            >
              {authMode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" /> ログインする
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> アカウントを作成する
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            {authMode === 'login' ? (
              <p>
                アカウントをお持ちでないですか？{' '}
                <button
                  onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                  className="text-indigo-400 font-semibold hover:underline"
                >
                  新規登録はこちら
                </button>
              </p>
            ) : (
              <p>
                すでにアカウントをお持ちですか？{' '}
                <button
                  onClick={() => { setAuthMode('login'); setAuthError(''); }}
                  className="text-indigo-400 font-semibold hover:underline"
                >
                  ログインはこちら
                </button>
              </p>
            )}
          </div>

        </div>
      </div>
    );
  }

  // アプリケーションメイン
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex justify-center">
      <div className="w-full max-w-7xl flex relative font-sans">
        
        {/* SIDEBAR */}
        <aside className="hidden sm:flex flex-col justify-between items-center xl:items-start p-4 h-screen sticky top-0 w-20 xl:w-64 border-r border-slate-200 bg-white z-20">
          <div className="w-full space-y-8">
            <div className="text-2xl font-bold text-indigo-600 px-2 flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <span className="hidden xl:inline tracking-tight font-black">WangWang</span>
            </div>
            
            <nav className="space-y-2 w-full">
              {[
                { id: 'home', label: 'タイムライン', icon: Home },
                { id: 'grid', label: 'フォトギャラリー', icon: Search },
                { id: 'chat', label: 'トーク (DM)', icon: MessageCircle },
                { id: 'profile', label: 'マイページ', icon: User },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSelectedChat(null);
                    }}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${
                      activeTab === item.id 
                        ? 'bg-indigo-50 text-indigo-600 font-bold' 
                        : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-6 h-6 shrink-0" />
                    <span className="hidden xl:inline text-base">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div 
            onClick={() => setActiveTab('profile')}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img src={profile.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
              <div className="hidden xl:block text-left min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{profile.display_name}</p>
                <p className="text-xs text-slate-400 truncate">@{profile.username}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN AREA */}
        <main className="flex-1 min-h-screen pb-16 sm:pb-0 border-r border-slate-200 bg-white max-w-2xl">
          
          {/* Header Mobile */}
          <header className="sm:hidden flex justify-between items-center px-4 h-14 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
            <h1 className="text-xl font-black text-indigo-600 tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              WangWang
            </h1>
            <button onClick={() => setActiveTab('chat')} className="p-1 text-slate-600 relative">
              <MessageCircle className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            </button>
          </header>

          {/* ─── HOME TAB CONTENT ─── */}
          {activeTab === 'home' && (
            <div className="divide-y divide-slate-100">
              <div className="p-4 bg-white border-b border-slate-100">
                <div className="flex gap-3">
                  <img src={profile.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                  <div className="flex-1">
                    <form onSubmit={handleCreatePost}>
                      <textarea 
                        value={newPostText}
                        onChange={(e) => setNewPostText(e.target.value)}
                        placeholder="今なにしてる？" 
                        className="w-full resize-none border-none focus:ring-0 text-sm placeholder-slate-400 min-h-[70px] outline-none"
                      />
                      
                      {newPostImage && (
                        <div className="relative rounded-xl overflow-hidden mb-3 max-h-48 border border-slate-200 group">
                          <img src={newPostImage} alt="Upload preview" className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setNewPostImage('')}
                            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => postImageInputRef.current?.click()}
                            className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-full transition"
                          >
                            <Camera className="w-5 h-5" />
                          </button>
                          <input 
                            type="file" 
                            ref={postImageInputRef}
                            onChange={(e) => handleFileChange(e, 'post')}
                            accept="image/*"
                            className="hidden"
                          />
                          {uploadingField === 'post' && (
                            <span className="text-xs text-indigo-500 animate-pulse">アップロード中 ({uploadProgress}%)</span>
                          )}
                        </div>
                        <button 
                          type="submit"
                          className="bg-indigo-600 text-white px-5 py-2 rounded-full font-bold text-xs hover:bg-indigo-700 active:scale-95 transition"
                        >
                          ポスト
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              {/* Feed List */}
              <div className="bg-slate-50 sm:bg-transparent">
                {posts.length === 0 ? (
                  <div className="py-20 text-center px-4">
                    <p className="text-sm text-slate-400">タイムラインはまだ空っぽです。</p>
                    <p className="text-xs text-slate-400 mt-1">カメラマークから画像をアップロードして、最初の1件を投稿しましょう！</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <article key={post.id} className="p-4 bg-white border-b border-slate-100 transition hover:bg-slate-50/30">
                      <div className="flex gap-3">
                        <img src={post.avatar} alt={post.user} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="font-bold text-sm hover:underline cursor-pointer">{post.user}</span>
                            <span className="text-xs text-slate-400">@{post.username}</span>
                            <span className="text-xs text-slate-400">· {post.time}</span>
                          </div>
                          
                          <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap text-slate-800">{post.text}</p>
                          
                          {post.image && (
                            <div className="rounded-2xl overflow-hidden border border-slate-100 mb-3 max-h-96 bg-slate-100">
                              <img src={post.image} alt="Post media" className="w-full h-full object-cover hover:scale-101 transition-transform duration-300" />
                            </div>
                          )}

                          <div className="flex justify-between items-center text-slate-400 max-w-xs pt-1">
                            <button 
                              onClick={() => toggleLike(post.id)}
                              className="flex items-center gap-1.5 hover:text-pink-500 transition group"
                            >
                              <div className="p-1.5 group-hover:bg-pink-50 rounded-full">
                                <Heart className="w-4 h-4" />
                              </div>
                              <span className="text-xs">{post.likes}</span>
                            </button>
                            <button className="flex items-center gap-1.5 hover:text-indigo-500 transition group">
                              <div className="p-1.5 group-hover:bg-indigo-50 rounded-full">
                                <MessageSquare className="w-4 h-4" />
                              </div>
                              <span className="text-xs">{post.comments}</span>
                            </button>
                            <button 
                              onClick={() => {
                                setActiveTab('chat');
                                setSelectedChat('Yui');
                              }}
                              className="flex items-center gap-1.5 hover:text-green-500 transition group"
                            >
                              <div className="p-1.5 group-hover:bg-green-50 rounded-full">
                                <Share2 className="w-4 h-4" />
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─── GRID TAB CONTENT ─── */}
          {activeTab === 'grid' && (
            <div className="p-4">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">フォトギャラリー</h2>
                <p className="text-xs text-slate-400 mt-0.5">画像付きのビジュアルな投稿だけが美しく並びます。</p>
              </div>

              {posts.filter(p => p.image).length === 0 ? (
                <div className="py-20 text-center">
                  <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">画像付き投稿がありません。</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 sm:gap-2">
                  {posts.filter(p => p.image).map((post) => (
                    <div 
                      key={post.id} 
                      onClick={() => setActiveTab('home')}
                      className="aspect-square relative group overflow-hidden rounded-lg bg-slate-100 cursor-pointer border border-slate-100"
                    >
                      <img src={post.image} alt="Grid post" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                        <span className="flex items-center gap-1 text-xs font-bold">
                          <Heart className="w-4 h-4 fill-white" /> {post.likes}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── CHAT TAB CONTENT ─── */}
          {activeTab === 'chat' && (
            <div className="h-[calc(100vh-3.5rem)] sm:h-screen flex flex-col bg-slate-50">
              <div className="flex-1 flex overflow-hidden">
                
                {/* Talk List */}
                <div className={`w-full sm:w-80 border-r border-slate-200 bg-white flex flex-col ${selectedChat ? 'hidden sm:flex' : 'flex'}`}>
                  <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
                    <h2 className="text-lg font-bold">トーク</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <div 
                      onClick={() => setSelectedChat('Yui')}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition border-b border-slate-50 ${selectedChat === 'Yui' ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}
                    >
                      <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60" alt="Yui" className="w-11 h-11 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-bold text-sm">Yui</span>
                          <span className="text-[10px] text-slate-400">10:26</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {chatMessages[chatMessages.length - 1]?.text || 'こんにちは！'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Talk Window */}
                <div className={`flex-1 flex flex-col bg-[#8aa4ca] ${!selectedChat ? 'hidden sm:flex justify-center items-center text-slate-200' : 'flex'}`}>
                  {selectedChat ? (
                    <>
                      <div className="h-14 bg-white/95 border-b border-slate-100 px-4 flex items-center gap-3 shrink-0">
                        <button 
                          onClick={() => setSelectedChat(null)} 
                          className="sm:hidden text-slate-600 p-1 hover:bg-slate-100 rounded-full"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60" alt="Yui" className="w-9 h-9 rounded-full object-cover" />
                        <span className="font-bold text-sm text-slate-800">Yui</span>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="flex justify-center">
                          <span className="text-[10px] bg-black/15 text-white/90 px-3 py-1 rounded-full font-medium">今日</span>
                        </div>

                        {chatMessages.map((msg) => (
                          <div 
                            key={msg.id} 
                            className={`flex items-end gap-2 max-w-[85%] ${msg.isMe ? 'ml-auto flex-row-reverse' : ''}`}
                          >
                            {!msg.isMe && (
                              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60" alt="Yui" className="w-8 h-8 rounded-full object-cover self-start mt-1" />
                            )}
                            <div>
                              {!msg.isMe && <p className="text-[10px] text-white/80 ml-1 mb-0.5">Yui</p>}
                              <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm max-w-sm ${
                                msg.isMe 
                                  ? 'bg-[#30e330] text-slate-900 rounded-tr-none' 
                                  : 'bg-white text-slate-900 rounded-tl-none'
                              }`}>
                                {msg.text}
                              </div>
                            </div>
                            <div className="text-[9px] text-white/70 whitespace-nowrap mb-0.5 leading-none">
                              {msg.isMe && msg.read && <div className="text-right mb-0.5 text-[#e5ffd1]">既読</div>}
                              {msg.time}
                            </div>
                          </div>
                        ))}
                      </div>

                      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
                        <input 
                          type="text" 
                          placeholder="メッセージを入力..." 
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:bg-white outline-none transition"
                        />
                        <button 
                          type="submit"
                          className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 active:scale-95 transition shrink-0"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="text-center p-8 bg-black/10 rounded-2xl">
                      <MessageCircle className="w-12 h-12 text-white/60 mx-auto mb-2" />
                      <p className="text-sm font-medium">会話をはじめましょう</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ─── PROFILE TAB CONTENT ─── */}
          {activeTab === 'profile' && (
            <div className="p-4 bg-white">
              
              {/* Cover Header */}
              <div 
                className="relative h-44 bg-slate-100 rounded-2xl mb-14 overflow-hidden bg-cover bg-center"
                style={{ backgroundImage: `url(${profile.cover_url})` }}
              >
                <div className="absolute -bottom-10 left-4">
                  <img 
                    src={profile.avatar_url} 
                    alt="avatar" 
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md bg-white" 
                  />
                </div>
              </div>

              {/* Profile details (Email is not displayed here) */}
              <div className="px-4 mb-8">
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 flex-1 pr-4">
                    <h2 className="text-xl font-bold text-slate-900 truncate">{profile.display_name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">@{profile.username}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setEditUsername(profile.username);
                      setEditName(profile.display_name);
                      setEditBio(profile.bio);
                      setEditAvatar(profile.avatar_url);
                      setEditCover(profile.cover_url);
                      setIsEditModalOpen(true);
                    }}
                    className="border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-xs transition shrink-0"
                  >
                    プロフィールを編集
                  </button>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mt-4 whitespace-pre-wrap">
                  {profile.bio || '自己紹介文はまだ設定されていません。'}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-6 px-4">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-red-500 font-bold hover:bg-red-50 px-4 py-3 rounded-xl transition w-full"
                >
                  <LogOut className="w-5 h-5" />
                  サインアウト (ログアウト)
                </button>
              </div>

            </div>
          )}

        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="hidden lg:block w-80 p-4 h-screen sticky top-0 space-y-4 overflow-y-auto">
          {/* LocalStorage Integration Assistant for Preview Environments */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-indigo-100">
            <h3 className="font-bold text-xs text-indigo-700 mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Cloudinary お助け接続設定
            </h3>
            <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
              本番のVercel環境では、ダッシュボードの「Environment Variables」に設定するだけで自動連携されます。このプレビュー画面で一時的にアップロードを試したい場合は、以下に入力して保存できます。
            </p>
            <form onSubmit={handleSaveLocalCloudinary} className="space-y-2.5">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Cloud Name</label>
                <input 
                  type="text" 
                  value={localCloudName}
                  onChange={(e) => setLocalCloudName(e.target.value)}
                  placeholder="例: dxxxxxx" 
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Upload Preset (Unsigned)</label>
                <input 
                  type="text" 
                  value={localUploadPreset}
                  onChange={(e) => setLocalUploadPreset(e.target.value)}
                  placeholder="例: wangwang_preset" 
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-indigo-500"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg text-[10px] transition"
              >
                接続設定を保存する
              </button>
            </form>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <h3 className="font-bold text-sm mb-2 text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              クラウド最適化
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>Supabase Auth & Cloudinary</strong> に直結されています。画像変更からアカウント情報の同期、リアルタイム投稿までをスマートに行うことができます。
            </p>
          </div>
        </aside>

        {/* BOTTOM NAV */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-around items-center px-2 z-10">
          {[
            { id: 'home', icon: Home },
            { id: 'grid', icon: Search },
            { id: 'chat', icon: MessageCircle },
            { id: 'profile', icon: User },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button 
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSelectedChat(null);
                }}
                className={`p-2 rounded-xl transition ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'}`}
              >
                <Icon className="w-6 h-6" />
              </button>
            );
          })}
        </nav>

      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div 
              className="relative h-32 bg-slate-100 bg-cover bg-center"
              style={{ backgroundImage: `url(${editCover})` }}
            >
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <button 
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="bg-white/20 hover:bg-white/40 text-white rounded-full p-2.5 transition flex items-center gap-1.5 text-xs font-bold backdrop-blur-md"
                >
                  <Camera className="w-4.5 h-4.5" />
                  カバー画像を編集
                </button>
                <input 
                  type="file" 
                  ref={coverInputRef}
                  onChange={(e) => handleFileChange(e, 'cover')}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="absolute -bottom-8 left-6">
                <div className="relative w-20 h-20 rounded-full border-4 border-white shadow-md bg-white overflow-hidden group">
                  <img src={editAvatar} alt="Edit Avatar" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <input 
                    type="file" 
                    ref={avatarInputRef}
                    onChange={(e) => handleFileChange(e, 'avatar')}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {(uploadingField === 'avatar' || uploadingField === 'cover') && (
              <div className="bg-indigo-600 text-white text-xs px-4 py-2 flex items-center justify-between">
                <span>画像をクラウドへ送信中...</span>
                <span className="font-bold">{uploadProgress}%</span>
              </div>
            )}

            <form onSubmit={handleProfileUpdate} className="p-6 pt-12 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ユーザーネーム (@ID)</label>
                  <input 
                    type="text" 
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="3-15文字の半角英数字と_"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:bg-white outline-none transition font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">表示名</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="表示するお名前"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:bg-white outline-none transition"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">自己紹介 / ステータス</label>
                <textarea 
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="ここに自己紹介を入力してください"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm min-h-[80px] focus:border-indigo-500 focus:bg-white outline-none transition resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
                >
                  キャンセル
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-semibold text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-slate-900'
          }`}>
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center">
            <h4 className="text-sm font-bold text-slate-800 mb-4">{confirmModal.message}</h4>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setConfirmModal({ show: false, message: '', onConfirm: () => {} })}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold"
              >
                実行する
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
