import React, { useState, useEffect } from "react";

import { fetchContributors } from "../../shared/api/users";
import { useHttpClient } from "../../shared/hooks/http-hook";
import { useServerStatusContext } from "../../shared/context/server-context";
import ContributorCard from "../components/ContributorCard/ContributorCard";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import LoadingSpinner from "../../shared/components/UIElements/LoadingSpinner/LoadingSpinner";
import EmptyState from "../../shared/components/UIElements/EmptyState/EmptyState";
import Button from "../../shared/components/FormElements/Button/Button";
import "./Contributors.scss";

const Contributors = () => {
  const { isReady } = useServerStatusContext();
  const { isLoading, error, run, clearError } = useHttpClient();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!isReady) return;

    const load = async () => {
      try {
        const data = await run((options) => fetchContributors(options));
        setUsers(data.users);
      } catch {
        // Surfaced by the modal.
      }
    };
    load();
  }, [run, isReady]);

  return (
    <div className="page">
      <ErrorModal error={error} onClear={clearError} />

      <header className="page__header">
        <h1>Contributors</h1>
        <p>The people putting street art on the map.</p>
      </header>

      {(isLoading || !isReady) && (
        <div className="center" style={{ padding: "3rem" }}>
          <LoadingSpinner />
        </div>
      )}

      {isReady && !isLoading && users.length === 0 && (
        <EmptyState
          title="No contributors yet"
          description="Sign up and you'll be the first."
          action={<Button to="/auth">Create an account</Button>}
        />
      )}

      {users.length > 0 && (
        <ul className="contributors-list">
          {users.map((user) => (
            <ContributorCard key={user.id} user={user} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default Contributors;
