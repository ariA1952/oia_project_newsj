import { useState, useEffect } from 'react';
import {
    getAcademicYears,
    getQuarters,
    getCampuses,
    getDepartments,
    getParameters,
    getPartnerUniversities,
    getCampusDeptMappings,
} from '../services/metricsService';

const useMetricsMasterData = () => {
    const [masterData, setMasterData] = useState({
        academicYears: [],
        quarters: [],
        campuses: [],
        departments: [],
        parameters: [],
        universities: [],
        mappings: [],
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMasterData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [
                    academicYears,
                    quarters,
                    campuses,
                    departments,
                    parameters,
                    universities,
                    mappings,
                ] = await Promise.all([
                    getAcademicYears().catch(() => []),
                    getQuarters().catch(() => []),
                    getCampuses().catch(() => []),
                    getDepartments().catch(() => []),
                    getParameters().catch(() => []),
                    // Only Active universities appear in dropdowns during data entry.
                    // PENDING_REVIEW universities are excluded until MOU is formalised.
                    getPartnerUniversities({ status: 'Active', skip: 0, limit: 1000 }).catch(() => []),
                    getCampusDeptMappings().catch(() => []),
                ]);

                setMasterData({
                    academicYears,
                    quarters,
                    campuses,
                    departments,
                    parameters,
                    universities,
                    mappings,
                });
            } catch (err) {
                setError(err.message || 'Failed to fetch master data');
            } finally {
                setLoading(false);
            }
        };

        fetchMasterData();
    }, []);

    const refreshMasterData = async () => {
        setLoading(true);
        setError(null);

        try {
            const [
                academicYears,
                quarters,
                campuses,
                departments,
                parameters,
                universities,
                mappings,
            ] = await Promise.all([
                getAcademicYears().catch(() => []),
                getQuarters().catch(() => []),
                getCampuses().catch(() => []),
                getDepartments().catch(() => []),
                getParameters().catch(() => []),
                getPartnerUniversities({ status: 'Active', skip: 0, limit: 1000 }).catch(() => []),
                getCampusDeptMappings().catch(() => []),
            ]);

            setMasterData({
                academicYears,
                quarters,
                campuses,
                departments,
                parameters,
                universities,
                mappings,
            });
        } catch (err) {
            setError(err.message || 'Failed to refresh master data');
        } finally {
            setLoading(false);
        }
    };

    return { masterData, loading, error, refreshMasterData };
};

export default useMetricsMasterData;
