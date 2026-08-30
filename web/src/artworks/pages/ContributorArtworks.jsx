import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { fetchArtworksByUser } from "../../shared/api/artworks";
import { useHttpClient } from "../../shared/hooks/http-hook";
import { useAuthContext } from "../../shared/context/auth-context";
import { useServerStatusContext } from "../../shared/context/server-context";
import ArtworkGrid from "../components/ArtworkGrid/ArtworkGrid";
import Avatar from "../../shared/components/UIElements/Avatar/Avatar";
import Pagination from "../../shared/components/UIElements/Pagination/Pagination";
import Button from "../../shared/components/FormElements/Button/Button";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import EmptyState from "../../shared/components/UIElements/EmptyState/EmptyState";
import { ArtworkGridSkeleton } from "../../shared/components/UIElements/Skeleton/Skeleton";
import "./ContributorArtworks.scss";

const PAGE_SIZE = 12;

const ContributorArtworks = () => {
  const { userId } = useParams();
  const auth = useAuthContext();
  const { isReady } = useServerStatusContext();
  const { isLoading, error, run, clearError } = useHttpClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;

  const [artworks, setArtworks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [user, setUser] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const isSelf = auth.userId === userId;

  useEffect(() => {
    if (!isReady) return;

    const load = async () => {
      setNotFound(false);
      try {
        const data = await run((options) =>
          fetchArtworksByUser(userId, { ...options, page, limit: PAGE_SIZE })
        );
        setUser(data.user);
        setArtworks(data.artworks);
        setPagination(data.pagination);
      } catch (err) {
        if (err.status === 404) setNotFound(true);
      }
    };
    load();
  }, [run, isReady, userId, page]);

  const handleDeleted = (deletedId) => {
    setArtworks((current) => current.filter((item) => item.id !== deletedId));
    setPagination((current) =>
      current ? { ...current, total: Math.max(0, current.total - 1) } : current
    );
  };

  if (notFound) {
    return (
      <div className="page">
        <EmptyState
          title="No such contributor"
          description="That profile doesn't exist."
          action={<Button to="/contributors">See all contributors</Button>}
        />
      </div>
    );
  }

  const total = pagination?.total ?? 0;
  const showSkeleton = (isLoading || !isReady) && artworks.length === 0;

  return (
    <div className="page">
      <ErrorModal error={error} onClear={clearError} />

      <header className="contributor-header">
        <Avatar
          image={user?.image}
          alt={user?.name || ""}
          className="contributor-header__avatar"
        />
        <div>
          <h1>{isSelf ? "Your finds" : user?.name || "Contributor"}</h1>
          <p>
            {showSkeleton
              ? "Loading…"
              : `${total} ${total === 1 ? "piece" : "pieces"} on the map`}
          </p>
        </div>
        {isSelf && <Button to="/artworks/new">Add a find</Button>}
      </header>

      {showSkeleton && <ArtworkGridSkeleton count={3} />}

      {/*
        An empty result here is a normal state, not an error. The API used to
        return 404 for a contributor with nothing added yet, so every new
        account was greeted with an error dialog on their own profile.
      */}
      {!showSkeleton && artworks.length === 0 && (
        <EmptyState
          title={isSelf ? "You haven't added anything yet" : "Nothing here yet"}
          description={
            isSelf
              ? "Spotted a mural worth sharing? Put it on the map."
              : "This contributor hasn't added any finds so far."
          }
          action={
            isSelf ? (
              <Button to="/artworks/new">Add your first find</Button>
            ) : (
              <Button variant="ghost" to="/">
                Explore the map
              </Button>
            )
          }
        />
      )}

      {artworks.length > 0 && (
        <ArtworkGrid artworks={artworks} onDeleted={handleDeleted} />
      )}

      <Pagination
        pagination={pagination}
        onChange={(next) =>
          setSearchParams(next === 1 ? {} : { page: String(next) }, {
            replace: true,
          })
        }
      />
    </div>
  );
};

export default ContributorArtworks;
