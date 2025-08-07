import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Send as SendIcon,
  Psychology as AdvisingIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

// Styled Components matching your dashboard theme
const AdvisingContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  minHeight: '100vh',
  background: theme.palette.surface?.main || theme.palette.background.default,
}));

const PageHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const ChatContainer = styled(Paper)(({ theme }) => ({
  maxWidth: 800,
  margin: '0 auto',
  height: '70vh',
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.surface?.paper || theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  background: theme.palette.surface?.elevated || theme.palette.background.paper,
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(1),
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}));

const MessageBubble = styled(motion(Box))<{ isUser: boolean }>(({ theme, isUser }) => ({
  display: 'flex',
  justifyContent: isUser ? 'flex-end' : 'flex-start',
  marginBottom: theme.spacing(1),
}));

const MessageContent = styled(Box)<{ isUser: boolean }>(({ theme, isUser }) => ({
  maxWidth: '70%',
  padding: theme.spacing(1.5, 2),
  borderRadius: theme.spacing(2),
  background: isUser 
    ? theme.palette.primary.main 
    : theme.palette.surface?.elevated || theme.palette.action.hover,
  color: isUser 
    ? theme.palette.primary.contrastText 
    : theme.palette.text.primary,
  boxShadow: theme.shadows[1],
}));

const InputContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  gap: theme.spacing(1),
  alignItems: 'flex-end',
}));

const WelcomeCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  textAlign: 'center',
  background: theme.palette.surface?.elevated || theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
}));

// Types
interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

interface ApiResponse {
  agent: string;
  userId: string;
  conversationId: string;
  response: string;
  timestamp: string;
}

const Advising: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TODO: Replace with actual user authentication
  const userId = 'user_ufkkwtqhrzg'; // This should come from your auth system
  
  // Your API endpoint - UPDATE THIS WITH YOUR ACTUAL API URL
  const API_BASE_URL = 'https://lm8ngppg22.execute-api.us-east-1.amazonaws.com/dev';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const callAdvisingAgent = async (message: string): Promise<ApiResponse> => {
    const requestBody = {
      userId,
      message,
      ...(conversationId && { conversationId })
    };

    const response = await fetch(`${API_BASE_URL}/advising`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle both direct response and wrapped response
    if (data.body) {
      return JSON.parse(data.body);
    }
    return data;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await callAdvisingAgent(userMessage.content);
      
      // Update conversation ID if this is the first message
      if (!conversationId) {
        setConversationId(response.conversationId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        isUser: false,
        timestamp: response.timestamp,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error calling advising agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response from advising agent');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  };

  const suggestedQuestions = [
    "What classes should I take next semester?",
    "I'm struggling with my course load. Can you help?",
    "What prerequisites do I need for advanced CS courses?",
    "How can I plan my remaining semesters?",
    "What electives would complement my major?",
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <AdvisingContainer>
      <PageHeader>
        <Typography variant="h4" component="h1">
          Academic Advising Agent
        </Typography>
        <Tooltip title="Clear Conversation">
          <IconButton onClick={clearConversation} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </PageHeader>

      {error && (
        <Alert severity="error" sx={{ mb: 3, maxWidth: 800, margin: '0 auto 24px auto' }}>
          {error}
        </Alert>
      )}

      {messages.length === 0 && (
        <WelcomeCard sx={{ maxWidth: 800, margin: '0 auto 24px auto' }}>
          <AdvisingIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Welcome to your Academic Advisor
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            I'm here to help you with course planning, academic requirements, and degree progress.
            As a Computer Science junior focusing on Software Engineering, I'll provide personalized recommendations.
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Try asking:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
              {suggestedQuestions.slice(0, 3).map((question, index) => (
                <Chip
                  key={index}
                  label={question}
                  variant="outlined"
                  clickable
                  size="small"
                  onClick={() => handleSuggestedQuestion(question)}
                />
              ))}
            </Box>
          </Box>
        </WelcomeCard>
      )}

      <ChatContainer>
        <ChatHeader>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <AdvisingIcon />
          </Avatar>
          <Box>
            <Typography variant="h6">Academic Advisor</Typography>
            <Typography variant="caption" color="text.secondary">
              {conversationId ? `Conversation: ${conversationId.slice(-8)}` : 'Ready to help with your academic planning'}
            </Typography>
          </Box>
        </ChatHeader>

        <MessagesContainer>
          <AnimatePresence>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                isUser={message.isUser}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MessageContent isUser={message.isUser}>
                  <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block', 
                      mt: 0.5, 
                      opacity: 0.7,
                      fontSize: '0.75rem'
                    }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                </MessageContent>
              </MessageBubble>
            ))}
          </AnimatePresence>

          {loading && (
            <MessageBubble isUser={false}>
              <MessageContent isUser={false}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">Thinking...</Typography>
                </Box>
              </MessageContent>
            </MessageBubble>
          )}

          <div ref={messagesEndRef} />
        </MessagesContainer>

        <InputContainer>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about courses, requirements, or academic planning..."
            disabled={loading}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            sx={{ minWidth: 'auto', px: 3 }}
          >
            Send
          </Button>
        </InputContainer>
      </ChatContainer>

      {messages.length > 0 && (
        <Box sx={{ maxWidth: 800, margin: '24px auto 0 auto', textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            All conversations are stored securely and can be referenced in future sessions.
          </Typography>
        </Box>
      )}
    </AdvisingContainer>
  );
};

export default Advising;