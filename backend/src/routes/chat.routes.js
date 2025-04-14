const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All chat routes require authentication
router.use(authMiddleware.verifyToken);

// Get all conversations for the current user
router.get('/', chatController.getConversations);

// Create a new conversation
router.post('/', chatController.createConversation);

// Get messages for a specific conversation
router.get('/:conversationId/messages', chatController.getMessages);

// Send a new message in a conversation
router.post('/:conversationId/messages', chatController.sendMessage);

// Mark messages as read
router.put('/:conversationId/read', chatController.markMessagesAsRead);

// Get AI response to a message
router.post('/:conversationId/ai-response', chatController.getAIResponse);

module.exports = router; 