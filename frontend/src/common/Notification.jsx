import { useState, useEffect } from 'react';
import './Notification.css';

const Notification = ({ message, type = 'info', duration = 3000, onClose }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            if (onClose) onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!visible) return null;

    return (
        <div className={`notification notification--${type}`}>
            <span className="notification__message">{message}</span>
            <button
                className="notification__close"
                onClick={() => {
                    setVisible(false);
                    if (onClose) onClose();
                }}
            >
                ×
            </button>
        </div>
    );
};

export default Notification;
