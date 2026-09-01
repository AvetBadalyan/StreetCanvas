import { useCallback, useReducer } from "react";

const formReducer = (state, action) => {
  switch (action.type) {
    case "INPUT_CHANGE": {
      let isValid = true;
      for (const inputId in state.inputs) {
        if (!state.inputs[inputId]) {
          continue;
        }
        if (inputId === action.inputId) {
          isValid = isValid && action.isValid;
        } else {
          isValid = isValid && state.inputs[inputId].isValid;
        }
      }
      return {
        ...state,
        inputs: {
          ...state.inputs,
          [action.inputId]: { value: action.value, isValid: action.isValid },
        },
        isValid,
      };
    }
    // Replaces the whole input set, which is what Auth needs when it swaps
    // between the login and signup fields.
    case "REPLACE_INPUTS":
      return {
        inputs: action.inputs,
        isValid: action.isValid,
      };
    default:
      return state;
  }
};

export const useForm = (initialInputs, initialIsValid) => {
  const [formState, dispatch] = useReducer(formReducer, {
    inputs: initialInputs,
    isValid: initialIsValid,
  });

  const inputHandler = useCallback((id, value, isValid) => {
    dispatch({ type: "INPUT_CHANGE", inputId: id, value, isValid });
  }, []);

  const setFormData = useCallback((inputs, isValid) => {
    dispatch({ type: "REPLACE_INPUTS", inputs, isValid });
  }, []);

  return [formState, inputHandler, setFormData];
};
