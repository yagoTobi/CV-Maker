import { useState, useRef, useEffect, useCallback } from 'react';
import type { Message, CVEdit } from '../types';
import { parseEditsFromResponse } from '../types';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onApplyEdit: (edit: CVEdit) => boolean;
  isLoading: boolean;
  isThinking: boolean;
  streamingContent: string;
}

export function ChatPanel({ messages, onSendMessage, onApplyEdit, isLoading, isThinking, streamingContent }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [appliedEdits, setAppliedEdits] = useState<Set<string>>(new Set());
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
    const success = onApplyEdit(edit);
    if (success) {
      setAppliedEdits(prev => new Set(prev).add(editKey));
    }
  };

  const renderContent = (content: string, messageIndex: number) => {
    // Check for edits in the content
    const edits = parseEditsFromResponse(content);

    // Remove edit blocks from displayed content
    let displayContent = content.replace(/<<<EDIT>>>[\s\S]*?<<<END_EDIT>>>/g, '').trim();

    // Split by code blocks
    const parts = displayContent.split(/(```[\s\S]*?```)/g);

    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith('```')) {
            const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
            const language = match?.[1] || '';
            const code = match?.[2] || part.replace(/```\w*\n?/g, '').replace(/```$/, '');
            return (
              <pre key={i} className="code-block">
                {language && <span className="code-language">{language}</span>}
                <code>{code}</code>
              </pre>
            );
          }
          return <span key={i}>{part}</span>;
        })}

        {edits.length > 0 && (
          <div className="edit-suggestions">
            <div className="edit-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Suggested Edits ({edits.length})
            </div>
            {edits.map((edit, editIndex) => {
              const editKey = `${messageIndex}-${editIndex}`;
              const isApplied = appliedEdits.has(editKey);

              return (
                <div key={editIndex} className={`edit-block ${isApplied ? 'applied' : ''}`}>
                  <div className="edit-diff">
                    <div className="edit-remove">
                      <span className="diff-label">Find:</span>
                      <code>{edit.find.slice(0, 100)}{edit.find.length > 100 ? '...' : ''}</code>
                    </div>
                    <div className="edit-add">
                      <span className="diff-label">Replace:</span>
                      <code>{edit.replace.slice(0, 150)}{edit.replace.length > 150 ? '...' : ''}</code>
                    </div>
                  </div>
                  <button
                    className={`apply-edit-btn ${isApplied ? 'applied' : ''}`}
                    onClick={() => handleApplyEdit(edit, editKey)}
                    disabled={isApplied}
                  >
                    {isApplied ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Applied
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Apply to CV
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="chat-panel">
      <div className="messages-container">
        {messages.length === 0 && !streamingContent && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p>Paste a job description above and click "Analyze" to start the conversation.</p>
            <p className="hint">Ask the AI to edit your CV directly, e.g., "Add my Python experience to the skills section"</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? 'You' : 'AI'}
            </div>
            <div className="message-bubble">
              <div className="message-content">{renderContent(msg.content, index)}</div>
            </div>
          </div>
        ))}
        {isThinking && !streamingContent && (
          <div className="message assistant thinking">
            <div className="message-avatar">AI</div>
            <div className="message-bubble">
              <div className="thinking-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        {streamingContent && (
          <div className="message assistant streaming">
            <div className="message-avatar">AI</div>
            <div className="message-bubble">
              <div className="message-content">{renderContent(streamingContent, -1)}</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chat-input-form">
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
