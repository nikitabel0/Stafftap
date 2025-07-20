import React, { useState } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';

const SkillsList = ({ 
  skills, 
  isEditing, 
  onSkillsChange, 
  allSkills,
  onCreateSkill 
}) => {
  const [newSkillName, setNewSkillName] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  const handleAddSkill = async () => {
    if (selectedSkillId) {
      // Добавление существующего навыка
      const skillToAdd = allSkills.find(s => s.id === selectedSkillId);
      if (skillToAdd && !skills.some(s => s.id === selectedSkillId)) {
        onSkillsChange([...skills, skillToAdd]);
        setSelectedSkillId(null);
      }
    } else if (newSkillName.trim()) {
      // Добавление пользовательского навыка
      try {
        const createdSkill = await onCreateSkill(newSkillName.trim());
        onSkillsChange([...skills, createdSkill]);
        setNewSkillName('');
        setIsAddingCustom(false);
      } catch (error) {
        console.error('Ошибка создания навыка:', error);
      }
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
          {isAddingCustom ? (
            <div className="custom-skill-input">
              <input
                type="text"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="Введите название навыка"
                autoFocus
              />
              <div className="skill-buttons">
                <button 
                  className="confirm-skill-btn"
                  onClick={handleAddSkill}
                  disabled={!newSkillName.trim()}
                >
                  Добавить
                </button>
                <button 
                  className="cancel-skill-btn"
                  onClick={() => setIsAddingCustom(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="skill-selection">
              <select
                value={selectedSkillId || ''}
                onChange={(e) => setSelectedSkillId(
                  e.target.value ? parseInt(e.target.value) : null
                )}
              >
                <option value="">Выберите из списка</option>
                {allSkills
                  .filter(skill => !skills.some(s => s.id === skill.id))
                  .map(skill => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
              </select>
              <button 
                className="add-custom-btn"
                onClick={() => setIsAddingCustom(true)}
              >
                <FiPlus /> Свой навык
              </button>
              {selectedSkillId && (
                <button 
                  className="add-skill-btn"
                  onClick={handleAddSkill}
                >
                  <FiPlus /> Добавить
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SkillsList;