import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";

function CommonForm({
  formControls,
  formData,
  setFormData,
  onSubmit,
  buttonText,
  isBtnDisabled,
  beforeSubmitSlot,
  isLoading,
  loadingText,
}) {
  // Track password visibility for each password field
  const [passwordVisibility, setPasswordVisibility] = useState({});

  const togglePasswordVisibility = (fieldName) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  function renderInputsByComponentType(getControlItem) {
    let element = null;
    const value = formData[getControlItem.name] || "";
    const isFieldDisabled = Boolean(getControlItem.disabled);
    const isFieldReadOnly = Boolean(getControlItem.readOnly);
    const isPasswordField = getControlItem.type === "password";
    const isPasswordVisible = passwordVisibility[getControlItem.name];

    switch (getControlItem.componentType) {
      case "input":
        element = (
          <div className="relative">
            <Input
              name={getControlItem.name}
              placeholder={getControlItem.placeholder}
              id={getControlItem.name}
              type={isPasswordField && isPasswordVisible ? "text" : getControlItem.type}
              value={value}
              onChange={(event) => {
                let inputValue = event.target.value;
                
                // For phone fields, only allow numbers
                if (getControlItem.name === "phone" || getControlItem.type === "tel") {
                  inputValue = inputValue.replace(/[^0-9]/g, "");
                }
                
                setFormData({
                  ...formData,
                  [getControlItem.name]: inputValue,
                })
              }}
              className={isPasswordField ? "pr-10" : ""}
              required={getControlItem.required}
              disabled={isFieldDisabled}
              readOnly={isFieldReadOnly}
              pattern={getControlItem.pattern || ""}
              inputMode={getControlItem.type === "tel" ? "numeric" : ""}
            />
            {isPasswordField && (
              <button
                type="button"
                onClick={() => togglePasswordVisibility(getControlItem.name)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
              >
                {isPasswordVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        );

        break;
      case "select":
        element = (
          <Select
            disabled={isFieldDisabled}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                [getControlItem.name]: value,
              })
            }
            value={value}
            required={getControlItem.required}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={getControlItem.label} />
            </SelectTrigger>
            <SelectContent>
              {getControlItem.options && getControlItem.options.length > 0
                ? getControlItem.options.map((optionItem) => (
                    <SelectItem key={optionItem.id} value={optionItem.id}>
                      {optionItem.label}
                    </SelectItem>
                  ))
                : null}
            </SelectContent>
          </Select>
        );

        break;
      case "textarea":
        element = (
            <Textarea
              name={getControlItem.name}
              placeholder={getControlItem.placeholder}
              id={getControlItem.id}
              value={value}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  [getControlItem.name]: event.target.value,
                })
              }
              disabled={isFieldDisabled}
              readOnly={isFieldReadOnly}
            />
        );

        break;

      default:
        element = (
          <div className="relative">
            <Input
              name={getControlItem.name}
              placeholder={getControlItem.placeholder}
              id={getControlItem.name}
              type={isPasswordField && isPasswordVisible ? "text" : getControlItem.type}
              value={value}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  [getControlItem.name]: event.target.value,
                })
              }
              className={isPasswordField ? "pr-10" : ""}
              required={getControlItem.required}
              disabled={isFieldDisabled}
              readOnly={isFieldReadOnly}
            />
            {isPasswordField && (
              <button
                type="button"
                onClick={() => togglePasswordVisibility(getControlItem.name)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
              >
                {isPasswordVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        );
        break;
    }

    return element;
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex flex-col gap-3">
        {formControls.map((controlItem) => (
          <div className="grid w-full gap-1.5" key={controlItem.name}>
            <Label className="mb-1">
              {controlItem.label}
              {controlItem.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {renderInputsByComponentType(controlItem)}
            {controlItem.helperText ? (
              <p className="text-xs text-muted-foreground">{controlItem.helperText}</p>
            ) : null}
          </div>
        ))}
      </div>
      {beforeSubmitSlot ? <div className="mt-4">{beforeSubmitSlot}</div> : null}
      <Button
        disabled={isBtnDisabled || isLoading}
        type="submit"
        className="mt-4 w-full flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText || "Processing..."}</span>
          </>
        ) : (
          buttonText || "Submit"
        )}
      </Button>
    </form>
  );
}

export default CommonForm;
