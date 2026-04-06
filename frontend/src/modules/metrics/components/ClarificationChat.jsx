import React, { useState, useEffect } from 'react';
import { Send, User, Loader2 } from 'lucide-react';
import ActionButton from '../../../common/ActionButton';
import { useAuth } from '../../../common/AuthContext';
import { getClarifications } from '../services/metricsService';
import './ClarificationChat.css';

const ClarificationChat = ({ activity, onReply, readOnly = false }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const data = await getClarifications(activity.activity_id);
            setMessages(data);
        } catch (error) {
            console.error('Failed to fetch clarifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, [activity.activity_id]);

    const handleSend = async () => {
        if (!replyText.trim()) return;

        const textToSubmit = replyText.trim();
        setReplyText(''); // Clear early for UX

        try {
            await onReply(textToSubmit);
            // Re-fetch to show the new message
            fetchMessages();
        } catch (error) {
            setReplyText(textToSubmit); // Restore on failure
        }
    };

    if (loading && messages.length === 0) {
        return (
            <div className="clarification-chat clarification-chat--loading">
                <Loader2 className="animate-spin" size={24} />
                <span>Loading messages...</span>
            </div>
        );
    }

    return (
        <div className="clarification-chat">
            <div className="clarification-chat__header">
                <h3>Clarification Thread</h3>
            </div>

            <div className="clarification-chat__messages">
                {messages.length === 0 ? (
                    <div className="clarification-chat__empty">No clarification messages yet.</div>
                ) : (
                    messages.map((msg) => {
                        const isOwner = msg.sender_user_id === user?.erp_users_id;
                        const senderName = `User ${msg.sender_user_id}`;

                        return (
                            <div
                                key={msg.clarification_id}
                                className={`clarification-chat__message-wrapper ${isOwner ? 'clarification-chat__message-wrapper--owner' : ''}`}
                            >
                                <div className="clarification-chat__avatar">
                                    <User size={16} />
                                </div>
                                <div className={`clarification-chat__message ${isOwner ? 'clarification-chat__message--owner' : ''}`}>
                                    <div className="clarification-chat__sender">{senderName}</div>
                                    <div className="clarification-chat__text">{msg.message}</div>
                                    <div className="clarification-chat__time">
                                        {new Date(msg.created_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {!readOnly && (
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
            )}
        </div>
    );
};

export default ClarificationChat;
