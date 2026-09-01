import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

import NavLinks from "../NavLink/NavLinks";
import SideDrawer from "../SideDrawer/SideDrawer";
import Backdrop from "../../UIElements/Backdrop/Backdrop";
import ThemeToggle from "../../UIElements/ThemeToggle/ThemeToggle";
import "./MainNavigation.scss";

const MainNavigation = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();

  // Navigating from inside the drawer should close it, otherwise it stays open
  // over the page the visitor just asked for.
  useEffect(() => setIsDrawerOpen(false), [location.pathname]);

  return (
    <>
      {isDrawerOpen && <Backdrop onClick={() => setIsDrawerOpen(false)} />}

      <SideDrawer show={isDrawerOpen} onClick={() => setIsDrawerOpen(false)}>
        <nav className="main-nav__drawer">
          <NavLinks />
        </nav>
      </SideDrawer>

      <header className="main-header">
        <div className="main-header__inner">
          <button
            className="main-nav__menu-btn"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={isDrawerOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <Link className="main-nav__brand" to="/">
            <span className="main-nav__mark" aria-hidden="true">
              WA
            </span>
            <span className="main-nav__wordmark">
              Wander<strong>Armenia</strong>
            </span>
          </Link>

          <nav className="main-nav__desktop">
            <NavLinks />
          </nav>

          <ThemeToggle />
        </div>
      </header>
    </>
  );
};

export default MainNavigation;
