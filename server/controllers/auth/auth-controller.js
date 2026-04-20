const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const { verifyRecaptcha } = require("../../helpers/recaptcha");
const { isPasswordStrong } = require("../../helpers/password-validator");

//register
const registerUser = async (req, res) => {
  const { userName, email, password, recaptchaToken } = req.body;

    const EMAIL_REGEX = /^[\w.-]+@[\w.-]*buksu\.edu\.ph$/i;

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please use a valid BUKSU email address",
      });
    }

  try {
    // Verify reCAPTCHA
    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
      return res.status(400).json({
        success: false,
        message: "reCAPTCHA verification failed. Please try again.",
      });
    }

    const checkUser = await User.findOne({ email });
    if (checkUser)
      return res.json({
        success: false,
        message: "User Already exists with the same email! Please try again",
      });

    if (!isPasswordStrong(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and include a special character (e.g., !@#$%^&*).",
      });
    }

    const hashPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      userName,
      email,
      password: hashPassword,
      authProvider: 'local', // Explicitly set for manual registration
    });

    await newUser.save();

    // Automatically log in the user after registration
    const token = jwt.sign(
      {
        id: newUser._id,
        role: newUser.role,
        email: newUser.email,
        userName: newUser.userName,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || "60m" }
    );

    res.cookie("token", token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production",
      sameSite: 'strict',
      maxAge: (process.env.JWT_EXPIRATION || "60m").includes("m") 
        ? parseInt(process.env.JWT_EXPIRATION) * 60 * 1000 
        : 60 * 60 * 1000 // Default 1 hour
    }).json({
      success: true,
      message: "Registration successful",
      user: {
        email: newUser.email,
        role: newUser.role,
        id: newUser._id,
        userName: newUser.userName,
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured",
    });
  }
};

//login
const loginUser = async (req, res) => {
  const { email, password, recaptchaToken } = req.body;

    const EMAIL_REGEX = /^[\w.-]+@[\w.-]*buksu\.edu\.ph$/i;

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please use a valid BUKSU email address",
      });
    }

  try {
    // Verify reCAPTCHA
    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
      return res.status(400).json({
        success: false,
        message: "reCAPTCHA verification failed. Please try again.",
      });
    }

    const checkUser = await User.findOne({ email });
    if (!checkUser)
      return res.status(401).json({
        success: false,
        message: "Account does not exist. Please register first.",
        code: "USER_NOT_FOUND",
      });

    // Prevent archived accounts from logging in
    if (checkUser.isArchived) {
      return res.status(403).json({
        success: false,
        message: "This account has been archived. Please contact a superadmin to regain access.",
      });
    }

    // Check if user registered with Google OAuth
    if (checkUser.authProvider === 'google' && !checkUser.password) {
      return res.status(400).json({
        success: false,
        message: "This account uses Google Sign-In. Please use 'Continue with Google' to login.",
      });
    }

    const checkPasswordMatch = await bcrypt.compare(
      password,
      checkUser.password
    );
    if (!checkPasswordMatch)
      return res.status(401).json({
        success: false,
        message: "Invalid email or password. Please check your credentials and try again.",
      });

    // Check if this is the user's first login
    const isFirstLogin = !checkUser.lastLogin;

    // Update last login time
    checkUser.lastLogin = new Date();
    await checkUser.save();

    const token = jwt.sign(
      {
        id: checkUser._id,
        role: checkUser.role,
        email: checkUser.email,
        userName: checkUser.userName,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || "60m" }
    );

    res.cookie("token", token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production",
      sameSite: 'strict',
      maxAge: (process.env.JWT_EXPIRATION || "60m").includes("m") 
        ? parseInt(process.env.JWT_EXPIRATION) * 60 * 1000 
        : 60 * 60 * 1000 // Default 1 hour
    }).json({
      success: true,
      message: "Logged in successfully",
      isFirstLogin: isFirstLogin, // Pass this to frontend
      user: {
        email: checkUser.email,
        role: checkUser.role,
        id: checkUser._id,
        userName: checkUser.userName,
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured",
    });
  }
};

//logout

const logoutUser = (req, res) => {
  res.clearCookie("token").json({
    success: true,
    message: "Logged out successfully!",
  });
};

//auth middleware
const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token)
    return res.status(401).json({
      success: false,
      message: "Unauthorised user!",
    });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      res.clearCookie("token");
      return res.status(401).json({
        success: false,
        message: "Account not found",
      });
    }

    if (user.isArchived) {
      res.clearCookie("token");
      return res.status(403).json({
        success: false,
        message:
          "This account has been archived. Please contact a superadmin for assistance.",
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      userName: user.userName,
    };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Unauthorised user!",
    });
  }
};

module.exports = { registerUser, loginUser, logoutUser, authMiddleware };
