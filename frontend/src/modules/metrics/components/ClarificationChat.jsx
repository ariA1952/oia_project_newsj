import React, { useState } from 'react';
import { Send, User } from 'lucide-react';
import ActionButton from '../../../common/ActionButton';
import { useAuth } from '../../../common/AuthContext';
import './ClarificationChat.css';

const ClarificationChat = ({ activity, onReply }) => {
    const { user } = useAuth();
    const [replyText, setReplyText] = useState('');

    // Parse the single rejection_remarks string into mock messages
    const parseMessages = (remarks) => {
        if (!remarks) return [];

        // We split by a standard delimiter if we use one, otherwise treat as one message 
        // For now, if it's just raw text from HOD, we show it as one message from "Reviewer"
        const parts = remarks.split('|||');

        return parts.map((part, index) => {
            const isFaculty = part.includes('[FACULTY]:');
            const isAdmin = part.includes('[REVIEWER]:');
            const cleanText = part.replace('[FACULTY]:', '').replace('[REVIEWER]:', '').trim();

            return {
                id: index,
                sender: isFaculty ? 'Faculty' : 'Reviewer',
                isOwner: (isFaculty && user?.erp_users_type === 'FACULTY') ||
                    (!isFaculty && user?.erp_users_type !== 'FACULTY'),
                text: cleanText || part.trim(),
            };
        }).filter(m => m.text);
    };

    const messages = parseMessages(activity.rejection_remarks);

    const handleSend = () => {
        if (!replyText.trim()) return;

        const prefix = user?.erp_users_type === 'FACULTY' ? '[FACULTY]: ' : '[REVIEWER]: ';
        const existingRemarks = activity.rejection_remarks ? activity.rejection_remarks + ' ||| ' : '';
        const newRemarks = existingRemarks + prefix + replyText.trim();

        onReply(newRemarks);
        setReplyText('');
    };

    return (
        <div className="clarification-chat">
            <div className="clarification-chat__header">
                <h3>Clarification Thread</h3>
            </div>

            <div className="clarification-chat__messages">
                {messages.length === 0 ? (
                    <div className="clarification-chat__empty">No clarification messages yet.</div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`clarification-chat__message-wrapper ${msg.isOwner ? 'clarification-chat__message-wrapper--owner' : ''}`}
                        >
                            <div className="clarification-chat__avatar">
                                <User size={16} />
                            </div>
                            <div className={`clarification-chat__message ${msg.isOwner ? 'clarification-chat__message--owner' : ''}`}>
                                <div className="clarification-chat__sender">{msg.sender}</div>
                                <div className="clarification-chat__text">{msg.text}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="clarification-chat__input-area">
                <textarea
                    className="clarification-chat__textarea"
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                />
                <ActionButton variant="primary" onClick={handleSend} disabled={!replyText.trim()}>
                    <Send size={16} style={{ marginRight: '6px' }} />
                    Reply
                </ActionButton>
            </div>
        </div>
    );
};

export default ClarificationChat;
