const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const conversationController = require('../controllers/conversation.controller');

// Get all conversations for the logged in user
router.get('/conversations', verifyToken, conversationController.getConversations);

// Get all messages in a conversation
router.get('/conversations/:conversationId', verifyToken, conversationController.getMessages);

// Create a new conversation (check if users can message each other)
router.post('/conversations', verifyToken, conversationController.createConversation);

// Send a message via REST API
router.post('/messages', verifyToken, conversationController.sendMessage);

// Mark messages as read
router.put('/messages/read', verifyToken, conversationController.markAsRead);

module.exports = router; 