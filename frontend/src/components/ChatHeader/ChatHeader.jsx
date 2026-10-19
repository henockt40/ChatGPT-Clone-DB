import { Menu, PanelLeftOpen, Moon, Sun, ChevronDown, LogOut } from 'lucide-react';
import { useState } from 'react';
import styles from './ChatHeader.module.css';
export default function ChatHeader({onOpenSidebar,onExpandSidebar,collapsed,theme,onToggleTheme,user,onLogout}) {
  const [showModel,setShowModel]=useState(false);
  return <header className={styles.header}>
    <div className={styles.left}>
      <button className={styles.mobile} aria-label='Open sidebar' onClick={onOpenSidebar}><Menu size={21}/></button>
      {collapsed && <button className={styles.expand} aria-label='Expand sidebar' onClick={onExpandSidebar}><PanelLeftOpen size={20}/></button>}
      <div className={styles.selectorWrap}>
        <button className={styles.model} aria-expanded={showModel} onClick={()=>setShowModel(v=>!v)}>ChatGPT <span className={styles.clone}>Clone</span><ChevronDown size={17}/></button>
        {showModel && <div className={styles.modelPopup}>Programming assistant powered by the AI provider selected in <code>backend/.env</code>.</div>}
      </div>
    </div>
    <div className={styles.right}>
      <button className={styles.theme} aria-label={theme==='dark'?'Switch to light mode':'Switch to dark mode'} title='Toggle theme' onClick={onToggleTheme}>{theme==='dark'?<Sun size={21}/>:<Moon size={21}/>}</button>
      <span className={styles.avatar} title={user?.email} aria-label={user?.name || 'Profile'}>{(user?.name || 'IT').slice(0, 2).toUpperCase()}</span>
      <button className={styles.theme} title='Sign out' aria-label='Sign out' onClick={onLogout}><LogOut size={19}/></button>
    </div>
  </header>;
}
