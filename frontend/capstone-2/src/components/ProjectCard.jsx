import React from 'react';
import '../styles/ProjectCard.css';

function ProjectCard({ project, onClick }) {
  // const handleClick = () => {
  //   // Future: navigate to project details page
  //   console.log(`Clicked project ${project.id}`);
  // };

  return (
    <div className="project-card" onClick={onClick}>
      <h3>{project.title}</h3>
      <p><strong>LLM Model:</strong> {project.llm}</p>
      <p><strong>Dataset Size:</strong> {project.datasetSize}</p>
    </div>
  );
}

export default ProjectCard;