
const AppContext = {
    notify: (data) => {
        // Simple console log for now, replace with actual toast implementation if available
        console.log(`[Notification - ${data.Type}]: ${data.Text}`);
        if (window.alert) window.alert(`${data.Type}: ${data.Text}`);
    },
    alert: (data) => {
        // Browser confirm dialog as fallback
        const result = window.confirm(`${data.Title}\n${data.Text}`);
        if (result) {
            if (data.Callback) data.Callback(0); // Assuming 0 is "Yes"
        } else {
            if (data.Callback) data.Callback(1); // Assuming 1 is "No"
        }
    }
};

export default AppContext;
