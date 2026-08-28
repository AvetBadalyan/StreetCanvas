import React from "react";
import { Link } from "react-router-dom";

import Avatar from "../../../shared/components/UIElements/Avatar/Avatar";
import "./ContributorCard.scss";

const ContributorCard = ({ user }) => {
  const count = user.artworks?.length ?? 0;

  return (
    <li className="contributor-card">
      <Link to={`/contributors/${user.id}`}>
        <Avatar
          image={user.image}
          alt={user.name}
          className="contributor-card__avatar"
        />
        <div className="contributor-card__info">
          <h2>{user.name}</h2>
          <p>
            {count} {count === 1 ? "find" : "finds"}
          </p>
        </div>
      </Link>
    </li>
  );
};

export default ContributorCard;
