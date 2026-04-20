import { useState, useEffect, useRef, useMemo } from "react";
import CommonForm from "../common/form";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useSelector } from "react-redux";
import { useToast } from "../ui/use-toast";

function CustomerInfo({ customerInfo, setCustomerInfo, onFormDataChange }) {
  const [formData, setFormData] = useState({
    name: customerInfo?.name || "",
    email: customerInfo?.email || "",
    phone: customerInfo?.phone || "",
    gender: customerInfo?.gender || "",
  });
  const [isSaveDisabled, setIsSaveDisabled] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const { toast } = useToast();
  const isInternalUpdate = useRef(false);

  // Create form controls dynamically - name and email are always disabled
  const customerInfoFormControls = useMemo(() => [
  {
    label: "Full Name",
    name: "name",
    componentType: "input",
    type: "text",
    placeholder: "Enter your full name",
    required: true,
      disabled: true, // Name is not editable
  },
  {
    label: "Email",
    name: "email",
    componentType: "input",
    type: "email",
    placeholder: "Enter your email",
    required: true,
      disabled: true, // Email is not editable
  },
  {
    label: "Phone Number",
    name: "phone",
    componentType: "input",
    type: "tel",
    placeholder: "Enter your phone number",
    required: true,
    pattern: "[0-9]*",
  },
  {
    label: "Gender",
    name: "gender",
    componentType: "select",
    placeholder: "Select your gender",
    options: [
      { id: "male", label: "Male" },
      { id: "female", label: "Female" },
      { id: "prefer-not-to-say", label: "Prefer not to say" },
    ],
  },
  ], []);

  // Pre-fill with user info if available
  useEffect(() => {
    if (user && !customerInfo) {
      // Get saved data from localStorage if exists
      const savedPhone = localStorage.getItem(`customer_phone_${user.id}`) || "";
      const savedGender = localStorage.getItem(`customer_gender_${user.id}`) || "";
      const initialData = {
        name: user.userName || "",
        email: user.email || "",
        phone: savedPhone,
        gender: savedGender,
      };
      setFormData(initialData);
      setCustomerInfo(initialData);
      // Notify parent of form data change
      if (onFormDataChange) {
        onFormDataChange(initialData);
      }
    }
  }, [user]);

  // Sync formData when customerInfo changes externally (not from auto-save)
  useEffect(() => {
    // Skip if this update came from our internal auto-save
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    // Only sync if customerInfo exists and differs from formData
    if (customerInfo && (
      customerInfo.name !== formData.name || 
      customerInfo.email !== formData.email || 
      customerInfo.phone !== formData.phone ||
      customerInfo.gender !== formData.gender
    )) {
      setFormData({
        name: customerInfo.name || "",
        email: customerInfo.email || "",
        phone: customerInfo.phone || "",
        gender: customerInfo.gender || "",
      });
    }
  }, [customerInfo]);

  // Auto-save formData to parent whenever it changes (debounced approach)
  useEffect(() => {
    // Only save if at least one field has value
    if (formData.name || formData.email || formData.phone) {
      const timeoutId = setTimeout(() => {
        isInternalUpdate.current = true;
        // Ensure name and email always come from user object (not editable)
        const dataToSave = {
          ...formData,
          name: user?.userName || formData.name,
          email: user?.email || formData.email,
        };
        setCustomerInfo(dataToSave);
        // Save data to localStorage for customer profile
        if (user?.id) {
          if (formData.phone) {
            localStorage.setItem(`customer_phone_${user.id}`, formData.phone);
          }
          if (formData.gender) {
            localStorage.setItem(`customer_gender_${user.id}`, formData.gender);
          }
        }
        // Notify parent of form data change for real-time updates
        if (onFormDataChange) {
          onFormDataChange(dataToSave);
        }
      }, 300); // Debounce for 300ms to avoid too many updates

      return () => clearTimeout(timeoutId);
    }
  }, [formData, setCustomerInfo, onFormDataChange, user]);

  function handleCustomerInfoChange() {
    // Validate form - phone is required
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast({
        title: "Please fill in all required fields (Name, Email, and Phone Number)",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Phone validation - required and must be at least 10 digits
    const phoneRegex = /^[0-9]{10,}$/;
    const cleanedPhone = formData.phone.replace(/\D/g, ''); // Remove non-digits
    if (!cleanedPhone || cleanedPhone.length < 10) {
      toast({
        title: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setCustomerInfo(formData);
    toast({
      title: "Customer information saved",
      variant: "success",
    });
    
    // Temporarily disable the save button for 2 seconds
    setIsSaveDisabled(true);
    setTimeout(() => {
      setIsSaveDisabled(false);
    }, 2000);
  }

  function isFormValid() {
    return (
      formData.name.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.phone.trim() !== ""
      // Gender and dateOfBirth are optional
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CommonForm
          formControls={customerInfoFormControls}
          formData={formData}
          setFormData={setFormData}
          buttonText="Save Information"
          onSubmit={(e) => {
            e.preventDefault();
            handleCustomerInfoChange();
          }}
          isBtnDisabled={!isFormValid() || isSaveDisabled}
        />
        {formData && (formData.name || formData.email || formData.phone) && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">Entered Information:</h3>
            {formData.name && (
              <p className="text-sm">
                <strong>Name:</strong> {formData.name}
              </p>
            )}
            {formData.email && (
              <p className="text-sm">
                <strong>Email:</strong> {formData.email}
              </p>
            )}
            {formData.phone && (
              <p className="text-sm">
                <strong>Phone:</strong> {formData.phone}
              </p>
            )}
            {formData.gender && (
              <p className="text-sm">
                <strong>Gender:</strong> {formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1).replace(/-/g, " ")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CustomerInfo;
