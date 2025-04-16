const { v4: uuidv4 } = require('uuid');
const { dynamoDB, s3, TABLES, S3_CONFIG } = require('../config/aws');
const { logger } = require('../utils/logger');
const { 
  generateToken, 
  hashPassword, 
  comparePassword 
} = require('../services/auth.service');
const { uploadBase64File } = require('../services/file.service');

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    logger.info('Registration request received:', JSON.stringify(req.body));
    
    const { firstName, lastName, email, password, role = 'patient' } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      logger.warn('Registration failed: Missing required fields', { 
        hasFirstName: !!firstName, 
        hasLastName: !!lastName, 
        hasEmail: !!email, 
        hasPassword: !!password 
      });
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate role
    const validRoles = ['patient', 'doctor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be patient, doctor, or admin' });
    }

    // Check if user already exists
    const userParams = {
      TableName: TABLES.USERS,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase()
      }
    };

    const existingUser = await dynamoDB.scan(userParams).promise();
    if (existingUser.Items && existingUser.Items.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const userId = uuidv4();
    const newUser = {
      userId,
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true
    };

    await dynamoDB.put({
      TableName: TABLES.USERS,
      Item: newUser
    }).promise();

    // Create JWT token
    const token = generateToken({ userId, email, role });

    // Return user data without password
    const { password: _, ...userData } = newUser;
    
    res.status(201).json({
      message: 'User registered successfully',
      user: userData,
      token
    });
  } catch (error) {
    logger.error('Error in register function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    logger.info('Login request received:', JSON.stringify(req.body));
    
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      logger.warn('Login failed: Missing required fields', {
        hasEmail: !!email,
        hasPassword: !!password
      });
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const userParams = {
      TableName: TABLES.USERS,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase()
      }
    };

    const result = await dynamoDB.scan(userParams).promise();
    
    if (!result.Items || result.Items.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.Items[0];

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is disabled. Please contact support.' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = generateToken({ 
      userId: user.userId, 
      email: user.email, 
      role: user.role 
    });

    // Return user data without password
    const { password: _, ...userData } = user;
    
    res.status(200).json({
      message: 'Login successful',
      user: userData,
      token
    });
  } catch (error) {
    logger.error('Error in login function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Initiate forgot password process
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const userParams = {
      TableName: TABLES.USERS,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase()
      }
    };

    const result = await dynamoDB.scan(userParams).promise();
    
    // Even if user not found, return success to prevent email enumeration
    if (!result.Items || result.Items.length === 0) {
      return res.status(200).json({ 
        message: 'If an account with that email exists, a password reset link will be sent.' 
      });
    }

    const user = result.Items[0];

    // Generate reset token
    const resetToken = uuidv4();
    const resetExpires = Date.now() + 3600000; // 1 hour

    // Store reset token in user record
    await dynamoDB.update({
      TableName: TABLES.USERS,
      Key: { userId: user.userId },
      UpdateExpression: 'set resetToken = :resetToken, resetExpires = :resetExpires',
      ExpressionAttributeValues: {
        ':resetToken': resetToken,
        ':resetExpires': resetExpires
      }
    }).promise();

    // Note: Email functionality not implemented as specified
    // In a real app, we would send an email with the reset token/link here

    res.status(200).json({ 
      message: 'If an account with that email exists, a password reset link will be sent.' 
    });
  } catch (error) {
    logger.error('Error in forgotPassword function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Reset password with token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Find user with this reset token
    const userParams = {
      TableName: TABLES.USERS,
      FilterExpression: 'resetToken = :resetToken',
      ExpressionAttributeValues: {
        ':resetToken': token
      }
    };

    const result = await dynamoDB.scan(userParams).promise();
    
    if (!result.Items || result.Items.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const user = result.Items[0];

    // Check if token is expired
    if (!user.resetExpires || user.resetExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user with new password and clear reset token
    await dynamoDB.update({
      TableName: TABLES.USERS,
      Key: { userId: user.userId },
      UpdateExpression: 'set password = :password, resetToken = :resetToken, resetExpires = :resetExpires, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':password': hashedPassword,
        ':resetToken': null,
        ':resetExpires': null,
        ':updatedAt': Date.now()
      }
    }).promise();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    logger.error('Error in resetPassword function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    // User ID comes from JWT token via middleware
    const { userId } = req.user;

    const params = {
      TableName: TABLES.USERS,
      Key: { userId }
    };

    const result = await dynamoDB.get(params).promise();
    
    if (!result.Item) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user data without password
    const { password, resetToken, resetExpires, ...userData } = result.Item;
    
    res.status(200).json({ user: userData });
  } catch (error) {
    logger.error('Error in getProfile function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    // User ID comes from JWT token via middleware
    const { userId } = req.user;
    const { firstName, lastName, phone, specialization } = req.body;

    // Build update expression dynamically based on what fields are provided
    let updateExpression = 'set updatedAt = :updatedAt';
    const expressionAttributeValues = {
      ':updatedAt': Date.now()
    };

    if (firstName) {
      updateExpression += ', firstName = :firstName';
      expressionAttributeValues[':firstName'] = firstName;
    }
    
    if (lastName) {
      updateExpression += ', lastName = :lastName';
      expressionAttributeValues[':lastName'] = lastName;
    }
    
    if (phone) {
      updateExpression += ', phone = :phone';
      expressionAttributeValues[':phone'] = phone;
    }
    
    // Add support for specialization field (for doctors)
    if (specialization !== undefined) {
      updateExpression += ', specialization = :specialization';
      expressionAttributeValues[':specialization'] = specialization;
    }

    const params = {
      TableName: TABLES.USERS,
      Key: { userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDB.update(params).promise();
    
    if (!result.Attributes) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return updated user data without password
    const { password, resetToken, resetExpires, ...userData } = result.Attributes;
    
    res.status(200).json({ 
      message: 'Profile updated successfully',
      user: userData 
    });
  } catch (error) {
    logger.error('Error in updateProfile function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Upload profile image
 */
exports.uploadProfileImage = async (req, res) => {
  try {
    // User ID comes from JWT token via middleware
    const { userId } = req.user;
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ message: 'Image data is required' });
    }

    // Upload image using file service
    const fileName = `${userId}_${Date.now()}`;
    const imageUrl = await uploadBase64File(
      imageBase64, 
      fileName, 
      S3_CONFIG.PREFIXES.PROFILES
    );

    // Update user with profile image URL
    const params = {
      TableName: TABLES.USERS,
      Key: { userId },
      UpdateExpression: 'set profileImage = :profileImage, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':profileImage': imageUrl,
        ':updatedAt': Date.now()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDB.update(params).promise();

    // Return updated user data
    const { password, resetToken, resetExpires, ...userData } = result.Attributes;

    res.status(200).json({
      message: 'Profile image uploaded successfully',
      user: userData
    });
  } catch (error) {
    logger.error('Error in uploadProfileImage function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin-only functions below

/**
 * Get all users (admin only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const params = {
      TableName: TABLES.USERS
    };

    const result = await dynamoDB.scan(params).promise();
    
    // Remove sensitive data from each user
    const users = result.Items.map(user => {
      const { password, resetToken, resetExpires, ...userData } = user;
      return userData;
    });
    
    res.status(200).json({ users });
  } catch (error) {
    logger.error('Error in getAllUsers function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create new user (admin only)
 */
exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const userParams = {
      TableName: TABLES.USERS,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase()
      }
    };

    const existingUser = await dynamoDB.scan(userParams).promise();
    if (existingUser.Items && existingUser.Items.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const userId = uuidv4();
    const newUser = {
      userId,
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true
    };

    await dynamoDB.put({
      TableName: TABLES.USERS,
      Item: newUser
    }).promise();

    // Return user data without password
    const { password: _, ...userData } = newUser;
    
    res.status(201).json({
      message: 'User created successfully',
      user: userData
    });
  } catch (error) {
    logger.error('Error in createUser function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user by ID (admin only)
 */
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const params = {
      TableName: TABLES.USERS,
      Key: { userId }
    };

    const result = await dynamoDB.get(params).promise();
    
    if (!result.Item) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user data without password
    const { password, resetToken, resetExpires, ...userData } = result.Item;
    
    res.status(200).json({ user: userData });
  } catch (error) {
    logger.error('Error in getUserById function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update user (admin only)
 */
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, role, isActive } = req.body;

    // Build update expression dynamically based on what fields are provided
    let updateExpression = 'set updatedAt = :updatedAt';
    const expressionAttributeValues = {
      ':updatedAt': Date.now()
    };

    if (firstName) {
      updateExpression += ', firstName = :firstName';
      expressionAttributeValues[':firstName'] = firstName;
    }
    
    if (lastName) {
      updateExpression += ', lastName = :lastName';
      expressionAttributeValues[':lastName'] = lastName;
    }
    
    if (email) {
      updateExpression += ', email = :email';
      expressionAttributeValues[':email'] = email.toLowerCase();
    }
    
    if (role) {
      updateExpression += ', role = :role';
      expressionAttributeValues[':role'] = role;
    }
    
    if (isActive !== undefined) {
      updateExpression += ', isActive = :isActive';
      expressionAttributeValues[':isActive'] = isActive;
    }

    const params = {
      TableName: TABLES.USERS,
      Key: { userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDB.update(params).promise();
    
    if (!result.Attributes) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return updated user data without password
    const { password, resetToken, resetExpires, ...userData } = result.Attributes;
    
    res.status(200).json({ 
      message: 'User updated successfully',
      user: userData 
    });
  } catch (error) {
    logger.error('Error in updateUser function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete user (admin only)
 */
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists before deleting
    const userParams = {
      TableName: TABLES.USERS,
      Key: { userId }
    };

    const userResult = await dynamoDB.get(userParams).promise();
    
    if (!userResult.Item) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user
    await dynamoDB.delete(userParams).promise();
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Error in deleteUser function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all doctors
 */
exports.getDoctors = async (req, res) => {
  try {
    const { specialization } = req.query;
    
    // Use ExpressionAttributeNames to handle reserved keywords
    let filterExpression = '#userRole = :roleValue';
    let expressionAttributeValues = {
      ':roleValue': 'doctor'
    };
    
    // Define attribute names to handle reserved keywords
    let expressionAttributeNames = {
      '#userRole': 'role'
    };
    
    // If specialization is provided, add it to the filter
    if (specialization && specialization !== 'All') {
      filterExpression += ' and specialization = :specialization';
      expressionAttributeValues[':specialization'] = specialization;
    }
    
    const params = {
      TableName: TABLES.USERS,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    };
    
    const result = await dynamoDB.scan(params).promise();
    
    // Remove sensitive data from each doctor
    const doctors = result.Items.map(doctor => {
      const { password, resetToken, resetExpires, ...doctorData } = doctor;
      return doctorData;
    });
    
    res.status(200).json({ users: doctors });
  } catch (error) {
    logger.error('Error in getDoctors function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get doctor by ID
 */
exports.getDoctorById = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const params = {
      TableName: TABLES.USERS,
      Key: { userId: doctorId }
    };

    const result = await dynamoDB.get(params).promise();
    
    if (!result.Item) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if the user is actually a doctor
    if (result.Item.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Return doctor data without sensitive information
    const { password, resetToken, resetExpires, ...doctorData } = result.Item;
    
    res.status(200).json({ user: doctorData });
  } catch (error) {
    logger.error('Error in getDoctorById function:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 