import { useState, useEffect } from 'react';
import { getUserProfile } from '../services/metricsService';

/**
 * Fetches the current user's profile from /auth/me.
 * Returns:
 *   - campus_id, dept_id derived from the user's erp_campus_department_mapping
 *   - current_academic_year_id from the active academic year
 */
const useUserProfile = () => {
    const [profile, setProfile] = useState({
        campus_id: null,
        dept_id: null,
        current_academic_year_id: null,
        erp_users_type: null,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await getUserProfile();
                setProfile({
                    campus_id: data.campus_id ?? null,
                    dept_id: data.dept_id ?? null,
                    current_academic_year_id: data.current_academic_year_id ?? null,
                    erp_users_type: data.erp_users_type ?? null,
                });
            } catch (err) {
                console.error('Failed to fetch user profile', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    return { profile, loading };
};

export default useUserProfile;
