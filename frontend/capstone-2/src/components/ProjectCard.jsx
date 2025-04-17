import React from 'react';
import '../styles/ProjectCard.css';

function ProjectCard({ project, onClick, onDelete }) {
  const handleDeleteClick = (e) => {
    e.stopPropagation();      // prevent the “open detail” click
    onDelete(project.id);
  };

  return (
    <div className="project-card" onClick={onClick}>
      <h3>{project.name}</h3>
      <p><strong>LLM Model:</strong> {project.llm}</p>
      <p><strong>Dataset Size:</strong> {project.datasetSize}</p>
      <button
        className="delete-btn"
        onClick={handleDeleteClick}
      >
        Delete
      </button>
    </div>
  );
}

export default ProjectCard;