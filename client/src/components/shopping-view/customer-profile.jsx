import { useState, useEffect } from "react";
import CommonForm from "../common/form";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useSelector } from "react-redux";
import { useToast } from "../ui/use-toast";
import { Button } from "../ui/button";

const customerProfileFormControls = [
  {
    label: "Full Name",
    name: "name",
    componentType: "input",
    type: "text",
    placeholder: "Enter your full name",
    disabled: true, // Name is not editable
  },
  {
    label: "Email",
    name: "email",
    componentType: "input",
    type: "email",
    placeholder: "Enter your email",
    disabled: true, // Email is not editable
  },
  {
    label: "Phone Number",
    name: "phone",
    componentType: "input",
    type: "tel",
    placeholder: "Enter your phone number",
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
  {
    label: "Date of Birth",
    name: "dateOfBirth",
    componentType: "input",
    type: "date",
    placeholder: "Select your date of birth",
  },
];

function CustomerProfile() {
  const { user } = useSelector((state) => state.auth);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  // Load customer profile data on mount
  useEffect(() => {
    if (user) {
      // Get saved data from localStorage if exists
      const savedPhone = localStorage.getItem(`customer_phone_${user.id}`) || "";
      const savedGender = localStorage.getItem(`customer_gender_${user.id}`) || "";
      const savedDateOfBirth = localStorage.getItem(`customer_dateOfBirth_${user.id}`) || "";
      
      setFormData({
        name: user.userName || "",
        email: user.email || "",
        phone: savedPhone,
        gender: savedGender,
        dateOfBirth: savedDateOfBirth,
      });
    }
  }, [user]);

  function handleSaveProfile(event) {
    event.preventDefault();

    // Ensure name and email always come from user object (not editable)
    const dataToSave = {
      ...formData,
      name: user?.userName || formData.name,
      email: user?.email || formData.email,
    };

    // Validate form
    if (!dataToSave.name.trim() || !dataToSave.email.trim() || !dataToSave.phone.trim()) {
      toast({
        title: "Please fill in all customer information fields",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dataToSave.email)) {
      toast({
        title: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Phone validation (basic)
    if (dataToSave.phone.trim().length < 10) {
      toast({
        title: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    // Save data to localStorage (since User model doesn't have these fields yet)
    if (user?.id) {
      localStorage.setItem(`customer_phone_${user.id}`, dataToSave.phone);
      if (dataToSave.gender) {
        localStorage.setItem(`customer_gender_${user.id}`, dataToSave.gender);
      }
      if (dataToSave.dateOfBirth) {
        localStorage.setItem(`customer_dateOfBirth_${user.id}`, dataToSave.dateOfBirth);
      }
    }

    // Update formData with the saved data (including name and email from user)
    setFormData(dataToSave);
    setIsEditing(false);
    toast({
      title: "Customer information saved successfully!",
      variant: "success",
    });
  }

  function handleEdit() {
    setIsEditing(true);
  }

  function handleCancel() {
    // Reset to saved values
    const savedPhone = localStorage.getItem(`customer_phone_${user?.id}`) || "";
    const savedGender = localStorage.getItem(`customer_gender_${user?.id}`) || "";
    const savedDateOfBirth = localStorage.getItem(`customer_dateOfBirth_${user?.id}`) || "";
    setFormData({
      name: user?.userName || "",
      email: user?.email || "",
      phone: savedPhone,
      gender: savedGender,
      dateOfBirth: savedDateOfBirth,
    });
    setIsEditing(false);
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
        <CardTitle>Customer Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEditing ? (
          <>
            {/* Display Mode */}
            <div className="space-y-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 sm:gap-4 items-start">
                    <span className="text-sm font-medium text-muted-foreground">Full Name:</span>
                    <span className="text-sm font-semibold break-words">{formData.name}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 sm:gap-4 items-start">
                    <span className="text-sm font-medium text-muted-foreground">Email:</span>
                    <span className="text-sm font-semibold break-words">{formData.email}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 sm:gap-4 items-start">
                    <span className="text-sm font-medium text-muted-foreground">Phone Number:</span>
                    <span className="text-sm font-semibold break-words">{formData.phone || "Not set"}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 sm:gap-4 items-start">
                    <span className="text-sm font-medium text-muted-foreground">Gender:</span>
                    <span className="text-sm font-semibold break-words">
                      {formData.gender 
                        ? formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1).replace(/-/g, " ")
                        : "Not set"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 sm:gap-4 items-start">
                    <span className="text-sm font-medium text-muted-foreground">Date of Birth:</span>
                    <span className="text-sm font-semibold break-words">
                      {formData.dateOfBirth 
                        ? new Date(formData.dateOfBirth).toLocaleDateString()
                        : "Not set"}
                    </span>
                  </div>
                </div>
              </div>
              <Button onClick={handleEdit} className="w-full">
                Edit Profile
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Edit Mode */}
            <CommonForm
              formControls={customerProfileFormControls}
              formData={formData}
              setFormData={setFormData}
              buttonText="Save Changes"
              onSubmit={handleSaveProfile}
              isBtnDisabled={!isFormValid()}
            />
            <Button
              variant="outline"
              onClick={handleCancel}
              className="w-full mt-2"
            >
              Cancel
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default CustomerProfile; 