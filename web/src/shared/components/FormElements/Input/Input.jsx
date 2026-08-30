import React, { useReducer, useEffect, useId } from "react";

import { validate } from "../../../util/validators";
import "./Input.scss";

const inputReducer = (state, action) => {
  switch (action.type) {
    case "CHANGE":
      return {
        ...state,
        value: action.val,
        isValid: validate(action.val, action.validators),
      };
    case "TOUCH":
      return { ...state, isTouched: true };
    default:
      return state;
  }
};

/**
 * Self-validating field. Owns its own value and validity, and reports both up
 * through `onInput` so `useForm` can track whether the whole form is valid.
 */
const Input = ({
  id,
  element = "input",
  type = "text",
  label,
  hint,
  placeholder,
  rows = 4,
  options = [],
  validators = [],
  errorText,
  initialValue = "",
  initialValid = false,
  onInput,
}) => {
  const [inputState, dispatch] = useReducer(inputReducer, {
    value: initialValue,
    isTouched: false,
    isValid: initialValid,
  });

  const { value, isValid } = inputState;
  const generatedId = useId();
  const fieldId = id || generatedId;
  const describedBy = `${fieldId}-help`;

  useEffect(() => {
    onInput(id, value, isValid);
  }, [id, value, isValid, onInput]);

  const changeHandler = (event) =>
    dispatch({ type: "CHANGE", val: event.target.value, validators });

  const touchHandler = () => dispatch({ type: "TOUCH" });

  // Only complain once the field has been visited, so a pristine form is not a
  // wall of red on first render.
  const showError = !inputState.isValid && inputState.isTouched;

  const shared = {
    id: fieldId,
    value,
    onChange: changeHandler,
    onBlur: touchHandler,
    "aria-invalid": showError,
    "aria-describedby": hint || showError ? describedBy : undefined,
  };

  let control;
  if (element === "textarea") {
    control = <textarea rows={rows} placeholder={placeholder} {...shared} />;
  } else if (element === "select") {
    control = (
      <select {...shared}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else {
    control = <input type={type} placeholder={placeholder} {...shared} />;
  }

  return (
    <div className={`field ${showError ? "field--invalid" : ""}`}>
      <label className="field__label" htmlFor={fieldId}>
        {label}
      </label>
      {control}
      <p className="field__help" id={describedBy}>
        {showError ? errorText : hint}
      </p>
    </div>
  );
};

export default Input;
