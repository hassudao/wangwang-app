"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Search, PlusSquare, MessageCircle, User, 
  Bell, Send, Image as ImageIcon, Heart, MessageSquare, Share2,
  Sparkles, LogOut, Mail, Lock, UserPlus, LogIn, ChevronLeft, Check
} from 'lucide-react';

// 環境変数からSupabaseの接続情報を取得 (存在しない場合は空)
const supabaseUrl = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_URL || '') : '';
const supabaseAnonKey = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '') : '';

export default function App() {
  // 認証関連ステート
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [notification, setNotification] = useState(null); // 自作トースト通知用
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // 自作ログアウト確認用

  // アプリUI関連ステート
  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useState({
    display_name: 'ゲストユーザー',
    bio: 'WangWangへようこそ！',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');

  // タイムライン・投稿関連ステート
  const [posts, setPosts] = useState([
    {
      id: 1,
      user: 'Yui',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      text: 'WangWangのデザインがかなり洗練されてて使いやすい！これからお気に入りの場所になりそう。',
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600',
      likes: 12,
      comments: 3,
      time: '2時間前'
    },
    {
      id: 2,
      user: 'Ken',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      text: 'アカウント機能がつくと一気に本格的なSNSらしくなってワクワクするね💻',
      image: null,
      likes: 5,
      comments: 1,
      time: '5時間前'
    }
  ]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');

  // DM (LINE風) 関連ステート
  const [selectedChat, setSelectedChat] = useState(null); 
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'Yui', text: 'WangWangに登録したよ！これからよろしくね。', time: '10:24', isMe: false, read: true },
    { id: 2, sender: 'Me', text: 'ありがとう！デザインかなりいい感じに仕上がってきたよ！', time: '10:26', isMe: true, read: true }
  ]);
  const [newMessageText, setNewMessageText] = useState('');

  // Supabaseクライアントの参照 (esbuildエラー回避のために動的ロード)
  const supabaseRef = useRef(null);

  useEffect(() => {
    // クライアントサイドでのみSupabase-jsを動的にロードしてコンパイルエラーを回避
    const loadSupabase = async () => {
      if (typeof window !== 'undefined') {
        try {
          // すでにロードされているか確認、なければCDNから読み込み
          if (!window.supabase) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.async = true;
            script.onload = () => {
              initializeSupabase();
            };
            document.body.appendChild(script);
          } else {
            initializeSupabase();
          }
        } catch (e) {
          console.warn("Supabase load failed, falling back to mock authentication.");
          setupMockAuth();
        }
      }
    };

    const initializeSupabase = () => {
      if (window.supabase && supabaseUrl && supabaseAnonKey) {
        try {
          supabaseRef.current = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
          setupSupabaseListeners();
        } catch (err) {
          setupMockAuth();
        }
      } else {
        // 環境変数がない場合はローカルのモックAuthモード
        setupMockAuth();
      }
    };

    const setupSupabaseListeners = () => {
      const client = supabaseRef.current;
      if (!client) return;

      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          fetchUserProfile(session.user.id);
        } else {
          setupMockAuth();
        }
      });

      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(session.user);
          fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setAuthLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    };

    const setupMockAuth = () => {
      // ローカルストレージを使用したダミー認証（プレビュー用）
      const savedUser = localStorage.getItem('wangwang_mock_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        const savedProfile = localStorage.getItem(`wangwang_profile_${parsed.id}`);
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
        } else {
          setProfile({
            display_name: parsed.email.split('@')[0],
            bio: 'WangWangへようこそ！',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          });
        }
      }
      setAuthLoading(false);
    };

    loadSupabase();
  }, []);

  const fetchUserProfile = async (userId) => {
    if (!supabaseRef.current) return;
    try {
      const { data, error } = await supabaseRef.current
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setEditName(data.display_name || '');
        setEditBio(data.bio || '');
      } else {
        // プロフィールが存在しない場合は作成
        const newProfile = {
          id: userId,
          display_name: email.split('@')[0] || 'ユーザー',
          bio: 'ステータスメッセージは未設定です。',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        };
        const { error: insertError } = await supabaseRef.current
          .from('profiles')
          .insert([newProfile]);
        
        if (insertError) throw insertError;
        setProfile(newProfile);
        setEditName(newProfile.display_name);
        setEditBio(newProfile.bio);
      }
    } catch (err) {
      console.error('Profile fetch error:', err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const triggerNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // アカウント作成 (サインアップ)
  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) {
      setAuthError('メールアドレスとパスワードを入力してください。');
      return;
    }

    if (supabaseRef.current) {
      try {
        const { data, error } = await supabaseRef.current.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data?.user) {
          const newProfile = {
            id: data.user.id,
            display_name: displayNameInput || email.split('@')[0],
            bio: 'WangWangへようこそ！',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          };

          const { error: profileError } = await supabaseRef.current
            .from('profiles')
            .insert([newProfile]);

          if (profileError) console.error('Profile creation error:', profileError.message);
          
          setProfile(newProfile);
          triggerNotification('アカウント作成が完了しました！');
        }
      } catch (err) {
        setAuthError(err.message);
      }
    } else {
      // モックサインアップ
      const mockUser = { id: 'mock_' + Date.now(), email };
      setUser(mockUser);
      const mockProfile = {
        display_name: displayNameInput || email.split('@')[0],
        bio: 'WangWangへようこそ！（テスト用モックアカウント）',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };
      setProfile(mockProfile);
      localStorage.setItem('wangwang_mock_user', JSON.stringify(mockUser));
      localStorage.setItem(`wangwang_profile_${mockUser.id}`, JSON.stringify(mockProfile));
      triggerNotification('アカウントを作成しました（テスト環境）');
    }
  };

  // ログイン (サインイン)
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) {
      setAuthError('メールアドレスとパスワードを入力してください。');
      return;
    }

    if (supabaseRef.current) {
      try {
        const { error } = await supabaseRef.current.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } catch (err) {
        setAuthError('ログインに失敗しました。認証情報をご確認ください。');
      }
    } else {
      // モックログイン
      const mockUser = { id: 'mock_default', email };
      setUser(mockUser);
      const mockProfile = {
        display_name: email.split('@')[0],
        bio: 'WangWangへようこそ！（テスト用モックアカウント）',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };
      setProfile(mockProfile);
      localStorage.setItem('wangwang_mock_user', JSON.stringify(mockUser));
      localStorage.setItem(`wangwang_profile_${mockUser.id}`, JSON.stringify(mockProfile));
      triggerNotification('ログインしました（テスト環境）');
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    if (supabaseRef.current) {
      await supabaseRef.current.auth.signOut();
    } else {
      localStorage.removeItem('wangwang_mock_user');
      setUser(null);
    }
    setShowLogoutConfirm(false);
    setActiveTab('home');
    triggerNotification('ログアウトしました');
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!user) return;

    const updatedProfile = {
      ...profile,
      display_name: editName,
      bio: editBio
    };

    if (supabaseRef.current) {
      try {
        const { error } = await supabaseRef.current
          .from('profiles')
          .upsert(updatedProfile);

        if (error) throw error;
        setProfile(updatedProfile);
        setIsEditModalOpen(false);
        triggerNotification('プロフィールを保存しました');
      } catch (err) {
        triggerNotification('更新に失敗しました: ' + err.message);
      }
    } else {
      setProfile(updatedProfile);
      localStorage.setItem(`wangwang_profile_${user.id}`, JSON.stringify(updatedProfile));
      setIsEditModalOpen(false);
      triggerNotification('プロフィールを保存しました（テスト環境）');
    }
  };

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    const newPost = {
      id: Date.now(),
      user: profile.display_name,
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
    triggerNotification('タイムラインにポストしました！');
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
        text: 'メッセージ受け取りました！WangWangのリアルタイム設計、最高にスマートですね✨',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: false,
        read: true
      };
      setChatMessages(prev => {
        const updated = prev.map(m => m.isMe ? { ...m, read: true } : m);
        return [...updated, replyMessage];
      });
    }, 1200);
  };

  const toggleLike = (postId) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return { ...post, likes: post.likes + 1 };
      }
      return post;
    }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center">
        <Sparkles className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-medium">WangWangを起動中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* 背景グラデーション演出 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl relative z-10">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight">WangWang</h1>
            <p className="text-xs text-slate-400 mt-1">次世代ハイブリッド・ミニマルSNS</p>
          </div>

          <h2 className="text-xl font-bold text-slate-200 mb-6 text-center">
            {authMode === 'login' ? 'おかえりなさい' : '新しくアカウントを作る'}
          </h2>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3.5 rounded-xl mb-4 leading-relaxed">
              {authError}
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">表示名</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="ユーザー名 (例: タクミ)"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                    required
                  />
                </div>
              </div>
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex justify-center relative">
      
      {/* 自作トースト通知 */}
      {notification && (
        <div className="fixed top-4 right-4 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 text-sm border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      <div className="w-full max-w-7xl flex relative">
        
        {/* ========================================================= */}
        {/* LEFT SIDEBAR: PC & Tablet Navigation                      */}
        {/* ========================================================= */}
        <aside className="hidden sm:flex flex-col justify-between items-center xl:items-start p-4 h-screen sticky top-0 w-20 xl:w-64 border-r border-slate-200 bg-white">
          <div className="w-full space-y-8">
            <div className="text-2xl font-bold text-indigo-600 px-2 flex items-center gap-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="hidden xl:inline tracking-tight font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">WangWang</span>
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
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Icon className="w-6 h-6 shrink-0" />
                    <span className="hidden xl:inline text-sm">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div 
            onClick={() => setActiveTab('profile')}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <img src={profile.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
              <div className="hidden xl:block text-left">
                <p className="font-bold text-xs truncate max-w-[120px]">{profile.display_name}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{user.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* MAIN CONTENT AREA                                         */}
        {/* ========================================================= */}
        <main className="flex-1 min-h-screen pb-16 sm:pb-0 border-r border-slate-200 bg-white max-w-2xl">
          
          {/* Mobile Top Header */}
          <header className="sm:hidden flex justify-between items-center px-4 h-14 border-b border-slate-200 sticky top-0 bg-white/90 backdrop-blur-md z-30">
            <h1 className="text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              WangWang
            </h1>
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveTab('chat')} className="p-1 text-slate-600 relative">
                <MessageCircle className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></span>
              </button>
            </div>
          </header>

          {/* ─── TIMELINE TAB ─── */}
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
                      <div className="mb-3">
                        <input 
                          type="text"
                          placeholder="画像のURLを追加 (任意)"
                          value={newPostImage}
                          onChange={(e) => setNewPostImage(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-300 transition"
                        />
                      </div>
                      <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                        <span className="text-[11px] text-slate-400">画像URLを入れてビジュアル投稿！</span>
                        <button 
                          type="submit"
                          className="bg-indigo-600 text-white px-5 py-1.5 rounded-full font-bold text-xs hover:bg-indigo-700 active:scale-95 transition shadow-sm shadow-indigo-100"
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
                {posts.map((post) => (
                  <article key={post.id} className="p-4 bg-white border-b border-slate-100 transition hover:bg-slate-50/20">
                    <div className="flex gap-3">
                      <img src={post.avatar} alt={post.user} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-bold text-sm hover:underline cursor-pointer">{post.user}</span>
                          <span className="text-xs text-slate-400">· {post.time}</span>
                        </div>
                        
                        <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap">{post.text}</p>
                        
                        {post.image && (
                          <div className="rounded-2xl overflow-hidden border border-slate-100 mb-3 max-h-96 bg-slate-100">
                            <img src={post.image} alt="Post media" className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div className="flex justify-between items-center text-slate-400 max-w-xs pt-1">
                          <button 
                            onClick={() => toggleLike(post.id)}
                            className="flex items-center gap-1.5 hover:text-pink-500 transition group"
                          >
                            <div className="p-1.5 group-hover:bg-pink-50 rounded-full transition">
                              <Heart className="w-4 h-4" />
                            </div>
                            <span className="text-xs">{post.likes}</span>
                          </button>
                          <button className="flex items-center gap-1.5 hover:text-indigo-500 transition group">
                            <div className="p-1.5 group-hover:bg-indigo-50 rounded-full transition">
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
                            <div className="p-1.5 group-hover:bg-green-50 rounded-full transition">
                              <Share2 className="w-4 h-4" />
                            </div>
                          </button>
                        </div>

                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* ─── GRID TAB ─── */}
          {activeTab === 'grid' && (
            <div className="p-4">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">フォトギャラリー</h2>
                <p className="text-xs text-slate-400 mt-0.5">ビジュアルコンテンツが整然と並ぶギャラリースペースです。</p>
              </div>

              {posts.filter(p => p.image).length === 0 ? (
                <div className="py-20 text-center">
                  <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">表示できる画像がありません。</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                  {posts.filter(p => p.image).map((post) => (
                    <div 
                      key={post.id} 
                      onClick={() => setActiveTab('home')}
                      className="aspect-square relative group overflow-hidden rounded-2xl bg-slate-100 cursor-pointer border border-slate-100"
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

          {/* ─── CHAT TAB ─── */}
          {activeTab === 'chat' && (
            <div className="h-[calc(100vh-3.5rem)] sm:h-screen flex flex-col bg-slate-50">
              <div className="flex-1 flex overflow-hidden">
                
                <div className={`w-full sm:w-80 border-r border-slate-200 bg-white flex flex-col ${selectedChat ? 'hidden sm:flex' : 'flex'}`}>
                  <div className="p-4 border-b border-slate-100 bg-white">
                    <h2 className="text-lg font-bold">トーク</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <div 
                      onClick={() => setSelectedChat('Yui')}
                      className={`flex items-center gap-3 p-3.5 cursor-pointer transition border-b border-slate-50 ${selectedChat === 'Yui' ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}
                    >
                      <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" alt="Yui" className="w-11 h-11 rounded-full object-cover border border-slate-100" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-bold text-sm">Yui</span>
                          <span className="text-[10px] text-slate-400">10:26</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {chatMessages[chatMessages.length - 1]?.text}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Talk Area (LINE-style) */}
                <div className={`flex-1 flex flex-col bg-[#8aa4ca] ${!selectedChat ? 'hidden sm:flex justify-center items-center text-slate-200' : 'flex'}`}>
                  {selectedChat ? (
                    <>
                      <div className="h-14 bg-white/95 border-b border-slate-200 px-4 flex items-center gap-3 shrink-0 z-10">
                        <button 
                          onClick={() => setSelectedChat(null)} 
                          className="sm:hidden text-slate-600 p-1 hover:bg-slate-100 rounded-full"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" alt="Yui" className="w-9 h-9 rounded-full object-cover" />
                        <span className="font-bold text-sm text-slate-800">Yui</span>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="flex justify-center">
                          <span className="text-[10px] bg-black/15 text-white/90 px-3 py-1 rounded-full font-semibold">今日</span>
                        </div>

                        {chatMessages.map((msg) => (
                          <div 
                            key={msg.id} 
                            className={`flex items-end gap-2 max-w-[85%] ${msg.isMe ? 'ml-auto flex-row-reverse' : ''}`}
                          >
                            {!msg.isMe && (
                              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" alt="Yui" className="w-8 h-8 rounded-full object-cover self-start mt-1 border border-white" />
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
                          className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:bg-white outline-none transition"
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
                    <div className="text-center p-8 bg-black/10 rounded-2xl mx-4">
                      <MessageCircle className="w-12 h-12 text-white/60 mx-auto mb-2" />
                      <p className="text-sm font-semibold">会話をスタートしましょう</p>
                      <p className="text-xs text-white/60 mt-1">左のリストからチャットルームを選択してトークを開始できます。</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ─── PROFILE TAB ─── */}
          {activeTab === 'profile' && (
            <div className="p-4 bg-white">
              
              <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl mb-14">
                <div className="absolute -bottom-10 left-4">
                  <img 
                    src={profile.avatar_url} 
                    alt="avatar" 
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md bg-white" 
                  />
                </div>
              </div>

              <div className="px-4 mb-8">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{profile.display_name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setEditName(profile.display_name);
                      setEditBio(profile.bio);
                      setIsEditModalOpen(true);
                    }}
                    className="border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl text-xs transition"
                  >
                    プロフィールを編集
                  </button>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mt-4 whitespace-pre-wrap">
                  {profile.bio}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-6 px-4">
                <button 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center gap-2 text-sm text-red-500 font-bold hover:bg-red-50 px-4 py-2.5 rounded-xl transition w-full"
                >
                  <LogOut className="w-5 h-5" />
                  サインアウト (ログアウト)
                </button>
              </div>

            </div>
          )}

        </main>

        {/* ========================================================= */}
        {/* RIGHT SIDEBAR: PC Trend & Recommendation                  */}
        {/* ========================================================= */}
        <aside className="hidden lg:block w-80 p-4 h-screen sticky top-0 space-y-4 overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <h3 className="font-bold text-sm mb-2 text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              アカウント連携中
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              現在、<strong>Supabase Auth</strong> を通じて安全に認証されています。アカウント作成やログインステートは正常に同期されます。
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <h3 className="font-bold text-sm mb-3 px-1">いまのトレンド</h3>
            <div className="space-y-3">
              {[
                { category: 'プロダクト · トレンド', tag: '#WangWang', posts: '22.4k posts' },
                { category: 'データベース', tag: 'SupabaseAuth', posts: '15,520 posts' },
                { category: 'テクノロジー', tag: 'NextJS14', posts: '8,120 posts' },
              ].map((trend, i) => (
                <div key={i} className="hover:bg-slate-200/30 p-1.5 rounded-lg cursor-pointer transition">
                  <p className="text-[10px] text-slate-400">{trend.category}</p>
                  <p className="text-xs font-bold text-slate-800">{trend.tag}</p>
                  <p className="text-[10px] text-slate-500">{trend.posts}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* BOTTOM NAVIGATION: Mobile Only                            */}
        {/* ========================================================= */}
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

      {/* ========================================================= */}
      {/* EDIT PROFILE MODAL                                        */}
      {/* ========================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">プロフィールの編集</h3>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">表示名</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">自己紹介 / ステータス</label>
                <textarea 
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm min-h-[80px] focus:border-indigo-500 outline-none transition resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
                >
                  キャンセル
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LOGOUT CONFIRM MODAL (自作 confirm モーダル)                */}
      {/* ========================================================= */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">ログアウトしますか？</h3>
            <p className="text-xs text-slate-500 mb-6">セッションが終了し、再度ログイン画面に戻ります。</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 border border-slate-200 text-slate-600 p-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition"
              >
                キャンセル
              </button>
              <button 
                onClick={handleLogout}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-red-100"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
