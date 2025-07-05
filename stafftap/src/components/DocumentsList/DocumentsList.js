import React from 'react';
import { FiPlus, FiFile, FiDownload, FiTrash2 } from 'react-icons/fi';

const DocumentsList = ({ documents, isEditing, onDocumentsChange }) => {
  const handleAddDocument = () => {
    
    const newDocument = {
      id: Date.now(),
      type: "ИНН",
      file_url: "document.pdf",
      status: "pending"
    };
    onDocumentsChange([...documents, newDocument]);
  };

  const handleRemoveDocument = (id) => {
    onDocumentsChange(documents.filter(doc => doc.id !== id));
  };

  return (
    <div className="documents-container">
      {documents.map(doc => (
        <div key={doc.id} className="document-item">
          <FiFile className="document-icon" />
          <div className="document-info">
            <div className="document-type">{doc.type}</div>
            <div className={`document-status ${doc.status}`}>
              {doc.status === 'approved' ? 'Подтвержден' : 
               doc.status === 'rejected' ? 'Отклонен' : 'На проверке'}
            </div>
          </div>
          <div className="document-actions">
            <button className="download-btn">
              <FiDownload />
            </button>
            {isEditing && (
              <button 
                className="remove-btn"
                onClick={() => handleRemoveDocument(doc.id)}
              >
                <FiTrash2 />
              </button>
            )}
          </div>
        </div>
      ))}
      
      {isEditing && (
        <button className="add-document-btn" onClick={handleAddDocument}>
          <FiPlus /> Добавить документ
        </button>
      )}
    </div>
  );
};

export default DocumentsList;