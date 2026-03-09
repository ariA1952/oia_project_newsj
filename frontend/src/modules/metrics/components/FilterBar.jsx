import './FilterBar.css';

const FilterBar = ({ filters, onChange, masterData, loading }) => {
    const handleChange = (key, value) => {
        onChange({ ...filters, [key]: value });
    };

    return (
        <div className="filter-bar">
            <div className="filter-bar__group">
                <label className="filter-bar__label">Academic Year</label>
                <select
                    className="filter-bar__select"
                    value={filters.academic_year_id || ''}
                    onChange={(e) => handleChange('academic_year_id', e.target.value)}
                    disabled={loading}
                >
                    <option value="">All Academic Years</option>
                    {masterData.academicYears.map((year) => (
                        <option key={year.erp_academic_year_id} value={year.erp_academic_year_id}>
                            {year.academic_year_name || year.academic_year}
                        </option>
                    ))}
                </select>
            </div>

            <div className="filter-bar__group">
                <label className="filter-bar__label">Quarter</label>
                <select
                    className="filter-bar__select"
                    value={filters.quarter_id || ''}
                    onChange={(e) => handleChange('quarter_id', e.target.value)}
                    disabled={loading}
                >
                    <option value="">All Quarters</option>
                    {masterData.quarters
                        .filter(quarter => !filters.academic_year_id || String(quarter.erp_academic_year_id) === String(filters.academic_year_id))
                        .map((quarter) => (
                            <option key={quarter.quarter_id} value={quarter.quarter_id}>
                                Q{quarter.quarter_number}
                            </option>
                        ))}
                </select>
            </div>

            <div className="filter-bar__group">
                <label className="filter-bar__label">Campus</label>
                <select
                    className="filter-bar__select"
                    value={filters.campus_id || ''}
                    onChange={(e) => handleChange('campus_id', e.target.value)}
                    disabled={loading}
                >
                    <option value="">All Campuses</option>
                    {masterData.campuses.map((campus) => (
                        <option key={campus.erp_campus_id} value={campus.erp_campus_id}>
                            {campus.campus_name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="filter-bar__group">
                <label className="filter-bar__label">Department</label>
                <select
                    className="filter-bar__select"
                    value={filters.department_id || ''}
                    onChange={(e) => handleChange('department_id', e.target.value)}
                    disabled={loading}
                >
                    <option value="">All Departments</option>
                    {masterData.departments.map((dept) => (
                        <option key={dept.erp_department_id} value={dept.erp_department_id}>
                            {dept.department_name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="filter-bar__group">
                <label className="filter-bar__label">Parameter</label>
                <select
                    className="filter-bar__select"
                    value={filters.parameter_id || ''}
                    onChange={(e) => handleChange('parameter_id', e.target.value)}
                    disabled={loading}
                >
                    <option value="">All Parameters</option>
                    {masterData.parameters.map((param) => (
                        <option key={param.parameter_id} value={param.parameter_id}>
                            {param.parameter_name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default FilterBar;
