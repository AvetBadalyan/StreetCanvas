import React from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../../../context/auth-context";
import Avatar from "../../UIElements/Avatar/Avatar";
import "./NavLinks.scss";

const NavLinks = () => {
  const auth = useAuth();

  return (
    <ul className="nav-links">
      <li>
        <NavLink to="/" end>
          Explore
        </NavLink>
      </li>
      <li>
        <NavLink to="/contributors">Contributors</NavLink>
      </li>

      {auth.isLoggedIn ? (
        <>
          <li>
            <NavLink to="/saved">My places</NavLink>
          </li>
          <li>
            <NavLink to="/places/new" className="nav-links__cta">
              Add a place
            </NavLink>
          </li>
          <li className="nav-links__account">
            <Avatar
              image={auth.user?.image}
              alt={auth.user?.name || "You"}
              className="nav-links__avatar"
            />
            <button type="button" onClick={auth.logout}>
              Sign out
            </button>
          </li>
        </>
      ) : (
        <li>
          <NavLink to="/auth" className="nav-links__cta">
            Sign in
          </NavLink>
        </li>
      )}

    </ul>
  );
};

export default NavLinks;
