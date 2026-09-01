import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  VALIDATOR_EMAIL,
  VALIDATOR_MINLENGTH,
  VALIDATOR_REQUIRE,
} from "../../../shared/util/validators";
import { useForm } from "../../../shared/hooks/form-hook";
import { useHttpClient } from "../../../shared/hooks/http-hook";
import { useAuth } from "../../../shared/context/auth-context";
import { login as loginRequest, signup } from "../../../shared/api/users";
import Input from "../../../shared/components/FormElements/Input/Input";
import ImageUpload from "../../../shared/components/FormElements/ImageUpload/ImageUpload";
import Button from "../../../shared/components/FormElements/Button/Button";
import ErrorModal from "../../../shared/components/UIElements/ErrorModal";
import LoadingSpinner from "../../../shared/components/UIElements/LoadingSpinner/LoadingSpinner";
import "./Auth.scss";

// A read-only-ish account seeded by `npm run seed`, so anyone reviewing this
// project can get inside without inventing credentials first.
const DEMO_CREDENTIALS = {
  email: "demo@wanderarmenia.demo",
  password: "demo1234",
};

const Auth = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const { isLoading, error, run, clearError } = useHttpClient();
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [formState, inputHandler, setFormData] = useForm(
    {
      email: { value: "", isValid: false },
      password: { value: "", isValid: false },
    },
    false
  );

  const switchModeHandler = () => {
    if (isLoginMode) {
      setFormData(
        {
          ...formState.inputs,
          name: { value: "", isValid: false },
          image: { value: null, isValid: false },
        },
        false
      );
    } else {
      setFormData(
        { ...formState.inputs, name: undefined, image: undefined },
        formState.inputs.email.isValid && formState.inputs.password.isValid
      );
    }
    setIsLoginMode((mode) => !mode);
  };

  const startSession = (session) => {
    auth.login(
      {
        userId: session.userId,
        name: session.name,
        email: session.email,
        image: session.image,
      },
      session.token
    );
    navigate("/");
  };

  const submitHandler = async (event) => {
    event.preventDefault();

    try {
      if (isLoginMode) {
        const session = await run((options) =>
          loginRequest(
            {
              email: formState.inputs.email.value,
              password: formState.inputs.password.value,
            },
            options
          )
        );
        startSession(session);
      } else {
        const formData = new FormData();
        formData.append("name", formState.inputs.name.value);
        formData.append("email", formState.inputs.email.value);
        formData.append("password", formState.inputs.password.value);
        formData.append("image", formState.inputs.image.value);

        const session = await run((options) => signup(formData, options));
        startSession(session);
      }
    } catch {
      // Surfaced by the error modal.
    }
  };

  const demoLoginHandler = async () => {
    try {
      const session = await run((options) =>
        loginRequest(DEMO_CREDENTIALS, options)
      );
      startSession(session);
    } catch {
      // Surfaced by the error modal.
    }
  };

  return (
    <div className="auth-page">
      <ErrorModal error={error} onClear={clearError} />

      <div className="auth-card">
        {isLoading && <LoadingSpinner asOverlay />}

        <h1>{isLoginMode ? "Welcome back" : "Join Wander Armenia"}</h1>
        <p className="auth-card__subtitle">
          {isLoginMode
            ? "Sign in to save places and add your own."
            : "Create an account to save places and add your own."}
        </p>

        <form onSubmit={submitHandler}>
          {!isLoginMode && (
            <Input
              id="name"
              element="input"
              label="Display name"
              placeholder="Maya Ortega"
              validators={[VALIDATOR_REQUIRE()]}
              errorText="Please enter a name."
              onInput={inputHandler}
            />
          )}

          <Input
            id="email"
            element="input"
            type="email"
            label="Email"
            placeholder="you@example.com"
            validators={[VALIDATOR_EMAIL()]}
            errorText="Please enter a valid email address."
            onInput={inputHandler}
          />

          <Input
            id="password"
            element="input"
            type="password"
            label="Password"
            placeholder="At least 6 characters"
            validators={[VALIDATOR_MINLENGTH(6)]}
            errorText="Passwords need at least 6 characters."
            onInput={inputHandler}
          />

          {!isLoginMode && (
            <ImageUpload
              id="image"
              label="Profile photo"
              hint="Shown next to the places you add."
              onInput={inputHandler}
            />
          )}

          <Button
            type="submit"
            size="large"
            fullWidth
            disabled={!formState.isValid || isLoading}
          >
            {isLoginMode ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="auth-card__divider">
          <span>or</span>
        </div>

        <Button
          variant="secondary"
          fullWidth
          onClick={demoLoginHandler}
          disabled={isLoading}
        >
          Explore with the demo account
        </Button>
        <p className="auth-card__demo-note">
          No sign-up needed - browse and add places as a sample contributor.
        </p>

        <button
          type="button"
          className="auth-card__switch"
          onClick={switchModeHandler}
        >
          {isLoginMode
            ? "Need an account? Sign up"
            : "Already registered? Sign in"}
        </button>
      </div>
    </div>
  );
};

export default Auth;
