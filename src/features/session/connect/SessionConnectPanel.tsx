import { ArrowRight, Database, LockKeyhole, Server, UserRound, X } from 'lucide-react';
import { useState } from 'react';

import { listRemoteDatabases } from '@/features/datasources/api';
import type { MySQLConn } from '@/features/datasources/types';
import { createSession } from '@/features/session/api';
import type { Session } from '@/features/session/types';

import styles from './SessionConnectPanel.module.css';

type SessionConnectPanelProps = {
  onClose: () => void;
  onSessionCreated: (session: Session) => void;
};

export function SessionConnectPanel({ onClose, onSessionCreated }: SessionConnectPanelProps) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState(3306);
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [databases, setDatabases] = useState<string[] | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connection: MySQLConn = { host, port, user, password };
  const isConnectionReady = Boolean(host && user);

  const handleConnect = async () => {
    if (!isConnectionReady) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await listRemoteDatabases(connection);
      setDatabases(result.databases);
      setSelectedDatabase(result.databases[0] ?? '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '데이터베이스에 연결하지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedDatabase) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await createSession({ ...connection, database: selectedDatabase });
      onSessionCreated(result.session);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '세션을 생성하지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="session-connect-title">
      <header className={styles.header}>
        <div className={styles.path}>
          <Server aria-hidden />
          <span id="session-connect-title">New session</span>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="세션 생성 닫기">
          <X aria-hidden />
        </button>
      </header>

      <div className={styles.surface}>
        {databases === null ? (
          <div className={styles.fields}>
            <label className={styles.field}>
              <span>Host</span>
              <div className={styles.inputWrap}>
                <Server aria-hidden />
                <input value={host} placeholder="ex. 1.2.3.4" onChange={(event) => setHost(event.target.value)} />
              </div>
            </label>
            <label className={styles.field}>
              <span>Port</span>
              <div className={styles.inputWrap}>
                <Database aria-hidden />
                <input type="number" min="1" max="65535" value={port} onChange={(event) => setPort(Number(event.target.value))} />
              </div>
            </label>
            <label className={styles.field}>
              <span>User</span>
              <div className={styles.inputWrap}>
                <UserRound aria-hidden />
                <input value={user} autoComplete="username" onChange={(event) => setUser(event.target.value)} />
              </div>
            </label>
            <label className={styles.field}>
              <span>Password</span>
              <div className={styles.inputWrap}>
                <LockKeyhole aria-hidden />
                <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
            </label>
          </div>
        ) : (
          <label className={styles.field}>
            <span>Database</span>
            <div className={styles.inputWrap}>
              <Database aria-hidden />
              <select value={selectedDatabase} onChange={(event) => setSelectedDatabase(event.target.value)}>
                {databases.map((database) => <option key={database} value={database}>{database}</option>)}
              </select>
            </div>
          </label>
        )}

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        <button
          type="button"
          className={styles.submitButton}
          disabled={isLoading || (databases === null ? !isConnectionReady : !selectedDatabase)}
          onClick={() => void (databases === null ? handleConnect() : handleCreate())}
        >
          <span>{isLoading ? '처리 중...' : databases === null ? 'Connect' : 'Create session'}</span>
          <ArrowRight aria-hidden />
        </button>
      </div>
    </section>
  );
}
