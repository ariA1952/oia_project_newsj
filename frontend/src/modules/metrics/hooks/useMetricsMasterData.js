import { useState, useEffect } from 'react';
import {
    getAcademicYears,
    getQuarters,
    getCampuses,
    getDepartments,
    getParameters,
    getPartnerUniversities,
} from '../services/metricsService';

const useMetricsMasterData = () => {
    const [masterData, setMasterData] = useState({
        academicYears: [],
        quarters: [],
        campuses: [],
        departments: [],
        parameters: [],
        universities: [],
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
                ] = await Promise.all([
                    getAcademicYears().catch(() => []),
                    getQuarters().catch(() => []),
                    getCampuses().catch(() => []),
                    getDepartments().catch(() => []),
                    getParameters().catch(() => []),
                    getPartnerUniversities().catch(() => []),
                ]);

                setMasterData({
                    academicYears,
                    quarters,
                    campuses,
                    departments,
                    parameters,
                    universities,
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
            ] = await Promise.all([
                getAcademicYears().catch(() => []),
                getQuarters().catch(() => []),
                getCampuses().catch(() => []),
                getDepartments().catch(() => []),
                getParameters().catch(() => []),
                getPartnerUniversities().catch(() => []),
            ]);

            setMasterData({
                academicYears,
                quarters,
                campuses,
                departments,
                parameters,
                universities,
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
