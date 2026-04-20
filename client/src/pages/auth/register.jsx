import CommonForm from "@/components/common/form";
import GoogleSignInButton from "@/components/auth/google-signin-button";
import RecaptchaComponent from "@/components/auth/recaptcha";
import { useToast } from "@/components/ui/use-toast";
import { registerFormControls } from "@/config";
import { registerUser } from "@/store/auth-slice";
import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 8 characters and include a special character (e.g., !@#$%^&*).";

const initialState = {
  userName: "",
  email: "",
  password: "",
};

function AuthRegister() {
  const [formData, setFormData] = useState(initialState);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
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

  //check if the user is already exist
  function onSubmit(event) {
    event.preventDefault();

    const hasRequiredPasswordLength = formData.password.length >= 8;
    const hasSpecialCharacter = /[^A-Za-z0-9]/.test(formData.password);

    if (!hasRequiredPasswordLength || !hasSpecialCharacter) {
      toast({
        title: PASSWORD_REQUIREMENTS_MESSAGE,
        variant: "destructive",
      });
      return;
    }

    // Check if reCAPTCHA is verified
    if (!recaptchaToken) {
      triggerRecaptchaHighlight();
      toast({
        title: "Please complete the reCAPTCHA verification",
        variant: "destructive",
      });
      return;
    }

    // Include reCAPTCHA token in registration data
    const registrationData = {
      ...formData,
      recaptchaToken,
    };

    dispatch(registerUser(registrationData)).then((data) => {
      if (data?.payload?.success) {
        // User is now automatically logged in, redirect to home with welcome message
        navigate(
          `/shop/home?success=signup&message=${encodeURIComponent(
            "Welcome! Your account has been created successfully."
          )}`
        );
      } else {
        toast({
          title: data?.payload?.message,
          variant: "destructive",
        });
      }
    });
  }

  console.log(formData);

  // Check for info messages (e.g., when redirected from login as new user)
  useEffect(() => {
    const infoType = searchParams.get("info");
    const message = searchParams.get("message");

    if (infoType === "new_user" && message) {
      toast({
        title: decodeURIComponent(message),
        variant: "default",
      });

      // Clean up URL parameters
      setSearchParams({});
    } else if (infoType === "from_login" && message) {
      toast({
        title: "Account Not Found",
        description: decodeURIComponent(message),
        variant: "default",
      });

      // Clean up URL parameters
      setSearchParams({});
    }
  }, [searchParams, toast, setSearchParams]);

  useEffect(() => {
    return () => {
      if (recaptchaTimeoutRef.current) {
        clearTimeout(recaptchaTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-8 text-blue-50">
      <div className="text-center space-y-1">
        <p className="text-xs uppercase tracking-[0.35em] text-blue-300/80">
          Join The Community
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Create a new account
        </h1>
        <p className="mt-2 text-sm text-blue-200">
          Already have an account?
          <Link
            className="font-semibold ml-2 text-blue-300 hover:text-blue-200 transition-colors"
            to="/auth/login"
          >
            Login
          </Link>
        </p>
      </div>

      {/* Google Sign-in Button */}
      <GoogleSignInButton from="register" />

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
        formControls={registerFormControls}
        buttonText={"Register"}
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
    </div>
  );
}

export default AuthRegister;
