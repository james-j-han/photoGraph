import React from 'react';

function Filter({ filter, setFilter }) {
  return (
    <button
      className="filter-button"
      onClick={() => setFilter(filter === 'all' ? 'active' : 'all')}
    >
      {filter === 'all' ? 'Show Active Projects' : 'Show All Projects'}
    </button>
  );
}

export default Filter;