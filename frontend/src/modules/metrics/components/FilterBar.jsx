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
                <label className="filter-bar__label">From Month</label>
                <input
                    type="month"
                    className="filter-bar__select"
                    value={filters.start_date ? filters.start_date.substring(0, 7) : ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                            handleChange('start_date', '');
                        } else {
                            handleChange('start_date', `${val}-01`);
                        }
                    }}
                    disabled={loading}
                />
            </div>

            <div className="filter-bar__group">
                <label className="filter-bar__label">To Month</label>
                <input
                    type="month"
                    className="filter-bar__select"
                    value={filters.end_date ? filters.end_date.substring(0, 7) : ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                            handleChange('end_date', '');
                        } else {
                            const [year, month] = val.split('-');
                            const lastDay = new Date(year, month, 0).getDate();
                            handleChange('end_date', `${val}-${lastDay}`);
                        }
                    }}
                    disabled={loading}
                />
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

            <div className="filter-bar__group">
                <label className="filter-bar__label">University</label>
                <select
                    className="filter-bar__select"
                    value={filters.university_id || ''}
                    onChange={(e) => handleChange('university_id', e.target.value)}
                    disabled={loading}
                >
                    <option value="">All Universities</option>
                    {masterData.universities.map((university) => (
                        <option key={university.university_id} value={university.university_id}>
                            {university.university_name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default FilterBar;
