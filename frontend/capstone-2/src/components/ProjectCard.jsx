import React, { useEffect, useState } from 'react';
import '../styles/ProjectCard.css';

function ProjectCard({ onSelectProject, userData, refreshProjects }) {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  // Load projects from Supabase.
  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userData?.id); // load only user's projects
    if (!error) {
      setProjects(data);
    } else {
      console.error('Error loading projects:', error);
    }
  };

  // Call loadProjects on mount and whenever refreshProjects is toggled.
  useEffect(() => {
    if (userData) {
      loadProjects();
    }
  }, [userData, refreshProjects]);

  // Filter projects based on search term.
  const filteredProjects = projects.filter(project => {
    return project.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Function to create a new project.
  const handleNewProject = async () => {
    // Check if user is logged in and userData exists.
    if (!userData) return;

    // Use a default title ("Unnamed Project") and other placeholder data.
    const newProject = {
      // Using Supabase Auth id as user_id
      user_id: userData.id,  
      title: "Unnamed Project",  // default title
      description: "This project has no name yet.",
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(newProject)
      .select(); // Return the inserted row

    if (error) {
      console.error('Error creating project:', error);
    } else {
      console.log('New project created:', data);
      onSelectProject(data[0]);
      // Refresh your projects list:
      loadProjects();
    }
  };

  return (
    <div className="projects-page">
      <div className="projects-header">
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <Filter filter={filter} setFilter={setFilter} />
        <button className="new-project-button" onClick={handleNewProject}>
          New Project
        </button>
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

  // return (
  //   <div className="project-card" onClick={onClick}>
  //     <h3>{project.title}</h3>
  //     <p><strong>LLM Model:</strong> {project.llm}</p>
  //     <p><strong>Dataset Size:</strong> {project.datasetSize}</p>
  //   </div>
  // );
}

export default ProjectCard;