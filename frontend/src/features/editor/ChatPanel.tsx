import { useState, useRef, useEffect, useCallback } from 'react';
import type { Message, CVEdit } from '../../types';
import { parseEditsFromResponse } from '../../types';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onApplyEdit: (edit: CVEdit, editKey: string) => boolean;
  onUndoEdit: (editKey: string) => boolean;
  isLoading: boolean;
  isThinking: boolean;
  streamingContent: string;
}

export function ChatPanel({ messages, onSendMessage, onApplyEdit, onUndoEdit, isLoading, isThinking, streamingContent }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [appliedEdits, setAppliedEdits] = useState<Set<string>>(new Set());
  const [failedEdits, setFailedEdits] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 150;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleApplyEdit = (edit: CVEdit, editKey: string) => {
    setFailedEdits(prev => {
      const newSet = new Set(prev);
      newSet.delete(editKey);
      return newSet;
    });

    const success = onApplyEdit(edit, editKey);
    if (success) {
      setAppliedEdits(prev => new Set(prev).add(editKey));
    } else {
      setFailedEdits(prev => new Set(prev).add(editKey));
      setTimeout(() => {
        setFailedEdits(prev => {
          const newSet = new Set(prev);
          newSet.delete(editKey);
          return newSet;
        });
      }, 3000);
    }
  };

  const handleUndoEdit = (editKey: string) => {
    const success = onUndoEdit(editKey);
    if (success) {
      setAppliedEdits(prev => {
        const newSet = new Set(prev);
        newSet.delete(editKey);
        return newSet;
      });
    }
  };

  const renderContent = (content: string, messageIndex: number) => {
    const edits = parseEditsFromResponse(content);
    let displayContent = content.replace(/<<<EDIT>>>[\s\S]*?<<<END_EDIT>>>/g, '').trim();
    const parts = displayContent.split(/(```[\s\S]*?```)/g);

    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith('```')) {
            const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
            const language = match?.[1] || '';
            const code = match?.[2] || part.replace(/```\w*\n?/g, '').replace(/```$/, '');
            return (
              <pre key={i} className={styles.codeBlock}>
                {language && <span className={styles.codeLanguage}>{language}</span>}
                <code>{code}</code>
              </pre>
            );
          }
          return <span key={i}>{part}</span>;
        })}

        {edits.length > 0 && (
          <div className={styles.editSuggestions}>
            <div className={styles.editHeader}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Suggested Edits ({edits.length})
            </div>
            {edits.map((edit, editIndex) => {
              const editKey = `${messageIndex}-${editIndex}`;
              const isApplied = appliedEdits.has(editKey);
              const isFailed = failedEdits.has(editKey);

              return (
                <div key={editIndex} className={`${styles.editBlock} ${isApplied ? styles.applied : ''} ${isFailed ? styles.failed : ''}`}>
                  <div className={styles.editDiff}>
                    <div className={styles.editRemove}>
                      <span className={styles.diffLabel}>Find:</span>
                      <code>{edit.find}</code>
                    </div>
                    <div className={styles.editAdd}>
                      <span className={styles.diffLabel}>Replace:</span>
                      <code>{edit.replace}</code>
                    </div>
                  </div>
                  <div className={styles.editActions}>
                    {isApplied ? (
                      <>
                        <button className={styles.undoEditBtn} onClick={() => handleUndoEdit(editKey)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 13" />
                          </svg>
                          Undo
                        </button>
                        <span className={styles.appliedBadge}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Applied
                        </span>
                      </>
                    ) : isFailed ? (
                      <span className={styles.failedBadge}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        Text not found in CV
                      </span>
                    ) : (
                      <button className={styles.applyEditBtn} onClick={() => handleApplyEdit(edit, editKey)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Apply to CV
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.messagesContainer}>
        {messages.length === 0 && !streamingContent && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p>Paste a job description above and click "Analyze" to start the conversation.</p>
            <p className={styles.hint}>Ask the AI to edit your CV directly, e.g., "Add my Python experience to the skills section"</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`${styles.message} ${msg.role === 'user' ? styles.user : styles.assistant}`}>
            <div className={styles.messageAvatar}>
              {msg.role === 'user' ? 'You' : 'AI'}
            </div>
            <div className={styles.messageBubble}>
              <div className={styles.messageContent}>{renderContent(msg.content, index)}</div>
            </div>
          </div>
        ))}
        {isThinking && !streamingContent && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={styles.messageAvatar}>AI</div>
            <div className={styles.messageBubble}>
              <div className={styles.thinkingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        {streamingContent && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={styles.messageAvatar}>AI</div>
            <div className={styles.messageBubble}>
              <div className={styles.messageContent}>{renderContent(streamingContent, -1)}</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the AI to edit your CV... e.g., 'Add Python to my skills'"
          disabled={isLoading}
          rows={1}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
