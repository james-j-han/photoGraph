import React, { useState } from 'react';
import '../styles/ProjectDetail.css';

function ProjectDetail({ project, onBack }) {
  const [is3D, setIs3D] = useState(false);

  // If project is null or undefined
  if (!project) {
    return (
      <div className="project-detail">
        <p>No project selected.</p>
        <button onClick={onBack}>Back to Projects</button>
      </div>
    );
  }

  return (
    <div className="project-detail">
      <header className="project-detail-header">
        <div className='header-top'>
          <button className='header-top desktop-only' onClick={onBack}>Back to Projects</button>
          <h2>{project.title}</h2>
        </div>
        <div className="header-controls">
          <span><strong>Model:</strong> {project.llm}</span>
          <div>
            <button onClick={() => console.log('Add to dataset')}>Dataset</button>
            <button onClick={() => setIs3D(prev => !prev)}>
              {is3D ? '3D' : '2D'}
            </button>
          </div>
        </div>
      </header>

      <button className="back-button mobile-only" onClick={onBack}>
        Back to Projects
      </button>

      <div className="scatterplot-area">
        {is3D ? '3D Scatter Plot' : '2D Scatter Plot'}
      </div>

      {/* Add  Explore panel, top-k results, etc. */}
    </div>
  );
}

export default ProjectDetail;