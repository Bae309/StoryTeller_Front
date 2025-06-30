import React, { useState } from 'react';
import './App.css';

const StoryTellingApp = () => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentScene, setCurrentScene] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clarification, setClarification] = useState(null);
  const [description, setDescription] = useState('');
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0); // <<< 이 줄 추가

  // 백엔드 API URL - 실제 환경에 맞게 수정하세요
  const API_BASE_URL = 'http://localhost:5000/api';

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCurrentScene(null);
      setHistory([]);
      setError(null);
      setClarification(null);
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      
      const formData = new FormData();
      formData.append('image', file);
      handleStoryAction('generate-story', formData);
    }
  };

  const handleStoryAction = async (endpoint, body) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const isFormData = body instanceof FormData;
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        body: body,
        ...((!isFormData) && { 
          headers: { 
            'Content-Type': 'application/json' 
          } 
        })
      });

      if (!response.ok) {
        let errorPayload;
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          // Try to parse as JSON first
          errorPayload = await response.json();
          if (errorPayload && errorPayload.error) {
            errorMessage = errorPayload.error; // Use specific error from backend
          } else if (errorPayload) {
            // If JSON but no 'error' field, stringify for more info
            errorMessage = `Backend error (Status ${response.status}): ${JSON.stringify(errorPayload)}`;
          }
        } catch (e) {
          // If response is not JSON (e.g., HTML error page from server)
          const textResponse = await response.text();
          errorMessage = `Server returned non-JSON response (Status ${response.status}): ${textResponse.substring(0, 200)}${textResponse.length > 200 ? '...' : ''}`;
          console.error("Full non-JSON error response from server:", textResponse);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Check for clarification_request first
      if (data && data.type === 'clarification_request') {
        setClarification(data);
        setCurrentScene(null);
        setHistory([]);
      } 
      // Then check for story scene data (like story_arc)
      else if (data && data.scene && typeof data.scene.type !== 'undefined') {
        setCurrentScene(data.scene);
        setHistory(data.history || []); // Use existing history or default to empty array
        setClarification(null);
      } 
      // If neither structure matches, then it's an invalid/unrecognized response
      else {
        console.error('Invalid or unrecognized data structure from API:', data);
        throw new Error('API로부터 유효하지 않거나 인식할 수 없는 응답 구조입니다. 응답 데이터: ' + JSON.stringify(data));
      }
      setCurrentPanelIndex(0); 
    } catch (err) {
      console.error("API Action Error in handleStoryAction:", err); // Log the full error object
      setError(err instanceof Error ? err.message : String(err)); // Use err.message or stringify
    } finally {
      setIsLoading(false);
    }
  };

  const handleDescriptionSubmit = () => {
    if (!description.trim()) {
      setError("그림에 대한 설명을 입력해주세요!");
      return;
    }
    const body = JSON.stringify({ description });
    handleStoryAction('generate-story-from-text', body);
  };

  const chooseNextStep = (choice) => {
    const body = JSON.stringify({
      history: history,
      choice: choice,
    });
    handleStoryAction('continue-story', body);
  };

  const startNew = () => {
    setImage(null);
    setImagePreview(null);
    setCurrentScene(null);
    setHistory([]);
    setError(null);
    setClarification(null);
    setDescription('');
  };

  const handlePrevPanel = () => {
    setCurrentPanelIndex(prevIndex => Math.max(0, prevIndex - 1));
  };

  const handleNextPanel = () => {
    if (currentScene && currentScene.story) {
      setCurrentPanelIndex(prevIndex => Math.min(currentScene.story.length - 1, prevIndex + 1));
    }
  };

  return (
    <div className="storytelling-app">
      <div className="main-container">
        <div className="header">
          <h1 className="main-title">
            🎨 나의 상상 동화 📚
          </h1>
          <p className="subtitle">그림을 그려서 나만의 특별한 동화를 만들어보세요!</p>
        </div>

        {!currentScene ? (
          <div className="initial-screen">
            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p className="loading-text">그림을 보고 동화를 만들고 있어요...</p>
                <div className="loading-dots">
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                </div>
              </div>
            ) : clarification ? (
              <div className="clarification-container">
                {imagePreview && (
                  <div className="clarification-image">
                    <div className="clarification-image-box">
                      <img 
                        src={imagePreview} 
                        alt="업로드된 그림" 
                      />
                    </div>
                  </div>
                )}
                <div className="clarification-box">
                  <div className="clarification-icon">🤔</div>
                  <p className="clarification-question">{clarification.question}</p>
                  <textarea
                    className="description-textarea"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={clarification.input_prompt}
                  />
                  <button 
                    onClick={handleDescriptionSubmit} 
                    className="submit-description-button"
                  >
                    ✨ 설명하고 이야기 만들기!
                  </button>
                </div>
              </div>
            ) : (
              <div className="upload-container">
                <div className="upload-box">
                  <div className="upload-icon">🎨</div>
                  <p className="upload-description">
                    아이가 그린 그림이나 낙서를 업로드하면<br/>
                    멋진 동화로 만들어드려요!
                  </p>
                  <label 
                    htmlFor="image-upload" 
                    className="upload-button"
                  >
                    📸 그림 선택하기
                  </label>
                  <input 
                    id="image-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                    className="file-input" 
                  />
                </div>
                
                {imagePreview && (
                  <div className="image-preview">
                    <img 
                      src={imagePreview} 
                      alt="업로드된 그림 미리보기" 
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="story-container">
            {(() => { // IIFE to define variables locally for this block
              const storyPanels = currentScene?.story;
              const currentPanel = storyPanels?.[currentPanelIndex];
              const totalPanels = storyPanels?.length || 0;

              return (
                <>
                  <div className="scene-image-container">
                    <img 
                      src={currentPanel?.image_url || currentScene.image_url} 
                      alt={`동화 장면 ${currentPanelIndex + 1}`}
                      className="scene-image" 
                    />
                  </div>
                  
                  <div className="story-content">
                    <p className="narrator-text">
                      {currentPanel?.narrator}
                    </p>
                    {currentPanel?.dialogues?.map((dialogue, index) => (
                      <div key={index} className="dialogue-item">
                        <p className="dialogue-text">
                          <span className={`character-name ${
                            dialogue.character === '토끼' ? 'character-rabbit' : 
                            dialogue.character === '거북이' ? 'character-turtle' :
                            dialogue.character === '여우' ? 'character-fox' :
                            'character-default'
                          }`}>
                            {dialogue.character}:
                          </span> 
                          <span> {dialogue.line}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  {totalPanels > 1 && (
                    <div className="panel-navigation">
                      <button 
                        onClick={handlePrevPanel} 
                        disabled={currentPanelIndex === 0}
                        className="panel-nav-button prev-button"
                      >
                        이전 컷
                      </button>
                      <span className="panel-indicator">
                        {currentPanelIndex + 1} / {totalPanels}
                      </span>
                      <button 
                        onClick={handleNextPanel} 
                        disabled={currentPanelIndex === totalPanels - 1}
                        className="panel-nav-button next-button"
                      >
                        다음 컷
                      </button>
                    </div>
                  )}

                  {isLoading ? (
                    <div className="story-loading">
                      <div className="loading-spinner"></div>
                      <p className="story-loading-text">다음 이야기를 만들고 있어요...</p>
                    </div>
                  ) : (
                    currentPanelIndex === totalPanels - 1 && currentScene?.choices && currentScene.choices.length > 0 && (
                      <div className="choices-section">
                        <h2 className="choices-title">
                          🤔 다음엔 어떻게 할까요?
                        </h2>
                        <div className="choices-grid">
                          {currentScene?.choices?.map((choice, index) => ( // Note: currentScene.choices, not currentScene.scene.choices
                            <button 
                              key={index} 
                              onClick={() => chooseNextStep(choice.text)} 
                              className="choice-button"
                            >
                              {choice.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                  
                  <div className="bottom-actions">
                    <button 
                      onClick={startNew} 
                      className="restart-button"
                    >
                      🔄 처음으로 돌아가기
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
        
        {error && (
          <div className="error-container">
            <div className="error-box">
              <div className="error-icon">⚠️</div>
              <p className="error-text">오류: {error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryTellingApp;