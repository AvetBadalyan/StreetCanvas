import React from "react";
import { Link } from "react-router-dom";

import "./Button.scss";

/**
 * Renders as a <button>, a react-router <Link> or a plain <a> depending on the
 * props, so callers never have to restyle a link to look like a button.
 */
const Button = ({
  variant = "primary",
  size = "medium",
  fullWidth = false,
  className = "",
  children,
  to,
  href,
  ...rest
}) => {
  const classes = [
    "button",
    `button--${variant}`,
    `button--${size}`,
    fullWidth ? "button--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
};

export default Button;
