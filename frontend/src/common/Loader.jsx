import './Loader.css';

const Loader = ({ size = 'medium', fullscreen = false }) => {
    if (fullscreen) {
        return (
            <div className="loader-overlay">
                <div className={`loader loader--${size}`}></div>
            </div>
        );
    }

    return <div className={`loader loader--${size}`}></div>;
};

export default Loader;
