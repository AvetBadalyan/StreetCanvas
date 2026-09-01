import React, { useEffect, useState } from "react";

import { resolveImageUrl } from "../../../api/client";
import "./Avatar.scss";

/**
 * Falls back to the contributor's initial when the image is missing or fails to
 * load - seeded and legacy rows can both point at images that no longer exist.
 */
const Avatar = ({ image, alt = "", style, className = "" }) => {
  const [failed, setFailed] = useState(false);
  const src = resolveImageUrl(image);

  // A new image (e.g. the contributor changed their avatar) deserves its own
  // chance to load, rather than staying stuck on an earlier failure.
  useEffect(() => setFailed(false), [src]);

  return (
    <div className={`avatar ${className}`} style={style}>
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="avatar__fallback" aria-hidden="true">
          {alt.trim().charAt(0) || "?"}
        </span>
      )}
    </div>
  );
};

export default Avatar;
