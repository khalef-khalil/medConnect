const { logger } = require('../utils/logger');

// In a real implementation, this would use the Dialogflow client library
// For this implementation, we'll simulate Dialogflow responses

// Define common medical intents and responses
const MEDICAL_INTENTS = {
  GREETING: {
    patterns: ['hi', 'hello', 'hey', 'greetings'],
    responses: [
      'Hello! How can I assist you with your healthcare today?',
      'Hi there! Do you have a medical question I can help with?',
      'Greetings! How can MedConnect assist you today?'
    ]
  },
  APPOINTMENT: {
    patterns: ['appointment', 'schedule', 'book', 'visit', 'consultation'],
    responses: [
      'Would you like to schedule a new appointment? You can use our appointment system to find available slots.',
      'We can help you schedule an appointment. What day and time works best for you?',
      'For appointments, please use the appointment scheduling feature or let me know when you would prefer to see the doctor.'
    ]
  },
  SYMPTOMS: {
    patterns: ['symptom', 'pain', 'fever', 'cough', 'headache', 'hurt', 'sick', 'feel', 'unwell'],
    responses: [
      'I understand you are not feeling well. Can you describe your symptoms in more detail so we can better assist you?',
      'I am sorry to hear you are experiencing symptoms. This platform allows you to discuss them securely with your doctor.',
      'Your doctor will need more details about these symptoms. Please describe when they started and their severity.'
    ]
  },
  MEDICATION: {
    patterns: ['medicine', 'drug', 'prescription', 'pill', 'medication', 'refill'],
    responses: [
      'Do you need information about your medication or a prescription refill?',
      'For medication questions, it is best to consult directly with your doctor through our secure messaging.',
      'Your doctor can address medication concerns during your next appointment or via secure message.'
    ]
  },
  EMERGENCY: {
    patterns: ['emergency', 'urgent', 'severe', 'critical', '911', 'ambulance', 'ER', 'help'],
    responses: [
      'If this is a medical emergency, please call 911 or your local emergency number immediately instead of using this platform.',
      'For medical emergencies, please contact emergency services right away by calling 911.',
      'This platform is not designed for emergency care. Please call 911 or go to your nearest emergency room immediately.'
    ]
  },
  INSURANCE: {
    patterns: ['insurance', 'coverage', 'pay', 'cost', 'bill', 'payment'],
    responses: [
      'For insurance and billing questions, please contact our administrative staff through the payment section.',
      'I can help direct you to payment information. Would you like to review your coverage or recent bills?',
      'Insurance questions can be addressed by our administrative team during business hours.'
    ]
  },
  RESULTS: {
    patterns: ['result', 'test', 'lab', 'scan', 'diagnosis', 'report'],
    responses: [
      'Your test results will be reviewed by your doctor and shared with you securely once available.',
      'Test results are typically reviewed and shared by your doctor within 2-3 business days after they are received.',
      'Your doctor will discuss any test results with you during your next appointment or via secure message.'
    ]
  },
  GENERAL_ADVICE: {
    patterns: ['advice', 'help', 'information', 'understand', 'explain', 'what should', 'should I'],
    responses: [
      'I can provide general information, but for personalized medical advice, please consult with your healthcare provider.',
      'Your doctor can provide specific medical guidance for your situation through our secure platform.',
      'General health questions can be discussed during your appointment. Is there something specific you would like to know?'
    ]
  },
  FALLBACK: {
    responses: [
      'I am not quite sure how to help with that. Could you rephrase or provide more details?',
      'That is beyond my current capabilities. Your healthcare provider can address this during your appointment.',
      'I apologize, but I do not have enough information to assist with that. Please message your doctor directly for specific questions.'
    ]
  }
};

/**
 * Detect the intent of a user message and generate a response
 * @param {string} message - The user's message
 * @returns {Promise<Object>} - The detected intent and response
 */
exports.detectIntent = async (message) => {
  try {
    if (!message) {
      return {
        intent: 'FALLBACK',
        response: getRandomResponse(MEDICAL_INTENTS.FALLBACK.responses)
      };
    }
    
    // Normalize message for intent detection
    const normalizedMessage = message.toLowerCase().trim();
    
    // Find matching intent
    for (const [intent, data] of Object.entries(MEDICAL_INTENTS)) {
      // Skip FALLBACK as it's our default
      if (intent === 'FALLBACK') continue;
      
      // Check if message matches any patterns for this intent
      if (data.patterns && data.patterns.some(pattern => normalizedMessage.includes(pattern))) {
        return {
          intent,
          response: getRandomResponse(data.responses)
        };
      }
    }
    
    // If no intent was matched, return fallback
    return {
      intent: 'FALLBACK',
      response: getRandomResponse(MEDICAL_INTENTS.FALLBACK.responses)
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
 * Get a random response from an array of possible responses
 * @param {Array} responses - Array of possible responses
 * @returns {string} - A random response
 */
function getRandomResponse(responses) {
  const index = Math.floor(Math.random() * responses.length);
  return responses[index];
} 