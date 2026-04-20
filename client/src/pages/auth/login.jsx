import CommonForm from "@/components/common/form";
import GoogleSignInButton from "@/components/auth/google-signin-button";
import RecaptchaComponent from "@/components/auth/recaptcha";
import { useToast } from "@/components/ui/use-toast";
import { loginFormControls } from "@/config";
import { loginUser } from "@/store/auth-slice";
import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate, useLocation } from "react-router-dom";

const initialState = {
  email: "",
  password: "",
};

function AuthLogin() {
  const [formData, setFormData] = useState(initialState);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [archivedNotice, setArchivedNotice] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(null);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [highlightRecaptcha, setHighlightRecaptcha] = useState(false);
  const recaptchaTimeoutRef = useRef(null);

  const handleRecaptchaVerify = (token) => {
    setRecaptchaToken(token);
    setHighlightRecaptcha(false);
    if (recaptchaTimeoutRef.current) {
      clearTimeout(recaptchaTimeoutRef.current);
      recaptchaTimeoutRef.current = null;
    }
  };

  const triggerRecaptchaHighlight = () => {
    if (recaptchaTimeoutRef.current) {
      clearTimeout(recaptchaTimeoutRef.current);
    }
    setHighlightRecaptcha(true);
    recaptchaTimeoutRef.current = setTimeout(() => {
      setHighlightRecaptcha(false);
      recaptchaTimeoutRef.current = null;
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (recaptchaTimeoutRef.current) {
        clearTimeout(recaptchaTimeoutRef.current);
      }
    };
  }, []);

  function onSubmit(event) {
    event.preventDefault();

    // Check if reCAPTCHA is verified
    if (!recaptchaToken) {
      triggerRecaptchaHighlight();
      toast({
        title: "Please complete the reCAPTCHA verification",
        variant: "destructive",
      });
      return;
    }

    setArchivedNotice("");

    // Include reCAPTCHA token in login data
    const loginData = {
      ...formData,
      recaptchaToken,
    };

    dispatch(loginUser(loginData))
      .unwrap()
      .then((data) => {
        // Check if login was actually successful
        if (!data || !data.success) {
          const errorMessage = data?.message || "Login failed. Please verify your credentials and try again.";
          
          toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }
        
        setArchivedNotice("");
        setLoginSuccess(data);
      })
      .catch((error) => {
        // When using .unwrap(), rejected thunks throw the action
        // The error object structure: { type, payload, ... }
        // payload contains what was passed to rejectWithValue
        
        // Extract error message from various possible structures
        let errorMessage = "Login failed. Please verify your credentials and try again.";
        let statusCode = null;
        let errorCode = null;

        // Try different error structures (order matters - check most specific first)
        if (error?.payload?.message) {
          // From rejectWithValue in Redux Toolkit (most common case)
          errorMessage = error.payload.message;
          statusCode = error.payload.status;
          errorCode = error.payload.code;
        } else if (error?.message) {
          // Direct message property
          errorMessage = error.message;
          statusCode = error.status;
          errorCode = error.code;
        } else if (error?.response?.data?.message) {
          // From axios error response
          errorMessage = error.response.data.message;
          statusCode = error.response.status;
          errorCode = error.response.data.code;
        } else if (error?.payload) {
          // Fallback: payload exists but no message property
          errorMessage = error.payload.message || JSON.stringify(error.payload) || errorMessage;
          statusCode = error.payload.status;
          errorCode = error.payload.code;
        }

        // Handle archived account separately (status 403)
        if (statusCode === 403) {
          const archivedMessage = errorMessage || 
            "This account has been archived. Please contact a superadmin for assistance.";
          setArchivedNotice(archivedMessage);
        }

        // Display error toast with clear message
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 5000, // Show for 5 seconds
        });

        // If user doesn't exist, redirect to registration page
        if (errorCode === "USER_NOT_FOUND") {
          // Redirect to registration page after a short delay to show the error message
          setTimeout(() => {
            navigate("/auth/register?info=from_login&message=" + encodeURIComponent("Please create an account to continue."));
          }, 2000); // 2 second delay to let user see the error message
        }
      });
  }

  // Handle post-login navigation with appropriate message
  useEffect(() => {
    if (loginSuccess) {
      const isFirstLogin = loginSuccess.isFirstLogin;
      const userRole = loginSuccess.user?.role;
      
      // Determine redirect path based on user role
      if (userRole === "admin") {
        // Admin user - redirect to admin dashboard
        navigate("/admin/products");
      } else {
        // Regular user - redirect to shop
        if (isFirstLogin) {
          // First time login - redirect with welcome message
          navigate(
            `/shop/home?success=first_login&message=${encodeURIComponent(
              "Welcome! You've successfully created your account and logged in."
            )}`
          );
        } else {
          // Returning user - redirect with welcome back message
          navigate(
            `/shop/home?success=login&message=${encodeURIComponent(
              "Welcome back! You've logged in successfully."
            )}`
          );
        }
      }
      
      // Reset loginSuccess
      setLoginSuccess(null);
    }
  }, [loginSuccess, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const archivedMessage = params.get("archivedMessage");

    if (archivedMessage) {
      setArchivedNotice(archivedMessage);
      toast({
        title: "Account Archived",
        description: archivedMessage,
        variant: "destructive",
      });
    }
  }, [location.search, toast]);

  return (
    <div className="space-y-8 text-blue-50">
      <div className="text-center space-y-1">
        <p className="text-xs uppercase tracking-[0.35em] text-blue-300/80">
          Secure Access
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Sign in to your account
        </h1>
        <p className="mt-2 text-sm text-blue-200">
          Don't have an account?
          <Link
            className="font-semibold ml-2 text-blue-300 hover:text-blue-200 transition-colors"
            to="/auth/register"
          >
            Register
          </Link>
        </p>
      </div>

      {archivedNotice && (
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 p-4 text-left shadow-sm text-amber-900">
          <p className="text-sm font-semibold tracking-wide uppercase text-amber-700/90">
            Account Archived
          </p>
          <p className="mt-1 text-sm leading-relaxed">{archivedNotice}</p>
        
        </div>
      )}

      {/* Google Sign-in Button */}
      <GoogleSignInButton from="login" />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-blue-800/70" />
        </div>
        <div className="relative flex justify-center text-[10px] tracking-[0.32em] uppercase">
          <span className="bg-[#0a1f3f] px-3 text-blue-300/80">
            Or continue with email
          </span>
        </div>
      </div>

      <CommonForm
        formControls={loginFormControls}
        buttonText={"Login"}
        formData={formData}
        setFormData={setFormData}
        onSubmit={onSubmit}
        beforeSubmitSlot={
          <div
            className={`recaptcha-wrap ${
              highlightRecaptcha ? "recaptcha-attention" : ""
            }`}
          >
            <RecaptchaComponent onVerify={handleRecaptchaVerify} />
          </div>
        }
      />

      {/* Forgot Password Link */}
      <div className="text-right">
        <Link
          to="/auth/forgot-password"
          className="text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors"
        >
          Forgot your password?
        </Link>
      </div>
    </div>
  );
}

export default AuthLogin;
