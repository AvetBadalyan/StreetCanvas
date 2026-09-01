import React from "react";
import { Link } from "react-router-dom";

import Avatar from "../../../shared/components/UIElements/Avatar/Avatar";
import "./ContributorCard.scss";

const ContributorCard = ({ user }) => {
  const placeCount = user.places?.length ?? 0;

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
            {placeCount} {placeCount === 1 ? "place" : "places"}
          </p>
        </div>
      </Link>
    </li>
  );
};

export default ContributorCard;
