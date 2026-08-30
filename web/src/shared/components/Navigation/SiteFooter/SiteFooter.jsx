import React from "react";

import "./SiteFooter.scss";

const SiteFooter = () => (
  <footer className="site-footer">
    <div className="site-footer__inner">
      <p>
        <strong>StreetCanvas</strong> — an atlas of public art. Built with
        React, Node, Express and MongoDB.
        <br />
        Catalogue data from{" "}
        <a href="https://www.wikidata.org" target="_blank" rel="noreferrer">
          Wikidata
        </a>{" "}
        (CC0), photographs from{" "}
        <a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer">
          Wikimedia Commons
        </a>
        .
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
