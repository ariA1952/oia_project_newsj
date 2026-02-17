import './ActionButton.css';

const ActionButton = ({ children, onClick, variant = 'primary', type = 'button', disabled = false }) => {
    return (
        <button
            type={type}
            className={`action-button action-button--${variant}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

export default ActionButton;
