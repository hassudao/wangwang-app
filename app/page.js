"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Search, PlusSquare, MessageCircle, User, 
  Bell, Send, Image as ImageIcon, Heart, MessageSquare, Share2,
  Sparkles, LogOut, Mail, Lock, UserPlus, LogIn, ChevronLeft,
  Camera, Check, X, AlertCircle, RefreshCw, Calendar, Flame
} from 'lucide-react';

const getSafeEnv = (key) => {
  if (typeof window !== 'undefined') {
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

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useState({
    username: 'guest_user',
    display_name: 'ゲストワンちゃん',
    bio: 'WangWangへようこそ！新しいハイブリッドなSNS空間を一緒に作っていこう🐾',
    avatar_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&auto=format&fit=crop&q=80', // 犬アバター
    cover_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80'
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ show: false, message: '', onConfirm: () => {} });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editCover, setEditCover] = useState('');

  const [uploadingField, setUploadingField] = useState(null); 
  const [uploadProgress, setUploadProgress] = useState(0);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const postImageInputRef = useRef(null);

  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');

  const [selectedChat, setSelectedChat] = useState(null); 
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'Yui', text: 'WangWangに登録したよ！これからよろしくね。', time: '10:24', isMe: false, read: true },
    { id: 2, sender: 'Me', text: 'ありがとう！デザインかなりいい感じに仕上がってきたよ！', time: '10:26', isMe: true, read: true }
  ]);
  const [newMessageText, setNewMessageText] = useState('');

  // プロ野球（NPB）リアルタイム検索結果ステート
  const [baseballLoading, setBaseballLoading] = useState(false);
  const [baseballError, setBaseballError] = useState('');
  const [baseballData, setBaseballData] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  useEffect(() => {
    const initApp = async () => {
      if (typeof window !== 'undefined') {
        // デフォルトの投稿データをLocalStorageから取得、存在しない場合は初期モックを表示
        const storedPosts = localStorage.getItem('wangwang_local_posts_v2');
        if (storedPosts) {
          try {
            setPosts(JSON.parse(storedPosts));
          } catch(e) {
            console.error(e);
          }
        } else {
          const defaultPosts = [
            {
              id: 1,
              user: 'ワンちゃん隊長',
              username: 'dog_captain',
              avatar: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&auto=format&fit=crop&q=80',
              text: 'WangWangへようこそ！このアプリは、投稿内容をリロードしても消えずに保存される仕組みがしっかりと組まれているよ！お気軽に投稿を試してみてね🐾',
              image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600&auto=format&fit=crop&q=80',
              likes: 12,
              comments: 3,
              time: '1時間前'
            },
            {
              id: 2,
              user: 'ユイ',
              username: 'yui_wang',
              avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
              text: 'ハイブリッドSNS、動きが軽快でチャットも使いやすい！デザインもモダンで可愛いですね。',
              image: null,
              likes: 5,
              comments: 1,
              time: '3時間前'
            }
          ];
          setPosts(defaultPosts);
          localStorage.setItem('wangwang_local_posts_v2', JSON.stringify(defaultPosts));
        }

        // Supabase の CDN スクリプト読み込み
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

        // 初回ロード時にプロ野球データを自動取得
        fetchTodayBaseballResults();
      }
    };

    initApp();
  }, []);

  const fetchTodayBaseballResults = async () => {
    setBaseballLoading(true);
    setBaseballError('');
    try {
      const apiKey = ""; // Canvas環境により自動適用されるため空文字列で定義
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

      const userQuery = "2026年5月25日前後（直近日程）の日本のプロ野球（NPB）の試合結果、対戦カード、スコア、現在の状況を日本語で正確に教えてください。";
      const systemPrompt = "プロ野球(NPB)の最新情報を検索して報告する、世界一親切なスポーツアンカー。試合がない日の場合は『本日の試合はありません。直近の試合スケジュールは以下です。』と前置きをして予定を箇条書きしてください。";

      const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        tools: [{ "google_search": {} }],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              date: { type: "STRING", description: "例: 2026年5月25日の結果" },
              summary: { type: "STRING", description: "今日のNPB概況・試合予定などの簡単な1行サマリー" },
              games: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    homeTeam: { type: "STRING", description: "ホーム球団名" },
                    awayTeam: { type: "STRING", description: "ビジター球団名" },
                    homeScore: { type: "STRING", description: "ホーム得点（未開始なら '-'）" },
                    awayScore: { type: "STRING", description: "ビジター得点（未開始なら '-'）" },
                    status: { type: "STRING", description: "例: 試合終了, 6回裏, 中止, 18:00開始予定" }
                  },
                  required: ["homeTeam", "awayTeam", "status"]
                }
              }
            },
            required: ["date", "summary", "games"]
          }
        }
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('スコアの取得に失敗しました。時間をおいて再試行してください。');
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];

      if (candidate && candidate.content?.parts?.[0]?.text) {
        const jsonText = candidate.content.parts[0].text;
        const parsedData = JSON.parse(jsonText);
        setBaseballData(parsedData);
      } else {
        throw new Error('解析可能な野球データが取得できませんでした。');
      }
    } catch (err) {
      console.error('NPB Fetch Error:', err);
      setBaseballError(err.message || '野球データの読み込み中にエラーが発生しました。');
    } finally {
      setBaseballLoading(false);
    }
  };

  const setupAuthListener = (supabaseClient) => {
    if (!supabaseClient) {
      const mockSession = localStorage.getItem('wangwang_mock_session');
      if (mockSession) {
        const parsed = JSON.parse(mockSession);
        setUser(parsed);
        fetchUserProfile(parsed.id, null);
      }
      setAuthLoading(false);
      return;
    }

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, supabaseClient);
      }
      setAuthLoading(false);
    });

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

  const fetchUserProfile = async (userId, supabaseClient) => {
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
          avatar_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&auto=format&fit=crop&q=80',
          cover_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80'
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
          avatar_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&auto=format&fit=crop&q=80',
          cover_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80'
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

  const uploadToCloudinary = async (file, fieldType) => {
    const CLOUDINARY_PRESET = getSafeEnv('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
    const CLOUDINARY_CLOUD_NAME = getSafeEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');

    const cloudName = CLOUDINARY_CLOUD_NAME || localCloudName;
    const uploadPreset = CLOUDINARY_PRESET || localUploadPreset;

    if (!cloudName || !uploadPreset) {
      showToast('Cloudinaryが未設定のため、デモ用画像を仮選択しました！', 'success');
      const mockImages = {
        avatar: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=150&auto=format&fit=crop&q=80',
        cover: 'https://images.unsplash.com/photo-1541599540903-216a46ca1ad0?w=800&auto=format&fit=crop&q=80',
        post: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80'
      };
      return mockImages[fieldType];
    }

    setUploadingField(fieldType);
    setUploadProgress(15);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      setUploadProgress(50);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Cloudinaryアップロードに失敗しました。接続情報が正しいかご確認ください。');

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
      showToast('プロフィールアイコンを仮セットしました（保存で確定されます）', 'success');
    } else if (fieldType === 'cover') {
      setEditCover(uploadedUrl);
      showToast('ヘッダー画像を仮セットしました（保存で確定されます）', 'success');
    } else if (fieldType === 'post') {
      setNewPostImage(uploadedUrl);
      showToast('投稿に画像を添付しました！', 'success');
    }
  };

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
      setAuthError('ユーザーネームは3〜15文字の英数字、またはアンダースコア(_)のみです。');
      return;
    }

    if (!supabase) {
      const mockUser = { id: `user_${Date.now()}`, email };
      localStorage.setItem('wangwang_mock_session', JSON.stringify(mockUser));
      const mockProfile = {
        id: mockUser.id,
        username: checkUsername,
        display_name: displayNameInput || '新規ワンちゃん',
        bio: 'WangWangへようこそ！新しい空間を一緒に楽しみましょう🐾',
        avatar_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&auto=format&fit=crop&q=80',
        cover_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80'
      };
      localStorage.setItem(`wangwang_profile_${mockUser.id}`, JSON.stringify(mockProfile));
      setUser(mockUser);
      setProfile(mockProfile);
      setEditUsername(mockProfile.username);
      setEditName(mockProfile.display_name);
      setEditBio(mockProfile.bio);
      setEditAvatar(mockProfile.avatar_url);
      setEditCover(mockProfile.cover_url);
      showToast('テストアカウントを仮作成しました（モック起動）', 'success');
      return;
    }

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
          avatar_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&auto=format&fit=crop&q=80',
          cover_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80'
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) {
      setAuthError('メールアドレスとパスワードを入力してください。');
      return;
    }

    if (!supabase) {
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
      setAuthError('ログインに失敗しました。認証情報をご確認ください。');
    }
  };

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

    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);
    // リロードしても消えないように即座にLocalStorageへ保存
    localStorage.setItem('wangwang_local_posts_v2', JSON.stringify(updatedPosts));

    setNewPostText('');
    setNewPostImage('');
    showToast('新しく投稿しました！🐾', 'success');
  };

  const toggleLike = (postId) => {
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        return { ...post, likes: post.likes + 1 };
      }
      return post;
    });
    setPosts(updatedPosts);
    localStorage.setItem('wangwang_local_posts_v2', JSON.stringify(updatedPosts));
  };

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
                        placeholder="今なにしてる？愛犬のことや雑談を投稿しよう！🐾" 
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
                            title="画像を追加"
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
              
              {/* Cover Header - 見切れ防止構造へ修正 */}
              <div className="relative mb-14">
                <div 
                  className="h-44 bg-slate-100 rounded-2xl bg-cover bg-center"
                  style={{ backgroundImage: `url(${profile.cover_url})` }}
                />
                <div className="absolute -bottom-10 left-4 z-10">
                  <img 
                    src={profile.avatar_url} 
                    alt="avatar" 
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md bg-white" 
                  />
                </div>
              </div>

              {/* Profile details */}
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

        {/* ─── RIGHT SIDEBAR ─── */}
        {}
        <aside className="hidden lg:block w-80 p-4 h-screen sticky top-0 space-y-4 overflow-y-auto bg-slate-50 border-l border-slate-200">
          
          {/* NPB Baseball Live Scores Section */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                プロ野球 今日の結果
              </h3>
              <button 
                onClick={fetchTodayBaseballResults} 
                disabled={baseballLoading}
                className="p-1 hover:bg-slate-100 rounded-full transition text-slate-500 disabled:opacity-50"
                title="最新情報に更新"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${baseballLoading ? 'animate-spin text-indigo-500' : ''}`} />
              </button>
            </div>

            {baseballLoading ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                <p>Google検索で最新スコアを収穫中...</p>
              </div>
            ) : baseballError ? (
              <div className="py-6 text-center text-xs text-red-500 bg-red-50 rounded-xl p-2">
                {baseballError}
              </div>
            ) : baseballData ? (
              <div className="space-y-3.5">
                <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-500 flex justify-between items-center">
                  <span className="font-semibold">{baseballData.date}</span>
                  <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[9px] font-medium">Live</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed bg-indigo-50/40 p-2 rounded-lg border border-indigo-100/30">
                  {baseballData.summary}
                </p>
                <div className="space-y-2.5">
                  {baseballData.games && baseballData.games.length > 0 ? (
                    baseballData.games.map((game, i) => (
                      <div key={i} className="border border-slate-100 rounded-xl p-2.5 hover:shadow-sm transition bg-white space-y-1.5">
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span className="font-bold text-slate-700">{game.homeTeam} VS {game.awayTeam}</span>
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md text-[9px]">
                            {game.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{game.homeTeam}</span>
                            <span className="text-lg font-black text-indigo-600">{game.homeScore || '-'}</span>
                          </div>
                          <span className="text-slate-300 text-xs font-normal">ー</span>
                          <div className="flex items-center gap-2 flex-row-reverse">
                            <span>{game.awayTeam}</span>
                            <span className="text-lg font-black text-indigo-600">{game.awayScore || '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">本日の対戦スケジュールはありません。</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">右上の更新アイコンを押して、最新の野球情報を取得してください。</p>
            )}
          </div>

          {/* Hot Trends Section */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Flame className="w-4 h-4 text-orange-500" />
              トレンドのタグ
            </h3>
            <div className="space-y-3">
              {[
                { tag: 'プロ野球', count: '12,504 posts' },
                { tag: '犬のいる暮らし', count: '8,421 posts' },
                { tag: '日曜の夜', count: '5,122 posts' },
                { tag: 'WangWangハック', count: '3,109 posts' },
                { tag: 'Cloudinary接続', count: '1,894 posts' }
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    setNewPostText(prev => prev + ` #${item.tag} `);
                    setActiveTab('home');
                    showToast(`タグ「#${item.tag}」を入力欄に追加しました！`, 'success');
                  }}
                  className="group flex justify-between items-center p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition">
                      #{item.tag}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {item.count}
                    </p>
                  </div>
                  <PlusSquare className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition opacity-0 group-hover:opacity-100" />
                </div>
              ))}
            </div>
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
      {}
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
