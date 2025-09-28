import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, RotateCcw, FileText, Calendar, CreditCard as Edit3, HelpCircle, Upload, Home, Settings, Menu, X } from 'lucide-react';

// Types
interface Note {
  id: string;
  content: string;
  timestamp: Date;
}

interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  completed: boolean;
}

interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  response: string;
}

// Speech Recognition Hook
const useSpeechRecognition = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setIsSupported(true);
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
  };
};

// Text-to-Speech Hook
const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      setVoices(speechSynthesis.getVoices());
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Try to use a clear, natural voice
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Natural') || 
        voice.name.includes('Enhanced') ||
        voice.lang.startsWith('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthesis.speak(utterance);
    }
  };

  const stop = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return { speak, stop, isSpeaking };
};

function App() {
  const [currentView, setCurrentView] = useState<'home' | 'voice' | 'tasks' | 'notes' | 'ocr' | 'settings'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    response: ''
  });
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newReminder, setNewReminder] = useState({ title: '', description: '', dueDate: '' });

  const { isSupported, isListening, transcript, startListening, stopListening } = useSpeechRecognition();
  const { speak, stop, isSpeaking } = useTextToSpeech();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle voice commands
  useEffect(() => {
    if (transcript && !isListening) {
      handleVoiceCommand(transcript);
    }
  }, [transcript, isListening]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.ctrlKey) {
        e.preventDefault();
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isListening, startListening, stopListening]);

  const handleVoiceCommand = async (command: string) => {
    setVoiceState(prev => ({ ...prev, isProcessing: true, transcript: command }));
    
    const lowerCommand = command.toLowerCase();
    let response = '';

    if (lowerCommand.includes('add reminder') || lowerCommand.includes('remind me')) {
      const reminderText = command.replace(/add reminder|remind me/i, '').trim();
      if (reminderText) {
        const newReminder: Reminder = {
          id: Date.now().toString(),
          title: reminderText,
          description: '',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          completed: false
        };
        setReminders(prev => [...prev, newReminder]);
        response = `Reminder added: ${reminderText}`;
      } else {
        response = 'Please specify what you want to be reminded about.';
      }
    } else if (lowerCommand.includes('take note') || lowerCommand.includes('add note')) {
      const noteText = command.replace(/take note|add note/i, '').trim();
      if (noteText) {
        const newNote: Note = {
          id: Date.now().toString(),
          content: noteText,
          timestamp: new Date()
        };
        setNotes(prev => [...prev, newNote]);
        response = `Note saved: ${noteText}`;
      } else {
        response = 'Please specify what note you want to save.';
      }
    } else if (lowerCommand.includes('what time') || lowerCommand.includes('current time')) {
      const now = new Date();
      response = `The current time is ${now.toLocaleTimeString()}`;
    } else if (lowerCommand.includes('what date') || lowerCommand.includes('today')) {
      const today = new Date();
      response = `Today is ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    } else if (lowerCommand.includes('my reminders') || lowerCommand.includes('upcoming reminders')) {
      const upcomingReminders = reminders.filter(r => !r.completed && r.dueDate > new Date());
      if (upcomingReminders.length > 0) {
        response = `You have ${upcomingReminders.length} upcoming reminders: ${upcomingReminders.map(r => r.title).join(', ')}`;
      } else {
        response = 'You have no upcoming reminders.';
      }
    } else if (lowerCommand.includes('my notes') || lowerCommand.includes('read notes')) {
      if (notes.length > 0) {
        response = `You have ${notes.length} notes. Latest note: ${notes[notes.length - 1].content}`;
      } else {
        response = 'You have no saved notes.';
      }
    } else if (lowerCommand.includes('help') || lowerCommand.includes('what can you do')) {
      response = 'I can help you with reminders, notes, reading text from images, telling time and date, and answering questions. Try saying "add reminder", "take note", or "what time is it".';
    } else {
      // General AI response
      response = `I heard you say: "${command}". I'm here to help with reminders, notes, reading text, and answering questions. What would you like me to do?`;
    }

    setVoiceState(prev => ({ 
      ...prev, 
      response, 
      isProcessing: false 
    }));

    // Speak the response
    speak(response);
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setCurrentView('voice');
      startListening();
      speak('Listening. How can I help you?');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      // Simulate OCR processing
      setVoiceState(prev => ({ ...prev, isProcessing: true }));
      
      // In a real app, you'd use an OCR service like Tesseract.js or Google Vision API
      setTimeout(() => {
        const mockText = "This is sample text extracted from the image. In a production app, this would be the actual OCR result.";
        setVoiceState(prev => ({
          ...prev,
          response: mockText,
          isProcessing: false
        }));
        speak(mockText);
      }, 2000);
    }
  };

  const addNote = () => {
    if (newNote.trim()) {
      const note: Note = {
        id: Date.now().toString(),
        content: newNote,
        timestamp: new Date()
      };
      setNotes(prev => [...prev, note]);
      setNewNote('');
      speak('Note added successfully');
    }
  };

  const addReminder = () => {
    if (newReminder.title.trim()) {
      const reminder: Reminder = {
        id: Date.now().toString(),
        title: newReminder.title,
        description: newReminder.description,
        dueDate: new Date(newReminder.dueDate || Date.now() + 24 * 60 * 60 * 1000),
        completed: false
      };
      setReminders(prev => [...prev, reminder]);
      setNewReminder({ title: '', description: '', dueDate: '' });
      speak('Reminder added successfully');
    }
  };

  const Navigation = () => (
    <nav className="bg-gray-900 border-b border-gray-800" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-purple-400">Guidelight</h1>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {[
                { id: 'home', label: 'Home', icon: Home },
                { id: 'voice', label: 'Voice', icon: Mic },
                { id: 'tasks', label: 'Tasks', icon: Calendar },
                { id: 'notes', label: 'Notes', icon: Edit3 },
                { id: 'ocr', label: 'Read Text', icon: FileText },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setCurrentView(id as any)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    currentView === id
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                  aria-label={label}
                  aria-current={currentView === id ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4 inline mr-2" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded="false"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'voice', label: 'Voice', icon: Mic },
              { id: 'tasks', label: 'Tasks', icon: Calendar },
              { id: 'notes', label: 'Notes', icon: Edit3 },
              { id: 'ocr', label: 'Read Text', icon: FileText },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setCurrentView(id as any);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  currentView === id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                aria-current={currentView === id ? 'page' : undefined}
              >
                <Icon className="w-5 h-5 inline mr-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );

  const HomeView = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          Guidelight: Your <span className="text-purple-400">Voice-First</span> Digital Guide
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Empowering visually impaired users with AI-powered accessibility and daily task support.
        </p>
        <button
          onClick={() => setCurrentView('voice')}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          aria-label="Get started with voice commands"
        >
          Get Started
        </button>
        <div className="mt-6 text-sm text-gray-400">
          Voice-activated • Screen reader optimized • High contrast interface
        </div>
      </div>

      {/* Quick Access Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {[
          {
            title: 'Voice Command Center',
            description: 'Tap the microphone or say "Hey Guidelight" to begin',
            icon: Mic,
            action: () => setCurrentView('voice')
          },
          {
            title: 'Read Text Aloud (OCR)',
            description: 'Instantly convert any text from images into clear, natural speech',
            icon: FileText,
            action: () => setCurrentView('ocr')
          },
          {
            title: 'Voice-powered Scheduling',
            description: 'Create, modify, and manage your calendar events using simple voice commands',
            icon: Calendar,
            action: () => setCurrentView('tasks')
          },
          {
            title: 'Smart Note Taking',
            description: 'Capture thoughts, ideas, and important information through voice',
            icon: Edit3,
            action: () => setCurrentView('notes')
          }
        ].map((feature, index) => (
          <button
            key={index}
            onClick={feature.action}
            className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-left hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label={`Access ${feature.title}`}
          >
            <div className="flex items-center mb-4">
              <div className="bg-purple-600 p-3 rounded-lg mr-4">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
            </div>
            <p className="text-gray-300">{feature.description}</p>
          </button>
        ))}
      </div>

      {/* Central Microphone Button */}
      <div className="text-center">
        <button
          onClick={handleMicClick}
          className={`w-32 h-32 rounded-full flex items-center justify-center text-white text-3xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-offset-4 focus:ring-offset-gray-900 ${
            isListening 
              ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
              : 'bg-purple-600 hover:bg-purple-700 hover:scale-105'
          }`}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          disabled={!isSupported}
        >
          {isListening ? <MicOff /> : <Mic />}
        </button>
        <p className="mt-4 text-gray-300">
          {isListening ? 'Listening...' : 'Tap or say "Hey Guidelight" to begin'}
        </p>
        {!isSupported && (
          <p className="mt-2 text-red-400 text-sm">
            Speech recognition not supported in this browser
          </p>
        )}
      </div>
    </div>
  );

  const VoiceView = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">Voice Command Center</h2>
        <p className="text-gray-300">Tap the microphone or say "Hey Guidelight" to begin</p>
      </div>

      {/* Main Microphone Button */}
      <div className="text-center mb-8">
        <button
          onClick={handleMicClick}
          className={`w-40 h-40 rounded-full flex items-center justify-center text-white text-4xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-offset-4 focus:ring-offset-gray-900 ${
            isListening 
              ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
              : voiceState.isProcessing
              ? 'bg-yellow-600 animate-spin'
              : 'bg-purple-600 hover:bg-purple-700 hover:scale-105'
          }`}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          disabled={!isSupported || voiceState.isProcessing}
        >
          {voiceState.isProcessing ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          ) : isListening ? (
            <MicOff />
          ) : (
            <Mic />
          )}
        </button>
        <p className="mt-4 text-gray-300 text-lg">
          {voiceState.isProcessing 
            ? 'Processing...' 
            : isListening 
            ? 'Listening...' 
            : 'Tap or say "Hey Guidelight" to begin'
          }
        </p>
      </div>

      {/* Transcript and Response */}
      {(voiceState.transcript || voiceState.response) && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          {voiceState.transcript && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-purple-400 mb-2">You said:</h3>
              <p className="text-white text-lg" aria-live="polite">
                "{voiceState.transcript}"
              </p>
            </div>
          )}
          
          {voiceState.response && (
            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-2">Guidelight responds:</h3>
              <p className="text-white text-lg mb-4" aria-live="polite">
                {voiceState.response}
              </p>
              
              {/* Audio Controls */}
              <div className="flex gap-4">
                <button
                  onClick={() => speak(voiceState.response)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="Play response"
                  disabled={isSpeaking}
                >
                  <Play className="w-4 h-4" />
                  {isSpeaking ? 'Playing...' : 'Play'}
                </button>
                
                <button
                  onClick={() => speak(voiceState.response)}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  aria-label="Repeat response"
                >
                  <RotateCcw className="w-4 h-4" />
                  Repeat
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keyboard Shortcut Info */}
      <div className="text-center text-gray-400 text-sm">
        Keyboard shortcut: Press <kbd className="bg-gray-700 px-2 py-1 rounded">Ctrl</kbd> + <kbd className="bg-gray-700 px-2 py-1 rounded">Space</kbd> to toggle voice input
      </div>
    </div>
  );

  const TasksView = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-white mb-8">Task Management</h2>
      
      {/* Add New Reminder */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Add New Reminder</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="reminder-title" className="block text-sm font-medium text-gray-300 mb-2">
              Title
            </label>
            <input
              id="reminder-title"
              type="text"
              value={newReminder.title}
              onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="What do you want to be reminded about?"
              aria-describedby="reminder-title-help"
            />
            <p id="reminder-title-help" className="text-sm text-gray-400 mt-1">
              Or use voice command: "Add reminder [your reminder]"
            </p>
          </div>
          
          <div>
            <label htmlFor="reminder-description" className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="reminder-description"
              value={newReminder.description}
              onChange={(e) => setNewReminder(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              placeholder="Additional details..."
            />
          </div>
          
          <div>
            <label htmlFor="reminder-date" className="block text-sm font-medium text-gray-300 mb-2">
              Due Date
            </label>
            <input
              id="reminder-date"
              type="datetime-local"
              value={newReminder.dueDate}
              onChange={(e) => setNewReminder(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <button
            onClick={addReminder}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Add reminder"
          >
            Add Reminder
          </button>
        </div>
      </div>

      {/* Reminders List */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Your Reminders</h3>
        {reminders.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No reminders yet. Add one above or use voice command "Add reminder [your reminder]"
          </p>
        ) : (
          <div className="space-y-4">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`border rounded-lg p-4 ${
                  reminder.completed 
                    ? 'border-green-600 bg-green-900/20' 
                    : 'border-gray-600 bg-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className={`font-semibold text-lg ${
                      reminder.completed ? 'text-green-400 line-through' : 'text-white'
                    }`}>
                      {reminder.title}
                    </h4>
                    {reminder.description && (
                      <p className="text-gray-300 mt-1">{reminder.description}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-2">
                      Due: {reminder.dueDate.toLocaleDateString()} at {reminder.dueDate.toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setReminders(prev => 
                        prev.map(r => 
                          r.id === reminder.id 
                            ? { ...r, completed: !r.completed }
                            : r
                        )
                      );
                      speak(reminder.completed ? 'Reminder unmarked' : 'Reminder completed');
                    }}
                    className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                      reminder.completed
                        ? 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500'
                        : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                    }`}
                    aria-label={reminder.completed ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {reminder.completed ? 'Undo' : 'Complete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const NotesView = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-white mb-8">Smart Notes</h2>
      
      {/* Add New Note */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Add New Note</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="new-note" className="block text-sm font-medium text-gray-300 mb-2">
              Note Content
            </label>
            <textarea
              id="new-note"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={4}
              placeholder="Type your note here or use voice command 'Take note [your note]'"
              aria-describedby="note-help"
            />
            <p id="note-help" className="text-sm text-gray-400 mt-1">
              Or use voice command: "Take note [your note content]"
            </p>
          </div>
          
          <button
            onClick={addNote}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Save note"
          >
            Save Note
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Your Notes</h3>
        {notes.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No notes yet. Add one above or use voice command "Take note [your note]"
          </p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="border border-gray-600 rounded-lg p-4 bg-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white text-lg mb-2">{note.content}</p>
                    <p className="text-sm text-gray-400">
                      Created: {note.timestamp.toLocaleDateString()} at {note.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <button
                      onClick={() => speak(note.content)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                      aria-label="Read note aloud"
                      disabled={isSpeaking}
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setNotes(prev => prev.filter(n => n.id !== note.id));
                        speak('Note deleted');
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                      aria-label="Delete note"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const OCRView = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-white mb-8">Read Text Aloud (OCR)</h2>
      
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Upload Image</h3>
        <p className="text-gray-300 mb-6">
          Upload an image containing text, and I'll read it aloud for you. Supports photos of documents, signs, menus, and more.
        </p>
        
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="image-upload"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center gap-3"
            aria-label="Upload image to read text"
            disabled={voiceState.isProcessing}
          >
            <Upload className="w-6 h-6" />
            {voiceState.isProcessing ? 'Processing Image...' : 'Choose Image to Read'}
          </button>
          
          <p className="text-sm text-gray-400 text-center">
            Supported formats: JPG, PNG, GIF, WebP
          </p>
        </div>
      </div>

      {/* OCR Results */}
      {voiceState.response && currentView === 'ocr' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Extracted Text</h3>
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <p className="text-white text-lg leading-relaxed" aria-live="polite">
              {voiceState.response}
            </p>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => speak(voiceState.response)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Read text aloud"
              disabled={isSpeaking}
            >
              <Play className="w-4 h-4" />
              {isSpeaking ? 'Reading...' : 'Read Aloud'}
            </button>
            
            <button
              onClick={() => {
                navigator.clipboard.writeText(voiceState.response);
                speak('Text copied to clipboard');
              }}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Copy text to clipboard"
            >
              <FileText className="w-4 h-4" />
              Copy Text
            </button>
          </div>
        </div>
      )}
      
      {voiceState.isProcessing && (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Processing image and extracting text...</p>
          <p className="text-gray-400 text-sm mt-2">This may take a few moments</p>
        </div>
      )}
    </div>
  );

  const SettingsView = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-white mb-8">Settings</h2>
      
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Accessibility</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-white font-medium">High Contrast Mode</label>
                <p className="text-gray-400 text-sm">Enhanced visual contrast for better readability</p>
              </div>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500">
                Enabled
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-white font-medium">Large Text</label>
                <p className="text-gray-400 text-sm">Increase text size for better visibility</p>
              </div>
              <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500">
                Disabled
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-white font-medium">Screen Reader Announcements</label>
                <p className="text-gray-400 text-sm">Enhanced screen reader compatibility</p>
              </div>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500">
                Enabled
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Voice Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">Speech Rate</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                defaultValue="0.9"
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label="Speech rate"
              />
              <div className="flex justify-between text-sm text-gray-400 mt-1">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>
            
            <div>
              <label className="block text-white font-medium mb-2">Voice Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                defaultValue="1"
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label="Voice volume"
              />
              <div className="flex justify-between text-sm text-gray-400 mt-1">
                <span>Quiet</span>
                <span>Loud</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Keyboard Shortcuts</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white">Toggle Voice Input</span>
              <kbd className="bg-gray-700 px-3 py-1 rounded text-gray-300">Ctrl + Space</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white">Stop Speech</span>
              <kbd className="bg-gray-700 px-3 py-1 rounded text-gray-300">Esc</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white">Navigate to Home</span>
              <kbd className="bg-gray-700 px-3 py-1 rounded text-gray-300">Alt + H</kbd>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">About Guidelight</h3>
          <p className="text-gray-300 mb-4">
            Guidelight is an AI-powered digital assistant designed specifically for visually impaired users. 
            Our mission is to provide accessible, voice-first technology that empowers independence and productivity.
          </p>
          <div className="text-sm text-gray-400">
            <p>Version 1.0.0</p>
            <p>Built with accessibility and usability in mind</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;
      case 'voice':
        return <VoiceView />;
      case 'tasks':
        return <TasksView />;
      case 'notes':
        return <NotesView />;
      case 'ocr':
        return <OCRView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900" style={{ backgroundColor: '#101010' }}>
      <Navigation />
      <main role="main" className="pb-8">
        {renderCurrentView()}
      </main>
      
      {/* Screen Reader Only Content */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isListening && "Voice input is active"}
        {voiceState.isProcessing && "Processing your request"}
        {isSpeaking && "Speaking response"}
      </div>
    </div>
  );
}

export default App;