import { useMemo, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, SquarePen, Search, Image, Grid2X2,
  FlaskConical, CodeXml, FolderKanban, MessageSquare, MoreHorizontal, Pencil,
  Trash2, RefreshCw, X, ChevronDown, CircleUserRound } from 'lucide-react';
import styles from './Sidebar.module.css';

const extras = [
  { label:'Images', Icon: Image }, { label:'Apps', Icon: Grid2X2 },
  { label:'Deep research', Icon: FlaskConical }, { label:'Codex', Icon: CodeXml },
  { label:'Projects', Icon: FolderKanban },
];
export default function Sidebar({user,threads,activeThreadId,open,collapsed,onCollapse,onCloseMobile,
  onNewChat,onSelectThread,onRenameThread,onDeleteThread,onReload,onFeature,activeFeature}) {
  const [searchOpen,setSearchOpen] = useState(false);
  const [search,setSearch] = useState('');
  const [menuId,setMenuId] = useState(null);
  const filtered = useMemo(() => threads.filter(t => t.title.toLowerCase().includes(search.toLowerCase())),[threads,search]);
  return <aside className={`${styles.sidebar} ${open?styles.open:''} ${collapsed?styles.collapsed:''}`} aria-label='Sidebar'>
    <div className={styles.topBar}>
      <button className={styles.square} onClick={onCollapse} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} title={collapsed?'Expand sidebar':'Collapse sidebar'}>
        {collapsed?<PanelLeftOpen size={20}/>:<PanelLeftClose size={20}/>}</button>
      {!collapsed && <button className={styles.square} onClick={onNewChat} aria-label='New chat' title='New chat'><SquarePen size={20}/></button>}
      <button className={`${styles.square} ${styles.closeMobile}`} onClick={onCloseMobile} aria-label='Close sidebar'><X size={18}/></button>
    </div>
    <nav className={styles.navigation}>
      <button className={styles.navItem} onClick={onNewChat} title='New chat'><SquarePen size={19}/><span>New chat</span></button>
      <button className={styles.navItem} onClick={() => {setSearchOpen(v=>!v); if(collapsed) onCollapse();}} title='Search chats' aria-expanded={searchOpen}>
        <Search size={19}/><span>Search chats</span></button>
      {searchOpen && !collapsed && <div className={styles.search}><Search size={15}/><input autoFocus aria-label='Filter chats' placeholder='Search your chats' value={search} onChange={e=>setSearch(e.target.value)}/><button onClick={()=>setSearch('')} aria-label='Clear search'><X size={15}/></button></div>}
      {extras.map(item => <button key={item.label} className={`${styles.navItem} ${activeFeature === item.label ? styles.active : ''}`} title={item.label} onClick={()=>onFeature(item.label)}><item.Icon size={19}/><span>{item.label}</span></button>)}
    </nav>
    <section className={styles.history} aria-label='Recent chats'>
      <div className={styles.historyHeading}><span>Chats</span><button aria-label='Refresh chats' title='Refresh chats' onClick={onReload}><RefreshCw size={15}/></button></div>
      {filtered.length === 0 && !collapsed && <p className={styles.empty}>{search?'No matching chats':'Your chats will appear here'}</p>}
      {filtered.map(thread => <div key={thread.id} className={`${styles.threadRow} ${thread.id===activeThreadId?styles.active:''}`}>
        <button className={styles.threadTitle} onClick={()=>onSelectThread(thread.id)} title={thread.title}>
          <MessageSquare size={15}/><span>{thread.title}</span>
        </button>
        <button className={styles.more} aria-label={`Options for ${thread.title}`} onClick={()=>setMenuId(v=>v===thread.id?null:thread.id)} title='Chat options'><MoreHorizontal size={17}/></button>
        {menuId===thread.id && <div className={styles.menu}>
          <button onClick={()=>{setMenuId(null);onRenameThread(thread);}}><Pencil size={14}/> Rename</button>
          <button className={styles.delete} onClick={()=>{setMenuId(null);onDeleteThread(thread);}}><Trash2 size={14}/> Delete</button>
        </div>}
      </div>)}
    </section>
    <div className={styles.profile}>
      <span className={styles.avatar}>{(user?.name || 'IT').slice(0, 2).toUpperCase()}</span><div className={styles.profileName}><strong>{user?.name || 'Developer Workspace'}</strong><small>{user?.email || 'ChatGPT Clone'}</small></div><ChevronDown size={16}/>
    </div>
  </aside>;
}
