import React, { useState } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';

const SkillsList = ({ skills, isEditing, onSkillsChange }) => {
  const [newSkill, setNewSkill] = useState('');
  const [availableSkills] = useState([
    "Бариста", "Официант", "Повар", "Помощник повара", 
    "Мерчендайзер", "Промоутер", "Кассир", "Уборщик"
  ]);

  const handleAddSkill = () => {
    if (newSkill && !skills.some(s => s.name === newSkill)) {
      onSkillsChange([...skills, { id: Date.now(), name: newSkill }]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (id) => {
    onSkillsChange(skills.filter(skill => skill.id !== id));
  };

  return (
    <div className="skills-container">
      {skills.map(skill => (
        <div key={skill.id} className="skill-tag">
          {skill.name}
          {isEditing && (
            <button 
              className="remove-skill"
              onClick={() => handleRemoveSkill(skill.id)}
            >
              <FiX />
            </button>
          )}
        </div>
      ))}
      
      {isEditing && (
        <div className="add-skill-form">
          <select
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
          >
            <option value="">Выберите навык</option>
            {availableSkills
              .filter(skill => !skills.some(s => s.name === skill))
              .map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
          </select>
          <button 
            className="add-skill-btn"
            onClick={handleAddSkill}
            disabled={!newSkill}
          >
            <FiPlus /> Добавить
          </button>
        </div>
      )}
    </div>
  );
};

export default SkillsList;