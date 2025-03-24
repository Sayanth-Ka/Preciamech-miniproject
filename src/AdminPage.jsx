import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, authenticateAdmin } from './firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import './AdminPage.css';

const AdminPage = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(() => {
    const stored = sessionStorage.getItem('isAdmin');
    return stored === 'true';
  });
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [answerText, setAnswerText] = useState('');
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectClient, setProjectClient] = useState('');
  const [projectType, setProjectType] = useState('');
  const [projectNature, setProjectNature] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsList);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  // Fetch pending questions for admin
  const fetchPendingQuestions = async () => {
    try {
      const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const questionList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().createdAt ? new Date(doc.data().createdAt.toDate()).toLocaleDateString() : new Date().toLocaleDateString()
      }));
      setPendingQuestions(questionList);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchPendingQuestions();
      fetchProjects();
    }
  }, [isAdmin]);

  // Admin login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const isAuthenticated = await authenticateAdmin(adminUsername, adminPassword);
      if (isAuthenticated) {
        sessionStorage.setItem('isAdmin', 'true');
        setIsAdmin(true);
      } else {
        setLoginError('Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Authentication failed. Please try again.');
    }
  };

  // Submit answer to question
  const handleSubmitAnswer = async (questionId) => {
    try {
      const questionRef = doc(db, "questions", questionId);
      await updateDoc(questionRef, {
        answer: answerText,
        answered: true,
        published: true,
        updatedAt: serverTimestamp()
      });
      setAnswerText('');
      setCurrentQuestionId(null);
      fetchPendingQuestions();
      setSuccessMessage('Answer submitted successfully!');
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  };

  // Toggle publish status
  const togglePublishStatus = async (questionId, currentStatus) => {
    try {
      const questionRef = doc(db, "questions", questionId);
      await updateDoc(questionRef, {
        published: !currentStatus,
        updatedAt: serverTimestamp()
      });
      fetchPendingQuestions();
      setSuccessMessage('Publish status updated successfully!');
    } catch (error) {
      console.error("Error toggling publish status:", error);
    }
  };

  // Edit FAQ
  const handleEditQuestion = async (questionId) => {
    try {
      const questionRef = doc(db, "questions", questionId);
      await updateDoc(questionRef, {
        answer: editingQuestion.answer,
        updatedAt: serverTimestamp()
      });
      setEditingQuestion(null);
      fetchPendingQuestions();
      setSuccessMessage('Question edited successfully!');
    } catch (error) {
      console.error("Error editing question:", error);
    }
  };

  // Add new project
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!isValidUrl(imageUrl)) {
      alert('Please enter a valid image URL');
      return;
    }
    try {
      await addDoc(collection(db, "projects"), {
        title: projectTitle,
        client: projectClient,
        type: projectType,
        nature: projectNature,
        image: imageUrl,
        visible: true,
        createdAt: serverTimestamp()
      });

      setProjectTitle('');
      setProjectClient('');
      setProjectType('');
      setProjectNature('');
      setImageUrl('');
      fetchProjects();
      setSuccessMessage('Project added successfully!');
    } catch (error) {
      console.error("Error adding project:", error);
      alert('Failed to add project');
    }
  };

  // Edit project
  const handleEditProject = async (projectId) => {
    try {
      const projectRef = doc(db, "projects", projectId);
      let updateData = {
        title: editingProject.title,
        description: editingProject.description,
        updatedAt: serverTimestamp()
      };

      if (imageUrl) {
        updateData.image = imageUrl;
      }

      await updateDoc(projectRef, updateData);
      setEditingProject(null);
      setImageUrl('');
      fetchProjects();
      setSuccessMessage('Project edited successfully!');
    } catch (error) {
      console.error("Error editing project:", error);
    }
  };

  // Toggle project visibility
  const toggleProjectVisibility = async (projectId, currentVisibility) => {
    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        visible: !currentVisibility,
        updatedAt: serverTimestamp()
      });
      fetchProjects();
      setSuccessMessage('Project visibility updated successfully!');
    } catch (error) {
      console.error("Error toggling project visibility:", error);
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteDoc(doc(db, "projects", projectId));
        fetchProjects();
        setSuccessMessage('Project deleted successfully!');
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    }
  };

  // Delete question
  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteDoc(doc(db, "questions", questionId));
        fetchPendingQuestions();
        setSuccessMessage('Question deleted successfully!');
      } catch (error) {
        console.error("Error deleting question:", error);
      }
    }
  };

  // Validate URL
  const isValidUrl = (url) => {
    const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\\.)+[a-z]{2,6}|'+ // domain name
      'localhost|'+ // localhost
      '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|'+ // IP
      '\\[?[a-f0-9]*:[a-f0-9:%.]*\\]?)'+ // IPv6
      '(\\:\\d+)?(\\/[-a-z0-9+&@#/%=~_|$?!:.]*[a-z0-9+&@#/%=~_|$])?$', 'i'); // fragment locator
    return !!pattern.test(url);
  };

  return (
    <div className="admin-page">
      <button className="back-button" onClick={() => navigate('/')}>Back to Home</button>

      {!isAdmin ? (
        <div className="admin-login">
          <h2>Admin Login</h2>
          <form onSubmit={handleAdminLogin}>
            <input
              type="text"
              placeholder="Username"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
            <button type="submit">Login</button>
            {loginError && <p className="error">{loginError}</p>}
          </form>
        </div>
      ) : (
        <div className="admin-dashboard">
          <div className="admin-header">
            <h2>Admin Dashboard</h2>
            <button onClick={() => {
              sessionStorage.removeItem('isAdmin');
              setIsAdmin(false);
              navigate('/');
            }}>Logout</button>
          </div>

          {successMessage && <p className="success">{successMessage}</p>}

          <div className="admin-sections">
            <section className="questions-section">
              <h3>FAQ Management</h3>
              {pendingQuestions.map((question) => (
                <div key={question.id} className="question-card">
                  <p><strong>Question:</strong> {question.question}</p>
                  <p><strong>From:</strong> {question.email}</p>
                  <p><strong>Date:</strong> {question.date}</p>

                  {editingQuestion?.id === question.id ? (
                    <div>
                      <textarea
                        value={editingQuestion.answer}
                        onChange={(e) => setEditingQuestion({
                          ...editingQuestion,
                          answer: e.target.value
                        })}
                      />
                      <button onClick={() => handleEditQuestion(question.id)}>
                        Save Changes
                      </button>
                      <button onClick={() => setEditingQuestion(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div>
                      {!question.answered ? (
                        <div>
                          <textarea
                            placeholder="Write your answer"
                            value={currentQuestionId === question.id ? answerText : ''}
                            onChange={(e) => setAnswerText(e.target.value)}
                            onClick={() => setCurrentQuestionId(question.id)}
                          />
                          <button onClick={() => handleSubmitAnswer(question.id)}>
                            Submit Answer
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p><strong>Answer:</strong> {question.answer}</p>
                          <button onClick={() => setEditingQuestion(question)}>
                            Edit Answer
                          </button>
                        </div>
                      )}

                      <button onClick={() => togglePublishStatus(question.id, question.published)}>
                        {question.published ? 'Unpublish' : 'Publish'}
                      </button>

                      <button onClick={() => handleDeleteQuestion(question.id)}>
                        Delete Question
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </section>

            <section className="projects-section">
              <h3>Project Management</h3>
              <form onSubmit={handleAddProject} className="admin-form">
                <input
                  type="text"
                  placeholder="Project Title"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Client Name"
                  value={projectClient}
                  onChange={(e) => setProjectClient(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Project Type"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Project Nature"
                  value={projectNature}
                  onChange={(e) => setProjectNature(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Image URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  required
                />
                {imageUrl && (
                  <div className="image-preview">
                    <img src={imageUrl} alt="Preview" />
                  </div>
                )}
                <button type="submit">Add Project</button>
              </form>

              <div className="projects-grid">
                {projects.map((project) => (
                  <div key={project.id} className="project-item">
                    <div className="project-content">
                      <img src={project.image} alt={project.title} className="project-image"/>
                      <div className="project-info">
                        <h4>{project.title}</h4>
                        <p className="project-client">{project.client}</p>
                        <p className="project-type">{project.type}</p>
                        <p className="project-nature">{project.nature}</p>
                      </div>
                      <div className="project-actions">
                        <button onClick={() => setEditingProject(project)} className="edit-button">
                          Edit
                        </button>
                        <button onClick={() => toggleProjectVisibility(project.id, project.visible)}>
                          {project.visible ? 'Hide' : 'Show'}
                        </button>
                        <button onClick={() => handleDeleteProject(project.id)} className="delete-button">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="modal-overlay" onClick={() => setEditingProject(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Project</h3>
            <div className="edit-form">
              <input
                type="text"
                value={editingProject.title}
                onChange={(e) => setEditingProject({...editingProject, title: e.target.value})}
                placeholder="Project Title"
              />
              <input
                type="text"
                value={editingProject.client}
                onChange={(e) => setEditingProject({...editingProject, client: e.target.value})}
                placeholder="Client Name"
              />
              <input
                type="text"
                value={editingProject.type}
                onChange={(e) => setEditingProject({...editingProject, type: e.target.value})}
                placeholder="Project Type"
              />
              <input
                type="text"
                value={editingProject.nature}
                onChange={(e) => setEditingProject({...editingProject, nature: e.target.value})}
                placeholder="Project Nature"
              />
              <input
                type="text"
                placeholder="New Image URL (optional)"
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <div className="modal-buttons">
                <button onClick={() => handleEditProject(editingProject.id)} className="save-button">Save</button>
                <button onClick={() => setEditingProject(null)} className="cancel-button">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;