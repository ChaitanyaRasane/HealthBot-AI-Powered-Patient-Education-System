import React, { useState, useEffect } from 'react';

export default function App() {
  const [topic, setTopic] = useState('');
  const [currentState, setCurrentState] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [step, setStep] = useState('welcome'); // welcome -> summary -> quiz -> results
  const [showLogs, setShowLogs] = useState(false);
  const [error, setError] = useState('');

  // const BACKEND_URL = 'http://127.0.0.1:8000/api';
  // No domain needed! Vercel handles the routing seamlessly.
const response = await fetch('/api/endpoint');

  // 1. Start session
  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setLoadingMsg('Searching reliable sources & summarizing health data...');

    try {
      const res = await fetch(`${BACKEND_URL}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setCurrentState(data.state);
        setStep('summary');
      } else {
        throw new Error(data.detail || 'Failed to start session');
      }
    } catch (err) {
      console.error("Error starting session:", err);
      setError("Unable to connect to the HealthBot API. Make sure backend/main.py is running on http://127.0.0.1:8000");
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit quiz readiness
  const handleQuizReadiness = async (isReady) => {
    setLoading(true);
    setError('');
    setLoadingMsg('Preparing your comprehension quiz question...');
    try {
      const res = await fetch(`${BACKEND_URL}/quiz/submit-readiness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: currentState, ready: isReady ? 'yes' : 'no' }),
      });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setCurrentState(data.state);
        if (isReady) {
          setStep('quiz');
        } else {
          setStep('summary');
        }
      } else {
        throw new Error(data.detail || 'Failed to transition to quiz');
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while transitioning to the quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit quiz answer
  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;
    setLoading(true);
    setError('');
    setLoadingMsg('Evaluating your answer and generating detailed feedback...');
    try {
      const res = await fetch(`${BACKEND_URL}/quiz/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: currentState, user_answer: userAnswer.trim() }),
      });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setCurrentState(data.state);
        setStep('results');
      } else {
        throw new Error(data.detail || 'Failed to grade answer');
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while grading your response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reset/Restart
  const handleReset = () => {
    setTopic('');
    setCurrentState(null);
    setUserAnswer('');
    setStep('welcome');
    setError('');
  };

  // Color helper for grades
  const getGradeColor = (grade) => {
    const clean = (grade || '').trim().toUpperCase();
    if (clean.includes('A')) return '#4ade80';
    if (clean.includes('B')) return '#a3e635';
    if (clean.includes('C')) return '#facc15';
    if (clean.includes('D')) return '#fb923c';
    if (clean.includes('F')) return '#ef4444';
    return '#38bdf8'; // fallback blue
  };

  // Inline CSS Styles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0a0a0f',
      color: '#cbd5e1',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      boxSizing: 'border-box',
    },
    wrapper: {
      width: '100%',
      maxWidth: '850px',
      marginTop: '30px',
      marginBottom: '40px',
    },
    header: {
      textAlign: 'center',
      paddingBottom: '20px',
      borderBottom: '1px solid #1f1f2e',
      marginBottom: '30px',
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: '700',
      color: '#f8fafc',
      margin: '0 0 10px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
    },
    subtitle: {
      fontSize: '1rem',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      fontWeight: '600',
      margin: 0,
    },
    card: {
      background: 'linear-gradient(145deg, #13131c, #1a1a26)',
      border: '1px solid #27273a',
      borderRadius: '16px',
      padding: '30px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
      position: 'relative',
      overflow: 'hidden',
    },
    cardHeader: {
      borderBottom: '1px solid #27273a',
      paddingBottom: '15px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitle: {
      margin: 0,
      fontSize: '1.5rem',
      color: '#f1f5f9',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    inputGroup: {
      display: 'flex',
      gap: '12px',
      marginTop: '20px',
    },
    input: {
      flex: 1,
      padding: '14px 20px',
      fontSize: '16px',
      backgroundColor: '#0a0a0f',
      border: '1px solid #27273a',
      borderRadius: '8px',
      color: '#f8fafc',
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    buttonPrimary: {
      padding: '14px 28px',
      fontSize: '16px',
      fontWeight: '600',
      color: '#022c22',
      backgroundColor: '#4ade80',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    buttonSecondary: {
      padding: '12px 24px',
      fontSize: '15px',
      fontWeight: '600',
      color: '#f1f5f9',
      backgroundColor: '#1e1b4b',
      border: '1px solid #312e81',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    buttonDark: {
      padding: '12px 24px',
      fontSize: '15px',
      fontWeight: '600',
      color: '#94a3b8',
      backgroundColor: '#0f0f17',
      border: '1px solid #27273a',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    buttonLogToggle: {
      backgroundColor: 'transparent',
      border: '1px solid #27273a',
      color: '#64748b',
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      cursor: 'pointer',
      marginTop: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'color 0.2s',
    },
    textPanel: {
      backgroundColor: '#0f0f15',
      border: '1px solid #222230',
      borderRadius: '10px',
      padding: '22px',
      lineHeight: '1.7',
      fontSize: '16px',
      color: '#f1f5f9',
      whiteSpace: 'pre-wrap',
      marginBottom: '25px',
    },
    readinessCard: {
      background: '#152b1b',
      border: '1px solid #1e462b',
      borderRadius: '10px',
      padding: '20px',
      textAlign: 'center',
      marginTop: '25px',
    },
    readinessText: {
      color: '#e2e8f0',
      fontSize: '16px',
      fontWeight: '500',
      margin: '0 0 15px 0',
    },
    questionText: {
      fontSize: '18px',
      fontWeight: '500',
      color: '#ffffff',
      fontStyle: 'italic',
      background: '#1e1b30',
      borderLeft: '4px solid #818cf8',
      padding: '20px',
      borderRadius: '6px',
      marginBottom: '20px',
    },
    textarea: {
      width: '100%',
      backgroundColor: '#0a0a0f',
      border: '1px solid #27273a',
      borderRadius: '8px',
      color: '#f8fafc',
      padding: '15px',
      fontSize: '16px',
      lineHeight: '1.5',
      minHeight: '130px',
      resize: 'vertical',
      outline: 'none',
      marginBottom: '20px',
      boxSizing: 'border-box',
    },
    resultGrid: {
      display: 'flex',
      gap: '20px',
      alignItems: 'flex-start',
      marginBottom: '25px',
    },
    gradeBadge: {
      width: '90px',
      height: '90px',
      borderRadius: '50%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontWeight: '800',
      boxShadow: '0 0 20px rgba(0,0,0,0.3)',
      flexShrink: 0,
    },
    gradeLetter: {
      fontSize: '38px',
      margin: 0,
      lineHeight: '1',
    },
    gradeLabel: {
      fontSize: '10px',
      textTransform: 'uppercase',
      marginTop: '2px',
      opacity: '0.8',
    },
    feedbackContent: {
      flex: 1,
      backgroundColor: '#13131c',
      border: '1px solid #27273a',
      borderRadius: '10px',
      padding: '20px',
      lineHeight: '1.6',
      fontSize: '15px',
      color: '#eeeeee',
      whiteSpace: 'pre-wrap',
    },
    errorText: {
      color: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      borderRadius: '8px',
      padding: '12px 18px',
      fontSize: '14px',
      marginBottom: '20px',
    },
    loadingOverlay: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 0',
    },
    spinner: {
      width: '45px',
      height: '45px',
      border: '4px solid rgba(74, 222, 128, 0.1)',
      borderTop: '4px solid #4ade80',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '20px',
    },
    progressBar: {
      display: 'flex',
      justifyContent: 'space-between',
      position: 'relative',
      marginBottom: '35px',
      width: '100%',
    },
    progressStep: {
      flex: 1,
      textAlign: 'center',
      position: 'relative',
      zIndex: 1,
    },
    stepDot: (active, completed) => ({
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: completed ? '#4ade80' : active ? '#38bdf8' : '#1e1e2f',
      border: `2px solid ${completed ? '#4ade80' : active ? '#38bdf8' : '#27273a'}`,
      color: completed ? '#022c22' : '#cbd5e1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 8px auto',
      fontWeight: 'bold',
      fontSize: '14px',
      transition: 'all 0.3s',
      boxShadow: active ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
    }),
    stepLabel: (active) => ({
      fontSize: '12px',
      color: active ? '#f8fafc' : '#64748b',
      fontWeight: active ? '600' : '400',
      transition: 'color 0.3s',
    }),
    progressLine: {
      position: 'absolute',
      top: '16px',
      left: '50px',
      right: '50px',
      height: '2px',
      backgroundColor: '#1e1e2f',
      zIndex: 0,
    },
    progressActiveLine: (step) => {
      let width = '0%';
      if (step === 'summary') width = '33%';
      if (step === 'quiz') width = '66%';
      if (step === 'results') width = '100%';
      return {
        position: 'absolute',
        top: '16px',
        left: '50px',
        width: `calc(${width} - 50px)`,
        height: '2px',
        backgroundColor: '#4ade80',
        zIndex: 0,
        transition: 'width 0.4s ease',
      };
    },
    logsContainer: {
      marginTop: '20px',
      backgroundColor: '#09090d',
      border: '1px solid #1f1f2e',
      borderRadius: '8px',
      padding: '20px',
      boxSizing: 'border-box',
      textAlign: 'left',
    },
    logsTitle: {
      margin: '0 0 10px 0',
      fontSize: '14px',
      color: '#38bdf8',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    logLine: {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#94a3b8',
      margin: '4px 0',
      paddingLeft: '12px',
      borderLeft: '2px solid #27273a',
    }
  };

  // Injection of animation keyframe
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'spin-animation-style';
    style.innerHTML = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('spin-animation-style');
      if (el) el.remove();
    };
  }, []);


  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        
        {/* Header */}
        <header style={styles.header}>
          <h1 style={styles.title}>
            <span>🩺</span> HealthBot AI Patient Education
          </h1>
        </header>

        {/* Stepper Progress */}
        <div style={styles.progressBar}>
          <div style={styles.progressLine} />
          <div style={styles.progressActiveLine(step)} />
          
          <div style={styles.progressStep}>
            <div style={styles.stepDot(step === 'welcome', step !== 'welcome')}>
              {step !== 'welcome' ? '✓' : '1'}
            </div>
            <div style={styles.stepLabel(step === 'welcome')}>Topic Selection</div>
          </div>
          
          <div style={styles.progressStep}>
            <div style={styles.stepDot(step === 'summary', step === 'quiz' || step === 'results')}>
              {step === 'quiz' || step === 'results' ? '✓' : '2'}
            </div>
            <div style={styles.stepLabel(step === 'summary')}>Patient Summary</div>
          </div>

          <div style={styles.progressStep}>
            <div style={styles.stepDot(step === 'quiz', step === 'results')}>
              {step === 'results' ? '✓' : '3'}
            </div>
            <div style={styles.stepLabel(step === 'quiz')}>Comprehension Quiz</div>
          </div>

          <div style={styles.progressStep}>
            <div style={styles.stepDot(step === 'results', false)}>4</div>
            <div style={styles.stepLabel(step === 'results')}>Feedback & Citation</div>
          </div>
        </div>

        {/* Error message */}
        {error && <div style={styles.errorText}>{error}</div>}

        {/* Interactive Dashboard Card */}
        <div style={styles.card}>
          
          {/* Loading state overlay */}
          {loading ? (
            <div style={styles.loadingOverlay}>
              <div style={styles.spinner} />
              <p style={{ margin: 0, fontWeight: '500', color: '#94a3b8' }}>{loadingMsg}</p>
            </div>
          ) : (
            <>
              {/* STEP 1: WELCOME & TOPIC INPUT */}
              {step === 'welcome' && (
                <div>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>🔬 Start Education Session</h3>
                  </div>
                  <p style={{ margin: '0 0 20px 0', lineHeight: '1.6', color: '#94a3b8' }}>
                    Welcome to the MediTech patient system. Type a medical condition or health topic below. HealthBot will query reliable databases and generate a comprehensive patient education package.
                  </p>
                  <form onSubmit={handleStartSession}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>
                      HEALTH TOPIC OF INTEREST
                    </label>
                    <div style={styles.inputGroup}>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma, Celiac Disease"
                        style={styles.input}
                        required
                        autoFocus
                      />
                      <button type="submit" style={styles.buttonPrimary}>
                        Build Package <span>➔</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 2: SUMMARY & QUIZ PROMPT */}
              {step === 'summary' && currentState && (
                <div>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>📖 Patient Summary: <span style={{ color: '#4ade80' }}>{currentState.topic}</span></h3>
                    <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#1e293b', color: '#94a3b8' }}>Gemini Generated</span>
                  </div>

                  <div style={styles.textPanel}>
                    {currentState.summary}
                  </div>

                  <div style={styles.readinessCard}>
                    <h4 style={styles.readinessText}>Test Your Knowledge</h4>
                    <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#94a3b8' }}>
                      Ready to check your understanding? We've generated a brief comprehension quiz for you based on this content.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                      <button onClick={() => handleQuizReadiness(true)} style={styles.buttonPrimary}>
                        Yes, Start Quiz!
                      </button>
                      <button onClick={() => handleReset()} style={styles.buttonDark}>
                        Learn Another Topic
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: COMPREHENSION QUIZ */}
              {step === 'quiz' && currentState && (
                <div>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>❓ Knowledge Check</h3>
                  </div>

                  <p style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#94a3b8' }}>
                    Based ONLY on the summary details you just read, please answer the following question:
                  </p>

                  <div style={styles.questionText}>
                    {currentState.quiz_question}
                  </div>

                  <form onSubmit={handleSubmitAnswer}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>
                      YOUR RESPONSE
                    </label>
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Type your response here. Be as descriptive as possible based on the text..."
                      style={styles.textarea}
                      required
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button type="submit" style={styles.buttonPrimary}>
                        Submit Answer
                      </button>
                      <button type="button" onClick={() => setStep('summary')} style={styles.buttonDark}>
                        ← Back to Summary
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 4: RESULTS & DETAILED CITATIONS */}
              {step === 'results' && currentState && (
                <div>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>🏆 Comprehension Analysis</h3>
                  </div>

                  <div style={styles.resultGrid}>
                    <div style={{
                      ...styles.gradeBadge,
                      backgroundColor: getGradeColor(currentState.grade),
                      color: '#0d0d11',
                    }}>
                      <div style={styles.gradeLetter}>{currentState.grade}</div>
                      <div style={styles.gradeLabel}>Grade</div>
                    </div>
                    
                    <div style={styles.feedbackContent}>
                      <h4 style={{ margin: '0 0 12px 0', color: '#f8fafc', borderBottom: '1px solid #27273a', paddingBottom: '8px' }}>
                        Evaluator Feedback & Medical Citations
                      </h4>
                      {currentState.feedback}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button onClick={handleReset} style={styles.buttonPrimary}>
                      Learn Another Topic
                    </button>
                    <button onClick={() => setStep('summary')} style={styles.buttonDark}>
                      Review Summary
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* LangGraph System Orchestration Logs Toggle */}
          {currentState && currentState.conversation_history && (
            <div>
              <button 
                onClick={() => setShowLogs(!showLogs)} 
                style={styles.buttonLogToggle}
              >
                <span>⚙️</span> {showLogs ? 'Hide System Orchestration Logs' : 'Show System Orchestration Logs'}
              </button>
              
              {showLogs && (
                <div style={styles.logsContainer}>
                  <h4 style={styles.logsTitle}>LangGraph Agent Node Logs</h4>
                  {currentState.conversation_history.map((log, index) => (
                    <div key={index} style={styles.logLine}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
