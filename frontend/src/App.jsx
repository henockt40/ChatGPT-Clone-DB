import { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import ChatHeader from './components/ChatHeader/ChatHeader';
import MessageList from './components/MessageList/MessageList';
import ChatInput from './components/ChatInput/ChatInput';
import { createThread, deleteThread, getApiError, getThreadMessages, getThreads,
  postThreadMessage, renameThread } from './api/chatApi';
import './App.css';
import ImagesView from './views/ImagesView/ImagesView';
import AppsView from './views/AppsView/AppsView';
import ResearchView from './views/ResearchView/ResearchView';
import AuthScreen from './components/Auth/AuthScreen';
import { getAuthToken, getCurrentUser, setAuthToken } from './api/authApi';

function ChatWorkspace({ user, onLogout }) {
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeFeature,setActiveFeature]=useState('Chat');
  const [pendingDraft,setPendingDraft]=useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('chat-theme') || 'dark');
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const requestIdRef = useRef(0);
  const activeIdRef = useRef(null);
  const sendInProgress = useRef(false);
  const setCurrentThread = id => { activeIdRef.current = id; setActiveThreadId(id); };

  const refreshThreads = useCallback(async () => {
    try { setThreads(await getThreads()); } catch (e) { setError(getApiError(e)); }
  }, []);

  const selectThread = useCallback(async id => {
    const requestId = ++requestIdRef.current;
    setCurrentThread(id);
    setActiveFeature('Chat');
    setSidebarOpen(false);
    setError('');
    setInfo('');
    setIsFetching(true);
    try {
      const items = await getThreadMessages(id);
      if (requestId === requestIdRef.current) setMessages(items);
    } catch (e) {
      if (requestId === requestIdRef.current) setError(getApiError(e));
    } finally {
      if (requestId === requestIdRef.current) setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    getThreads().then(items => {
      if (!alive) return;
      setThreads(items);
      setIsFetching(false);
    }).catch(error => {
      if (!alive) return;
      setError(getApiError(error));
      setIsFetching(false);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem('chat-theme', theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => { if(activeFeature==='Chat') messagesEndRef.current?.scrollIntoView({ block: 'end' }); }, [messages, isLoading,activeFeature]);
  useEffect(()=>{ if(activeFeature==='Chat' && pendingDraft && inputRef.current?.setValue){inputRef.current.setValue(pendingDraft);setPendingDraft('');}},[activeFeature,pendingDraft]);
  const openFeature=feature=>{setActiveFeature(feature);setSidebarOpen(false);setError('');setInfo('');};
  const continueInChat=({title,messages})=>{
    newChat();
    const content=String(messages?.find(item=>item.role==='assistant')?.content || '').slice(0,6500);
    setPendingDraft(`I want to discuss ${title}.\n\n${content}\n\nPlease help me with the next steps.`);
    setActiveFeature('Chat');
  };

  const newChat = () => {
    setActiveFeature('Chat');
    ++requestIdRef.current;
    setCurrentThread(null);
    setMessages([]);
    setError('');
    setInfo('');
    setIsFetching(false);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const sendMessage = async raw => {
    const question = raw.trim();
    if (!question || sendInProgress.current || question.length > 65535) return false;
    sendInProgress.current = true;
    setIsLoading(true);
    setError('');
    setInfo('');
    let id = activeIdRef.current;
    try {
      if (!id) {
        const chat = await createThread();
        id = chat.id;
        setCurrentThread(id);
        setMessages([]);
        setThreads(prev => [chat, ...prev]);
      }
      const tempId = `temporary-${Date.now()}`;
      if (id === activeIdRef.current) setMessages(prev => [...prev, { id: tempId, role: 'user', content: question }]);
      const response = await postThreadMessage(id, question);
      if (id === activeIdRef.current) {
        setMessages(prev => [...prev.filter(item => item.id !== tempId), response.userConversation, response.assistantConversation]);
      }
      await refreshThreads();
      return true;
    } catch (e) {
      // The server can store the question before Gemini fails. Reload actual DB state.
      if (id && id === activeIdRef.current) {
        try { setMessages(await getThreadMessages(id)); } catch { setMessages(prev => prev.filter(item => !String(item.id).startsWith('temporary-'))); }
      }
      setError(`${getApiError(e)}${id ? ' Your question may already be saved; check this chat before resending.' : ''}`);
      await refreshThreads();
      return false;
    } finally {
      sendInProgress.current = false;
      setIsLoading(false);
    }
  };

  const handleDeleteThread = async thread => {
    if (!window.confirm(`Delete “${thread.title}” and all its messages? This cannot be undone.`)) return;
    try {
      await deleteThread(thread.id);
      if (thread.id === activeIdRef.current) newChat();
      await refreshThreads();
    } catch (e) { setError(getApiError(e)); }
  };
  const handleRenameThread = async thread => {
    const title = window.prompt('Rename chat', thread.title)?.trim();
    if (!title || title === thread.title) return;
    if (title.length > 160) { setError('Chat titles must be 160 characters or fewer.'); return; }
    try { await renameThread(thread.id, title); await refreshThreads(); }
    catch (e) { setError(getApiError(e)); }
  };

  return (
    <div className='app'>
      {sidebarOpen && <button className='sidebarScrim' aria-label='Close sidebar' onClick={() => setSidebarOpen(false)}/>}
      <Sidebar user={user} threads={threads} activeThreadId={activeThreadId} open={sidebarOpen}
        collapsed={sidebarCollapsed} onCollapse={() => setSidebarCollapsed(v => !v)}
        onCloseMobile={() => setSidebarOpen(false)} onNewChat={newChat}
        onSelectThread={selectThread} onRenameThread={handleRenameThread}
        onDeleteThread={handleDeleteThread} onReload={refreshThreads}
        onFeature={feature => { if (['Images','Apps','Deep research'].includes(feature)) openFeature(feature); else {setActiveFeature('Chat');setInfo(`${feature} is not yet connected to an API.`);setSidebarOpen(false);} }} activeFeature={activeFeature}/>
      <main className='chat'>
        <ChatHeader user={user} onLogout={onLogout} theme={theme} onToggleTheme={() => setTheme(v => v === 'dark' ? 'light' : 'dark')}
          collapsed={sidebarCollapsed} onOpenSidebar={() => setSidebarOpen(true)}
          onExpandSidebar={() => setSidebarCollapsed(false)}/>
        {(error || info) && <div className={`notice ${error ? 'noticeError' : ''}`} role={error ? 'alert' : 'status'}>
          <span>{error || info}</span><button aria-label='Dismiss notice' onClick={() => {setError('');setInfo('');}}>×</button>
        </div>}
        {activeFeature === 'Chat' ? <>
          <MessageList conversations={messages} isFetching={isFetching} isLoading={isLoading}
            messagesEndRef={messagesEndRef} onSuggestion={question => inputRef.current?.setValue(question)} />
          <ChatInput handleSendMessage={sendMessage} isLoading={isLoading} inputRef={inputRef}
            onFeature={message => setInfo(message)} />
          <p className='disclaimer'>ChatGPT Clone can make mistakes. Check important information.</p>
        </> : <div className='featureContent'>
          {activeFeature === 'Images' && <ImagesView />}
          {activeFeature === 'Apps' && <AppsView onContinueInChat={continueInChat} />}
          {activeFeature === 'Deep research' && <ResearchView onContinueInChat={continueInChat} />}
        </div>}
      </main>
    </div>
  );
}


export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getAuthToken()));

  useEffect(() => {
    if (!getAuthToken()) return;
    let alive = true;
    getCurrentUser()
      .then(currentUser => { if (alive) setUser(currentUser); })
      .catch(() => { if (alive) setAuthToken(null); })
      .finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, []);

  const onAuthenticated = ({ user: currentUser, accessToken }) => {
    setAuthToken(accessToken);
    setUser(currentUser);
  };
  const logout = () => { setAuthToken(null); setUser(null); };

  if (checking) return <main className='authLoading' role='status'>Checking your account…</main>;
  if (!user) return <AuthScreen onAuthenticated={onAuthenticated} />;
  return <ChatWorkspace key={user.id} user={user} onLogout={logout} />;
}
