import React, { useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { CSSTransition } from "react-transition-group";

import Backdrop from "../Backdrop/Backdrop";
import "./Modal.scss";

const ModalDialog = React.forwardRef((props, ref) => {
  const content = (
    <div
      ref={ref}
      className={`modal ${props.wide ? "modal--wide" : ""} ${
        props.className || ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={props.header}
    >
      <header className="modal__header">
        <h2>{props.header}</h2>
      </header>
      <div
        className={`modal__body ${props.flush ? "modal__body--flush" : ""}`}
      >
        {props.children}
      </div>
      {props.footer && <footer className="modal__footer">{props.footer}</footer>}
    </div>
  );

  return ReactDOM.createPortal(content, document.getElementById("modal-root"));
});

const Modal = (props) => {
  const nodeRef = useRef(null);

  const { show, onClose } = props;

  // Escape should close any dialog, not just a click on the backdrop.
  useEffect(() => {
    if (!show) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [show, onClose]);

  // Stop the page behind the dialog from scrolling underneath it.
  useEffect(() => {
    if (!show) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [show]);

  return (
    <>
      {show && <Backdrop onClick={onClose} />}
      <CSSTransition
        in={show}
        mountOnEnter
        unmountOnExit
        timeout={200}
        classNames="modal"
        nodeRef={nodeRef}
      >
        <ModalDialog {...props} ref={nodeRef} />
      </CSSTransition>
    </>
  );
};

export default Modal;
