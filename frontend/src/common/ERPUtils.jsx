
import React from 'react';

const ERPUtils = {
    isUndefinedOrNull: (val) => val === undefined || val === null,
    isNullOrEmpty: (val) => val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0),
    isNullorWhiteSpace: (val) => val === null || val === undefined || val?.trim() === '',
    isArray: (val) => Array.isArray(val),
    cloneState: (state) => JSON.parse(JSON.stringify(state)),
    checkResponse: (response, successOnly = true, type = 'success') => {
        if (!response || !response.status) return null;
        if (response.status >= 200 && response.status < 300) {
            return response.data;
        }
        return null;
    },
    loading: (id, isLoading) => {
        // Placeholder for loading state management (e.g., dispatching to redux or context)
        console.log(`Loading state for ${id}: ${isLoading}`);
    }
};

export default ERPUtils;
