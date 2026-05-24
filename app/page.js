'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Grid, MessageSquare, User, Heart, MessageCircle, 
  Send, Image, Plus, Smile, ChevronLeft, Phone, Video, Menu, MoreHorizontal
} from 'lucide-react';
import { supabase } from './supabaseClient';

export default function WangWangApp() {
  const [activeTab, setActiveTab] = useState('timeline');
  const [mobileChatActive, setMobileChatActive] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(1);
  const [chatInputText, setChatInputText] = useState('');
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState(null);

  // データベースから取得する投稿とメッセージのステート
  const [posts, setPosts] = useState([]);
  const [messages, setMessages] = useState([]);

  const chatEndRef = useRef(null);

  // ログイン中を想定する固定の自分アカウント情報
  const currentUser = {
    username: "takumi_wang",
    displayName: "タクミ",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
  };

  // 友だち（トークルーム）の基本情報
  const friends = [
    { id: 1, name: 'ユイ', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', status: 'オンライン' },
    { id: 2, name: 'ケン', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', status: '離席中' }
  ];

  // ストーリーズデータ
  const stories = [
    { id: 'me', name: 'マイストーリー', avatar: currentUser.avatar, hasStory: false },
    { id: 1, name: 'ユイ', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', hasStory: true },
    { id: 2, name: 'ケン', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', hasStory: true },
  ];

  // ---------------------------------------------------------
  // Supabase 連携ロジック (Read / Create / Realtime)
  // ---------------------------------------------------------

  // 1. タイムライン投稿の取得
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setPosts(data);
  };

  // 2. メッセージデータの取得
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data);
  };

  useEffect(() => {
    fetchPosts();
    fetchMessages();

    // 🌟 リアルタイム通信の監視開始 (タイムライン & チャット)
    const postsChannel = supabase
      .channel('public-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('public-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  // スクロール追従
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedChatId]);

  // 新規タイムライン投稿送信
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim() && !newPostImage) return;

    const { error } = await supabase.from('posts').insert([
      {
        author: currentUser.displayName,
        username: currentUser.username,
        avatar: currentUser.avatar,
        content: newPostText,
        image: newPostImage,
        likes: 0,
        comments: 0
      }
    ]);

    if (!error) {
      setNewPostText('');
      setNewPostImage(null);
      fetchPosts();
    }
  };

  // 「いいね！」機能 (データベース加算)
  const handleLike = async (postId, currentLikes) => {
    const { error } = await supabase
      .from('posts')
      .update({ likes: currentLikes + 1 })
      .eq('id', postId);
    if (!error) fetchPosts();
  };

  // ダミー写真添付シミュレーション
  const handleSelectPostImage = () => {
    const dummyImages = [
      "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600",
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600",
    ];
    const randomImg = dummyImages[Math.floor(Math.random() * dummyImages.length)];
    setNewPostImage(randomImg);
  };

  // チャットメッセージ送信
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;

    const { error } = await supabase.from('messages').insert([
      {
        chat_id: selectedChatId,
        sender: "me",
        text: chatInputText,
        is_read: false
      }
    ]);

    if (!error) {
      setChatInputText('');
      fetchMessages();

      // 1.5秒後に相手から「既読」と「自動返信」が届くリアルタイム演出
      setTimeout(async () => {
        // 既読にする
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('chat_id', selectedChatId)
          .eq('sender', 'me');

        // 返信を送る
        await supabase.from('messages').insert([
          {
            chat_id: selectedChatId,
            sender: "them",
            text: "WangWangでメッセージ届いたよ！リアルタイム通信大成功だワン！🐾",
            is_read: false
          }
        ]);
        fetchMessages();
      }, 1500);
    }
  };

  // 特定の友達とのメッセージ履歴
  const activeMessages = messages.filter(m => m.chat_id === selectedChatId);

  // トーク一覧の「最新メッセージ」を取得する関数
  const getLastMessageText = (chatId) => {
    const chatMsgs = messages.filter(m => m.chat_id === chatId);
    if (chatMsgs.length === 0) return "まだメッセージはありません";
    return chatMsgs[chatMsgs.length - 1].text;
  };

  const getActiveFriend = () => {
    return friends.find(f => f.id === selectedChatId) || friends[0];
  };

  return (
    <div className="flex justify-center min-h-screen bg-slate-100 text-slate-800 font-sans">
      <div className="w-full max-w-6xl flex bg-white min-h-screen relative shadow-2xl overflow-hidden">
        
        {/* ========================================================= */}
        {/* PC & TABLET SIDEBAR NAV                                   */}
        {/* ========================================================= */}
        <aside className="hidden sm:flex flex-col justify-between items-center xl:items-start p-4 lg:p-6 border-r border-slate-200 w-20 xl:w-64 h-screen sticky top-0 bg-white z-20">
          <div className="w-full space-y-8">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
                <span className="text-xl">🐾</span>
              </div>
              <span className="hidden xl:inline font-bold text-2xl tracking-wider bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">WangWang</span>
            </div>

            <nav className="space-y-2 w-full">
              <button 
                onClick={() => { setActiveTab('timeline'); setMobileChatActive(false); }}
                className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 group ${activeTab === 'timeline' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'hover:bg-slate-50 text-slate-500'}`}
              >
                <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden xl:inline text-sm">タイムライン (TL)</span>
              </button>
              
              <button 
                onClick={() => { setActiveTab('grid'); setMobileChatActive(false); }}
                className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 group ${activeTab === 'grid' ? 'bg-purple-50 text-purple-600 font-bold' : 'hover:bg-slate-50 text-slate-500'}`}
              >
                <Grid className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden xl:inline text-sm">グリッド (Instagram風)</span>
              </button>

              <button 
                onClick={() => { setActiveTab('dm'); setMobileChatActive(false); }}
                className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 group relative ${activeTab === 'dm' ? 'bg-green-50 text-green-700 font-bold' : 'hover:bg-slate-50 text-slate-500'}`}
              >
                <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden xl:inline text-sm">トーク・DM (LINE風)</span>
              </button>

              <button 
                onClick={() => { setActiveTab('profile'); setMobileChatActive(false); }}
                className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 group ${activeTab === 'profile' ? 'bg-slate-100 text-slate-800 font-bold' : 'hover:bg-slate-50 text-slate-500'}`}
              >
                <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden xl:inline text-sm">マイプロフィール</span>
              </button>
            </nav>
          </div>

          <div className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 cursor-pointer border border-slate-100">
            <img src={currentUser.avatar} alt="My Profile" className="w-10 h-10 rounded-full object-cover border-2 border-slate-100" />
            <div className="hidden xl:block text-left">
              <p className="font-semibold text-xs text-slate-800">{currentUser.displayName}</p>
              <p className="text-[10px] text-slate-400">@{currentUser.username}</p>
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* MAIN CONTENTS CONTAINER                                    */}
        {/* ========================================================= */}
        <main className="flex-1 min-h-screen flex flex-col pb-16 sm:pb-0 bg-slate-50 max-w-full">
          
          {/* モバイル用トップヘッダー */}
          <header className="sm:hidden flex justify-between items-center px-4 h-14 border-b border-slate-200 sticky top-0 bg-white/90 backdrop-blur-md z-30">
            <span className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">WangWang</span>
            <div className="flex items-center gap-4">
              <button onClick={() => { setActiveTab('dm'); setMobileChatActive(false); }} className="relative p-1.5 text-slate-600">
                <MessageSquare className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </header>

          {/* ========================================== */}
          {/* TAB 1: TIMELINE                             */}
          {/* ========================================== */}
          {activeTab === 'timeline' && (
            <div className="flex-1 flex flex-col">
              {/* ストーリーズ */}
              <div className="bg-white p-4 border-b border-slate-200 overflow-x-auto flex gap-4 scrollbar-none">
                {stories.map(s => (
                  <div key={s.id} className="flex flex-col items-center shrink-0 cursor-pointer">
                    <div className={`p-[2.5px] rounded-full ${s.hasStory ? 'bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600' : 'bg-slate-200'}`}>
                      <img src={s.avatar} alt={s.name} className="w-14 h-14 rounded-full object-cover border-2 border-white" />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 max-w-[65px] truncate">{s.name}</span>
                  </div>
                ))}
              </div>

              {/* 投稿フォーム */}
              <div className="bg-white p-4 border-b border-slate-200">
                <form onSubmit={handleCreatePost}>
                  <div className="flex gap-3">
                    <img src={currentUser.avatar} className="w-10 h-10 rounded-full object-cover" alt="Avatar" />
                    <div className="flex-1">
                      <textarea 
                        value={newPostText}
                        onChange={(e) => setNewPostText(e.target.value)}
                        placeholder="今なにしてる？ワンちゃんのことでも何でもつぶやいてね🐾" 
                        rows={3}
                        className="w-full p-2 border-none resize-none text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 text-sm"
                      />
                      
                      {newPostImage && (
                        <div className="relative mt-2 rounded-xl overflow-hidden max-h-48 border border-slate-100 bg-slate-50">
                          <img src={newPostImage} className="w-full h-full object-cover" alt="Preview" />
                          <button 
                            type="button" 
                            onClick={() => setNewPostImage(null)}
                            className="absolute top-2 right-2 bg-black/60 text-white w-7 h-7 rounded-full flex items-center justify-center hover:bg-black"
                          >
                            ×
                          </button>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={handleSelectPostImage}
                            className="text-indigo-500 hover:bg-indigo-50 p-2.5 rounded-full transition-all"
                            title="画像を添付"
                          >
                            <Image className="w-5 h-5" />
                          </button>
                        </div>
                        <button 
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded-full text-xs font-semibold shadow-md shadow-indigo-100 transition-all"
                        >
                          投稿する
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* タイムライン表示 */}
              <div className="flex-1 p-3 sm:p-4 space-y-4 max-w-2xl mx-auto w-full">
                {posts.map(post => (
                  <article key={post.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={post.avatar} alt={post.author} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">{post.author}</h4>
                          <p className="text-xs text-slate-400">@{post.username}</p>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="px-4 pb-3">
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{post.content}</p>
                    </div>

                    {post.image && (
                      <div className="border-y border-slate-100 bg-slate-50 flex justify-center overflow-hidden max-h-[420px]">
                        <img src={post.image} alt="Posted visual" className="w-full object-cover hover:scale-[1.02] transition-transform duration-500" />
                      </div>
                    )}

                    <div className="px-4 py-3 border-t border-slate-50 flex justify-between text-slate-500 text-sm">
                      <button 
                        onClick={() => handleLike(post.id, post.likes)}
                        className="flex items-center gap-2 hover:text-rose-500 group transition-all"
                      >
                        <div className="p-2 rounded-full group-hover:bg-rose-50 transition-all">
                          <Heart className="w-4 h-4" />
                        </div>
                        <span className="text-xs">{post.likes}</span>
                      </button>

                      <button className="flex items-center gap-2 group hover:text-indigo-500 transition-all">
                        <div className="p-2 group-hover:bg-indigo-50 rounded-full transition-all">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        <span className="text-xs">{post.comments}</span>
                      </button>

                      <button 
                        onClick={() => {
                          setActiveTab('dm');
                          setMobileChatActive(true);
                        }}
                        className="flex items-center gap-2 group hover:text-green-600 transition-all"
                      >
                        <div className="p-2 group-hover:bg-green-50 rounded-full transition-all">
                          <Send className="w-4 h-4" />
                        </div>
                        <span className="hidden sm:inline text-xs">DMで送る</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: GRID EXPLORER                        */}
          {/* ========================================== */}
          {activeTab === 'grid' && (
            <div className="flex-1 p-4 sm:p-6">
              <div className="max-w-4xl mx-auto w-full">
                <div className="mb-6 flex justify-between items-center border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">メディアグリッド</h2>
                    <p className="text-xs text-slate-500">写真からWangWangのコミュニティを探索します</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 sm:gap-4">
                  {posts.filter(p => p.image).map(post => (
                    <div 
                      key={post.id} 
                      className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer bg-slate-200 shadow-sm"
                      onClick={() => {
                        setActiveTab('timeline');
                      }}
                    >
                      <img src={post.image} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" alt="Grid media" />
                      
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-6 text-white transition-opacity duration-200">
                        <div className="flex items-center gap-2">
                          <Heart className="w-5 h-5 fill-current" />
                          <span className="font-bold">{post.likes}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 3: DM / CHAT (LINE STYLE)              */}
          {/* ========================================== */}
          {activeTab === 'dm' && (
            <div className="flex-1 flex h-[calc(100vh-3.5rem)] sm:h-screen">
              
              {/* トーク一覧 */}
              <div className={`${mobileChatActive ? 'hidden' : 'block'} sm:block w-full sm:w-80 md:w-96 border-r border-slate-200 bg-white flex flex-col`}>
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-bold text-lg text-slate-800">トーク</h3>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {friends.map(friend => (
                    <div 
                      key={friend.id}
                      onClick={() => {
                        setSelectedChatId(friend.id);
                        setMobileChatActive(true);
                      }}
                      className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${selectedChatId === friend.id ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                          {friend.status === 'オンライン' && (
                            <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-800">{friend.name}</h4>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{getLastMessageText(friend.id)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* チャット画面 (LINE風) */}
              <div className={`${mobileChatActive ? 'block' : 'hidden'} sm:block flex-1 flex flex-col bg-[#abc3ed]`}>
                
                {/* ヘッダー */}
                <div className="bg-white px-4 h-14 border-b border-slate-200 flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setMobileChatActive(false)}
                      className="sm:hidden text-slate-500 hover:text-slate-800 p-1"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <img src={getActiveFriend().avatar} alt={getActiveFriend().name} className="w-9 h-9 rounded-full object-cover" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">{getActiveFriend().name}</h3>
                      <span className="text-[10px] text-slate-400">{getActiveFriend().status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500">
                    <Phone className="w-5 h-5 cursor-pointer hover:text-slate-800" />
                    <Video className="w-5 h-5 cursor-pointer hover:text-slate-800" />
                    <Menu className="w-5 h-5 cursor-pointer hover:text-slate-800" />
                  </div>
                </div>

                {/* メッセージ表示部 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="text-center">
                    <span className="text-[10px] bg-black/10 text-white px-3 py-1 rounded-full">データベースとリアルタイム同期しています</span>
                  </div>

                  {activeMessages.map((msg) => {
                    const isMe = msg.sender === 'me';
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {!isMe && (
                          <img src={getActiveFriend().avatar} className="w-8 h-8 rounded-full object-cover self-start mt-1" alt="Avatar" />
                        )}

                        <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className={`p-3 max-w-sm rounded-2xl text-sm shadow-sm leading-relaxed ${
                            isMe 
                              ? 'bg-[#85e249] text-slate-900 rounded-tr-none' 
                              : 'bg-white text-slate-800 rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>

                          <div className="text-[9px] text-slate-500 leading-none flex flex-col gap-0.5 items-end">
                            {isMe && msg.is_read && (
                              <span className="text-green-600 font-bold">既読</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* チャット入力 */}
                <form onSubmit={handleSendMessage} className="bg-white p-3 border-t border-slate-200 flex items-center gap-3">
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Plus className="w-5 h-5" />
                  </button>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Smile className="w-5 h-5" />
                  </button>
                  <input 
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    placeholder="メッセージを入力"
                    className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400/20 focus:bg-white focus:outline-none transition-all"
                  />
                  <button 
                    type="submit" 
                    className="bg-green-500 hover:bg-green-600 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md shadow-green-100"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 4: PROFILE                             */}
          {/* ========================================== */}
          {activeTab === 'profile' && (
            <div className="flex-1 p-4 sm:p-8 max-w-2xl mx-auto w-full">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <div className="px-6 pb-6 relative">
                  <div className="absolute -top-12 left-6">
                    <img src={currentUser.avatar} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" alt="Me" />
                  </div>

                  <div className="pt-16">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">{currentUser.displayName}</h2>
                        <p className="text-sm text-slate-400">@{currentUser.username}</p>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                      ハイブリッドSNS「WangWang」開発中🐾！Twitter、LINE、Instagramのメリットを統合した、日常共有に最適な最高にハッピーな空間を作っています。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* ========================================== */}
        {/* BOTTOM NAVIGATION: Mobile Only            */}
        {/* ========================================== */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around items-center px-4 z-40">
          <button 
            onClick={() => { setActiveTab('timeline'); setMobileChatActive(false); }} 
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${activeTab === 'timeline' ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[9px] mt-0.5">タイムライン</span>
          </button>

          <button 
            onClick={() => { setActiveTab('grid'); setMobileChatActive(false); }} 
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${activeTab === 'grid' ? 'text-purple-600' : 'text-slate-400'}`}
          >
            <Grid className="w-5 h-5" />
            <span className="text-[9px] mt-0.5">グリッド</span>
          </button>

          <button 
            onClick={() => { setActiveTab('dm'); setMobileChatActive(false); }} 
            className={`flex flex-col items-center justify-center p-2 rounded-xl relative transition ${activeTab === 'dm' ? 'text-green-600' : 'text-slate-400'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] mt-0.5">トーク</span>
          </button>

          <button 
            onClick={() => { setActiveTab('profile'); setMobileChatActive(false); }} 
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${activeTab === 'profile' ? 'text-slate-800' : 'text-slate-400'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[9px] mt-0.5">マイページ</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
