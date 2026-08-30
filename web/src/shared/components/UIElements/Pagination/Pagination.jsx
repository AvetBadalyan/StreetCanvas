import React from "react";

import Button from "../../FormElements/Button/Button";
import "./Pagination.scss";

/**
 * Previous/next controls for a paginated list. Renders nothing when everything
 * already fits on one page.
 */
const Pagination = ({ pagination, onChange }) => {
  if (!pagination || pagination.pages <= 1) return null;

  const { page, pages, hasMore } = pagination;

  const goTo = (next) => {
    onChange(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="pagination" aria-label="Pagination">
      <Button
        variant="ghost"
        size="small"
        disabled={page <= 1}
        onClick={() => goTo(page - 1)}
      >
        Previous
      </Button>
      <span>
        Page {page} of {pages}
      </span>
      <Button
        variant="ghost"
        size="small"
        disabled={!hasMore}
        onClick={() => goTo(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
};

export default Pagination;
