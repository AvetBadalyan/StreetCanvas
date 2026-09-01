import React from "react";

import Modal from "./Modal/Modal";
import Button from "../FormElements/Button/Button";

const ErrorModal = ({ error, onClear, onRetry }) => (
  <Modal
    show={!!error}
    onClose={onClear}
    header="That didn't work"
    footer={
      <>
        {onRetry && (
          <Button variant="ghost" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Button onClick={onClear}>Dismiss</Button>
      </>
    }
  >
    <p>{error}</p>
  </Modal>
);

export default ErrorModal;
