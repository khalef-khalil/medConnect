const { logger } = require('../utils/logger');
const dialogflow = require('@google-cloud/dialogflow');
const { v4: uuidv4 } = require('uuid');
const { struct } = require('pb-util');

// Cache for Dialogflow sessions to maintain context
const sessionCache = new Map();

/**
 * Create or retrieve a Dialogflow session
 * @param {string} userId - User ID
 * @returns {string} - Dialogflow session ID
 */
function getDialogflowSession(userId) {
  if (!sessionCache.has(userId)) {
    // Create a new session with a unique ID
    const sessionId = `medconnect-${userId}-${uuidv4()}`;
    sessionCache.set(userId, sessionId);
    return sessionId;
  }
  
  return sessionCache.get(userId);
}

/**
 * Initialize the Dialogflow client
 * @returns {Object} - The Dialogflow session client
 */
function createDialogflowClient() {
  // Create a new session client
  const sessionClient = new dialogflow.SessionsClient({
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
    projectId: process.env.DIALOGFLOW_PROJECT_ID
  });
  
  return sessionClient;
}

/**
 * Detect the intent of a user message and generate a response using Dialogflow
 * @param {string} message - The user's message
 * @param {string} userId - The user's ID
 * @param {Object} [context] - Optional context data for Dialogflow
 * @returns {Promise<Object>} - The detected intent and response
 */
exports.detectIntent = async (message, userId, context = {}) => {
  try {
    if (!message) {
      return {
        intent: 'FALLBACK',
        response: 'I didn\'t receive any message. How can I help you?'
      };
    }
    
    // Get or create a session ID for this user
    const sessionId = getDialogflowSession(userId);
    
    // Initialize the Dialogflow client
    const sessionClient = createDialogflowClient();
    
    // Format the session path
    const sessionPath = sessionClient.projectAgentSessionPath(
      process.env.DIALOGFLOW_PROJECT_ID,
      sessionId
    );
    
    // Prepare the request for Dialogflow
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
          languageCode: 'en-US',
        },
      },
    };
    
    // Add any context parameters if provided
    if (Object.keys(context).length > 0) {
      request.queryParams = {
        payload: struct.encode(context)
      };
    }
    
    logger.info(`Sending message to Dialogflow: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}" for user ${userId}`);
    
    // Send the request to Dialogflow
    const [response] = await sessionClient.detectIntent(request);
    
    // Extract the detected intent
    const result = response.queryResult;
    const intentName = result.intent ? result.intent.displayName : 'FALLBACK';
    const intentConfidence = result.intentDetectionConfidence;
    
    logger.info(`Dialogflow intent detected: ${intentName} (confidence: ${intentConfidence})`);
    
    // Extract parameters
    const parameters = struct.decode(result.parameters);
    
    // Extract fulfillment messages
    let responseMessages = [];
    if (result.fulfillmentMessages && result.fulfillmentMessages.length > 0) {
      for (const msg of result.fulfillmentMessages) {
        if (msg.text && msg.text.text && msg.text.text.length > 0) {
          responseMessages = responseMessages.concat(msg.text.text);
        }
      }
    }
    
    // If no fulfillment messages, use the fulfillment text
    if (responseMessages.length === 0 && result.fulfillmentText) {
      responseMessages.push(result.fulfillmentText);
    }
    
    // Get a single response message
    const responseMessage = getResponseMessage(responseMessages);
    
    // Check for custom payloads
    let payload = null;
    if (result.fulfillmentMessages) {
      for (const msg of result.fulfillmentMessages) {
        if (msg.payload) {
          payload = struct.decode(msg.payload);
          break;
        }
      }
    }
    
    // Return the response
    return {
      intent: intentName,
      intentConfidence,
      response: responseMessage,
      parameters,
      payload,
      queryText: result.queryText,
      allResponses: responseMessages,
      fulfillmentText: result.fulfillmentText,
      // Only include diagnostics in development
      diagnostics: process.env.NODE_ENV === 'development' ? {
        sessionId,
        languageCode: result.languageCode,
        intentDetected: !!result.intent,
        allIntents: result.allRequiredParamsPresent
      } : undefined
    };
  } catch (error) {
    logger.error('Error in detectIntent function:', error);
    
    // Return error response
    return {
      intent: 'ERROR',
      response: 'I apologize, but I am having trouble processing your request right now. Please try again later or contact your healthcare provider directly.'
    };
  }
};

/**
 * Get a response message from an array of possible responses
 * @param {Array} responses - Array of possible responses
 * @returns {string} - A response message
 */
function getResponseMessage(responses) {
  if (!responses || responses.length === 0) {
    return 'I apologize, but I don\'t have a response for that.';
  }
  
  // If only one response, return it
  if (responses.length === 1) {
    return responses[0];
  }
  
  // Otherwise, get a random response
  const index = Math.floor(Math.random() * responses.length);
  return responses[index];
}

/**
 * Create a context for a follow-up query
 * @param {string} intentName - Name of the intent to target
 * @param {Object} parameters - Parameters to include
 * @returns {Object} - Context object for Dialogflow
 */
exports.createContext = (intentName, parameters = {}) => {
  return {
    intentName,
    parameters
  };
};

/**
 * Clear the session for a user
 * @param {string} userId - The user's ID
 */
exports.clearSession = (userId) => {
  if (sessionCache.has(userId)) {
    sessionCache.delete(userId);
    logger.info(`Cleared Dialogflow session for user ${userId}`);
  }
};

/**
 * Get healthcare-specific intents that may require special handling
 * @param {string} intent - The detected intent name
 * @returns {Object} - Information about the intent
 */
exports.getHealthcareIntentInfo = (intent) => {
  const medicalIntents = {
    'medical.symptoms': {
      category: 'MEDICAL',
      priority: 'MEDIUM',
      requiresFollowUp: true
    },
    'medical.emergency': {
      category: 'MEDICAL',
      priority: 'HIGH',
      requiresFollowUp: true,
      emergencyContact: true
    },
    'appointment.schedule': {
      category: 'ADMINISTRATIVE',
      priority: 'LOW',
      redirectToAppointmentSystem: true
    },
    'appointment.reschedule': {
      category: 'ADMINISTRATIVE',
      priority: 'LOW',
      redirectToAppointmentSystem: true
    },
    'payment.info': {
      category: 'ADMINISTRATIVE',
      priority: 'LOW',
      redirectToPaymentSystem: true
    }
  };
  
  return medicalIntents[intent] || {
    category: 'GENERAL',
    priority: 'LOW',
    requiresFollowUp: false
  };
}; 