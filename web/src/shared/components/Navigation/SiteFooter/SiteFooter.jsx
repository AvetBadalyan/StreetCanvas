import React from "react";

import "./SiteFooter.scss";

const SiteFooter = () => (
  <footer className="site-footer">
    <div className="site-footer__inner">
      <p>
        <strong>Wander Armenia</strong> — places worth visiting across Armenia.
        Built with React, Node, Express and MongoDB.
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
          href="https://github.com/AvetBadalyan/wander-armenia/tree/main/web"
          target="_blank"
          rel="noreferrer"
        >
          Frontend
        </a>
        <a
          href="https://github.com/AvetBadalyan/wander-armenia/tree/main/api"
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
