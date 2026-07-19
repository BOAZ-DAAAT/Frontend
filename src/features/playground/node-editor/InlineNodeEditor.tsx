import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import styles from './InlineNodeEditor.module.css';

type InlineNodeEditorProps = {
  value: string;
  className?: string;
  label: string;
  multiline?: boolean;
};

export function InlineNodeEditor({
  value,
  className = '',
  label,
  multiline = false,
}: InlineNodeEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    if (!isEditing && previousValueRef.current !== value) {
      setDraft(value);
      previousValueRef.current = value;
    }
  }, [isEditing, value]);

  const finishEditing = () => {
    setDraft((current) => current.trim() || value);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
      return;
    }

    if (!multiline && event.key === 'Enter') {
      event.preventDefault();
      finishEditing();
    }
  };

  if (!isEditing) {
    return (
      <span
        className={`${styles.value} ${className}`}
        onDoubleClick={(event) => {
          event.stopPropagation();
          setIsEditing(true);
        }}
      >
        {draft}
      </span>
    );
  }

  if (multiline) {
    return (
      <textarea
        autoFocus
        aria-label={label}
        className={`${styles.editor} ${styles.textarea} ${className} nodrag nowheel`}
        rows={3}
        value={draft}
        onBlur={finishEditing}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => event.stopPropagation()}
      />
    );
  }

  return (
    <input
      autoFocus
      aria-label={label}
      className={`${styles.editor} ${className} nodrag`}
      value={draft}
      onBlur={finishEditing}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
    />
  );
}
