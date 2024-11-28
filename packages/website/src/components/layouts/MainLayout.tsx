import React from 'react';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: React.ReactNode;
  header: React.ReactNode;
  sidebar: React.ReactNode;
  footer: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  header,
  sidebar,
  footer,
}) => {
  return (
    <div className={styles.layoutContainer}>
      <header className={styles.header}>
        {header}
      </header>
      
      <div className={styles.contentWrapper}>
        <aside className={styles.sidebar}>
          {sidebar}
        </aside>
        
        <main className={styles.mainContent}>
          {children}
          {footer}
        </main>
      </div>
    </div>
  );
}; 