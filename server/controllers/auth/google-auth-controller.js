const jwt = require("jsonwebtoken");
const { verifyRecaptcha } = require("../../helpers/recaptcha");

// Google OAuth Success Handler
const googleAuthSuccess = (req, res) => {
  try {
    const user = req.user;
    const fromPage = req.fromPage || "register"; // Get the origin page

    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=authentication_failed`);
    }

    const EMAIL_REGEX = /^[\w.-]+@[\w.-]*buksu\.edu\.ph$/i;

    if (!EMAIL_REGEX.test(user.email)) {
      const errorMessage = encodeURIComponent("Please use a valid BUKSU email address");
      return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=${errorMessage}`);
    }

    if (user.isArchived) {
      const archivedMessage = encodeURIComponent(
        "This account has been archived. Please contact a superadmin to regain access."
      );
      return res.redirect(
        `${process.env.CLIENT_URL}/auth/login?archivedMessage=${archivedMessage}`
      );
    }

    // Check if new user tried to login instead of register
    if (user.isNewUser && fromPage === "login") {
      // New user came from login page - redirect them to register
      return res.redirect(
        `${process.env.CLIENT_URL}/auth/register?info=new_user&message=You don't have an account yet. Please register with Google to continue.`
      );
    }

    // Generate a TEMPORARY token (short expiration for verification page)
    const tempToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        userName: user.userName,
        isNewUser: user.isNewUser,
        isLinked: user.isLinked,
      },
      process.env.JWT_SECRET,
      { expiresIn: "10m" } // Short expiration - only for verification
    );

    // Determine user type for frontend message
    const userType = user.isNewUser ? "signup" : "login";

    // Redirect to verification page with temporary token
    const redirectUrl = `${process.env.CLIENT_URL}/auth/google-verify?token=${tempToken}&type=${userType}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google Auth Success Error:", error);
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=server_error`);
  }
};

// Google OAuth Failure Handler
const googleAuthFailure = (req, res) => {
  res.redirect(`${process.env.CLIENT_URL}/auth/login?error=google_auth_failed`);
};

// Verify reCAPTCHA and Complete Google OAuth
const verifyGoogleRecaptcha = async (req, res) => {
  try {
    const { tempToken, recaptchaToken } = req.body;

    if (!tempToken || !recaptchaToken) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Verify reCAPTCHA
    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
      return res.status(400).json({
        success: false,
        message: "reCAPTCHA verification failed. Please try again.",
      });
    }

    // Verify and decode temporary token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired verification token. Please login again.",
      });
    }

    // Generate final authentication token
    const finalToken = jwt.sign(
      {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
        userName: decoded.userName,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || "60m" }
    );

    // Set authentication cookie
    res.cookie("token", finalToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    // Return success
    res.json({
      success: true,
      message: "Verification successful",
      user: {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
        userName: decoded.userName,
      },
    });
  } catch (error) {
    console.error("reCAPTCHA Verification Error:", error);
    res.status(500).json({
      success: false,
      message: "Verification failed. Please try again.",
    });
  }
};

module.exports = {
  googleAuthSuccess,
  googleAuthFailure,
  verifyGoogleRecaptcha,
};

