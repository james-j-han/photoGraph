import React, { useState } from 'react';
import SearchBar from './SearchBar';
import Filter from './Filter';
import ProjectCard from './ProjectCard';
import '../styles/Projects.css';

function ProjectsPage({ onSelectProject }) {
  // Dummy data
  const projects = [
    { id: 1, title: 'Project One', llm: 'GPT-4', datasetSize: '500MB' },
    { id: 2, title: 'Project Two', llm: 'GPT-3', datasetSize: '1GB' },
    { id: 3, title: 'Project Three', llm: 'BERT', datasetSize: '250MB' },
    { id: 4, title: 'Project Four', llm: 'GPT-4', datasetSize: '750MB' },
    { id: 5, title: 'Project Four', llm: 'GPT-4', datasetSize: '750MB' },
    { id: 6, title: 'Project Four', llm: 'GPT-4', datasetSize: '750MB' },
    { id: 7, title: 'Project Four', llm: 'GPT-4', datasetSize: '750MB' },
    { id: 8, title: 'Project Four', llm: 'GPT-4', datasetSize: '750MB' },
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  // Needs work
  const filteredProjects = projects.filter(project => {
    return project.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="projects-page">
      <div className="projects-header">
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <Filter filter={filter} setFilter={setFilter} />
      </div>
      
      <div className="grid-container">
        <div className="projects-grid">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onSelectProject(project)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProjectsPage;