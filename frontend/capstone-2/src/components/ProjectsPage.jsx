import React, { useState, useEffect } from 'react';
import supabase from './Supabase';
import SearchBar from './SearchBar';
import Filter from './Filter';
import ProjectCard from './ProjectCard';
import '../styles/Projects.css';

function ProjectsPage({ onSelectProject, userData, refreshProjects }) {
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

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;

    try {
      const { data: files, error: listError } = await supabase
        .storage
        .from("images")
        .list(`${projectId}`);
      if (listError) throw listError;

      console.log(files);

      const paths = files.map(f => `${projectId}/${f.name}`);
      console.log(paths);

      if (paths.length > 0) {
        const { error: rmError } = await supabase
          .storage
          .from("images")
          .remove(paths);
        if (rmError) throw rmError;
      }

      const { error: projError } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);
      if (projError) throw projError;

      setProjects(ps => ps.filter(p => p.id !== projectId));
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Sorry, something went wrong when deleting your project.");
    }
  }

  // Call loadProjects on mount and whenever refreshProjects is toggled.
  useEffect(() => {
    if (userData) {
      loadProjects();
    }
  }, [userData, refreshProjects]);

  // Filter projects based on search term.
  const filteredProjects = projects.filter(project => {
    return project.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Function to create a new project.
  const handleNewProject = async () => {
    // Check if user is logged in and userData exists.
    if (!userData) {
      console.log("userData null");
      return;
    }

    // Use a default title ("Unnamed Project") and other placeholder data.
    const newProject = {
      // Using Supabase Auth id as user_id
      user_id: userData.id,  
      name: "Unnamed Project",  // default title
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
      </div>

      <div className="grid-container">
        <div className="projects-grid">
          {/* New Project Card as the first item */}
          <div className="project-card new-project-card" onClick={handleNewProject}>
            <h3>New Project</h3>
            <p>Click to create a new project</p>
          </div>

          {/* Render existing projects */}
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onSelectProject(project)}
              onDelete={(id) => handleDeleteProject(id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProjectsPage;