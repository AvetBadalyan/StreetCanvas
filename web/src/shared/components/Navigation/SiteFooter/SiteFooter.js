import React from "react";

import "./SiteFooter.scss";

const SiteFooter = () => (
  <footer className="site-footer">
    <div className="site-footer__inner">
      <p>
        <strong>StreetCanvas</strong> — a crowd-mapped atlas of street art.
        Built with React, Node, Express and MongoDB.
      </p>
      <nav>
        <a
          href="https://github.com/AvetBadalyan/MERN-practice-frontend"
          target="_blank"
          rel="noreferrer"
        >
          Frontend
        </a>
        <a
          href="https://github.com/AvetBadalyan/MERN-practice-backend"
          target="_blank"
          rel="noreferrer"
        >
          API
        </a>
      </nav>
    </div>
  </footer>
);

export default SiteFooter;
