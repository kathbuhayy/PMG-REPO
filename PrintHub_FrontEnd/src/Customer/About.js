import React, { useEffect, useRef } from "react";
import L from "leaflet";

import {
  FaCheck,
  FaPrint,
  FaUsers,
} from "react-icons/fa";

import pmgLogoBlack from "../assets/brand/pmg-logo-black.png";

import "leaflet/dist/leaflet.css";
import "./About.css";

/* =========================================================
   PMG BRANCH LOCATIONS
   ========================================================= */

const branches = [
  {
    name: "Main Branch",
    address:
      "Unit A, 470 Holgado Building, General Trias Drive, Barangay Tejero, General Trias, Cavite 4107",
    position: [14.39816, 120.86235],
    main: true,
  },

  {
    name: "Trece Branch",
    address:
      "121619 Multiventures Incorporated Trece Branch, 212 B Tanza-Trece Rd., Trece Martires, Cavite",
    position: [14.28459, 120.8681],
  },

  {
    name: "Bacoor Branch",
    address:
      "214, Conrado Bldg, Niog, Bacoor, Cavite",
    position: [14.4555, 120.9574],
  },

  {
    name: "GMA Branch",
    address:
      "Unit #10, Congressional Road, Brgy. San Gabriel, GMA, Cavite (Beside Goodyear and Imperial Plaza)",
    position: [14.3005, 121.0005],
  },
];


/* =========================================================
   OPEN ADDRESS IN GOOGLE MAPS
   ========================================================= */

const openGoogleMaps = (address) => {
  const googleMapsUrl =
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;

  window.open(
    googleMapsUrl,
    "_blank",
    "noopener,noreferrer"
  );
};


/* =========================================================
   ABOUT PAGE
   ========================================================= */

export default function About() {

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);


  useEffect(() => {

    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }


    /* =====================================================
       CREATE MAP
       ===================================================== */

    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
      zoomControl: true,
    });

    mapInstanceRef.current = map;


    /* =====================================================
       OPENSTREETMAP
       ===================================================== */

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',

        maxZoom: 19,

        crossOrigin: true,
      }
    ).addTo(map);


    /* =====================================================
       CUSTOM PMG MARKER
       ===================================================== */

    const pmgMarker = L.divIcon({

      className: "pmg-map-marker",

      html: `
        <div class="pmg-marker-pin">
          <div class="pmg-marker-dot"></div>
        </div>
      `,

      iconSize: [30, 40],

      iconAnchor: [15, 40],

      popupAnchor: [0, -38],
    });


    /* =====================================================
       ADD BRANCH MARKERS
       ===================================================== */

    const markerPositions = [];


    branches.forEach((branch) => {

      const marker = L.marker(
        branch.position,
        {
          icon: pmgMarker,
        }
      ).addTo(map);


      marker.bindPopup(`

        <div class="pmg-map-popup">

          <div class="pmg-popup-icon">
            <span>●</span>
          </div>

          <strong>
            PMG Printing House
          </strong>

          <span>
            ${branch.name}
          </span>

          <small>
            ${branch.address}
          </small>

        </div>

      `);


      markerPositions.push(branch.position);

    });


    /* =====================================================
       FIT MAP
       ===================================================== */

    if (markerPositions.length > 0) {

      const bounds = L.latLngBounds(
        markerPositions
      );


      map.fitBounds(
        bounds,
        {
          padding: [45, 45],
          maxZoom: 12,
        }
      );

    }


    /* =====================================================
       FIX MAP SIZE
       ===================================================== */

    setTimeout(() => {
      map.invalidateSize();
    }, 300);


    /* =====================================================
       CLEANUP
       ===================================================== */

    return () => {

      if (mapInstanceRef.current) {

        mapInstanceRef.current.remove();

        mapInstanceRef.current = null;

      }

    };

  }, []);


  return (

    <main className="pmg-about-page">


      {/* =====================================================
          ABOUT STORY
          ===================================================== */}

      <section className="about-story-section">

        <div className="about-story-container">


          <div className="about-story-content">

            <div className="about-eyebrow">

              <span className="about-eyebrow-line" />

              <span>
                ABOUT PMG
              </span>

            </div>


            <h1 className="about-story-title">

              How{" "}

              <span>
                PMG
              </span>{" "}

              started

            </h1>


            <p className="about-story-text">

              PMG Printing House is a printing and
              customization business dedicated to
              providing quality printing solutions for
              individuals, organizations, schools,
              businesses, and communities.

            </p>


            <p className="about-story-text">

              From customized apparel and promotional
              materials to various printed products,
              PMG aims to turn ideas into high-quality
              physical products that customers can
              proudly use and share.

            </p>


            <p className="about-story-text">

              With a focus on quality, creativity,
              affordability, and customer satisfaction,
              PMG continues to improve its services
              and make customized printing more
              accessible.

            </p>


            <button
              type="button"
              className="about-read-more"
            >
              Read More
            </button>

          </div>


          {/* =================================================
              PRINTING CARD
              ================================================= */}

          <div className="about-story-visual">

            <div className="about-print-card">

              <div className="about-print-card-glow" />


              <img
                src="/pmg-about-images/printing-machine.jpg"
                alt="PMG printing machine"
                className="about-print-image"
              />


              <div className="about-print-overlay" />


              <div className="about-print-content">

                <span className="about-print-label">
                  PMG
                </span>


                <h2>

                  WE PRINT

                  <br />

                  YOUR VISION

                  <br />

                  <strong>
                    TO LIFE.
                  </strong>

                </h2>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          LOCATIONS
          ===================================================== */}

      <section className="about-branches-section">

        <div className="about-branches-container">


          <div className="about-branches-content">

            <div className="about-eyebrow">

              <span className="about-eyebrow-line" />

              <span>
                OUR LOCATIONS
              </span>

            </div>


            <h2>

              Check out our

              <br />

              <span>
                branches
              </span>

            </h2>


            <div className="about-branch-list">

              {branches.map((branch) => (

                <div
                  className="about-branch"
                  key={branch.name}
                >

                  <span className="about-branch-dot" />


                  <div className="about-branch-info">

                    <h3>

                      {branch.main
                        ? "Main Branch"
                        : branch.name.replace(
                            ", Cavite",
                            " Branch"
                          )}

                    </h3>


                    <p
                      className="about-clickable-address"

                      onClick={() =>
                        openGoogleMaps(
                          branch.address
                        )
                      }

                      onKeyDown={(event) => {

                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {

                          event.preventDefault();

                          openGoogleMaps(
                            branch.address
                          );

                        }

                      }}

                      role="link"

                      tabIndex={0}

                      title="Open this location in Google Maps"
                    >

                      {branch.address}

                    </p>

                  </div>

                </div>

              ))}

            </div>

          </div>


          {/* =================================================
              OPENSTREETMAP
              ================================================= */}

          <div className="about-map-card">

            <div
              ref={mapRef}
              className="pmg-leaflet-map"
            />

          </div>

        </div>

      </section>


      {/* =====================================================
          VALUES
          ===================================================== */}

      <section className="about-values-section">

        <div className="about-values-container">


          {/* =================================================
              HEADING
              ================================================= */}

          <div className="about-section-heading">

            <div className="about-eyebrow">

              <span className="about-eyebrow-line" />

              <span>
                WHAT WE VALUE
              </span>

            </div>


            <h2>

              Built around

              <br />

              <span>
                your ideas.
              </span>

            </h2>

          </div>


          {/* =================================================
              VALUE CARDS
              ================================================= */}

          <div className="about-values-grid">


            {/* =================================================
                QUALITY PRINTING
                ================================================= */}

            <article className="about-value-card">

              <div className="about-value-image-wrapper">

                <img
                  src="/pmg-about-images/quality-printing.png"
                  alt="Quality printing"
                  className="about-value-image"
                />

              </div>


              <div className="about-value-icon">

                <FaPrint />

              </div>


              <div className="about-value-card-content">

                <span className="about-value-number">
                  01
                </span>


                <h3>
                  Quality Printing
                </h3>


                <div className="about-card-line" />


                <p>

                  We focus on producing clean,
                  professional, and reliable printed
                  products.

                </p>

              </div>

            </article>


            {/* =================================================
                CUSTOM SOLUTIONS
                ================================================= */}

            <article className="about-value-card">

              <div className="about-value-image-wrapper">

                <img
                  src="/pmg-about-images/custom-solutions.png"
                  alt="Custom design solutions"
                  className="about-value-image"
                />

              </div>


              <div className="about-value-icon">

                <FaCheck />

              </div>


              <div className="about-value-card-content">

                <span className="about-value-number">
                  02
                </span>


                <h3>
                  Custom Solutions
                </h3>


                <div className="about-card-line" />


                <p>

                  We help turn individual ideas and
                  requirements into customized products.

                </p>

              </div>

            </article>


            {/* =================================================
                CUSTOMER FOCUS
                ================================================= */}

            <article className="about-value-card">

              <div className="about-value-image-wrapper">

                <img
                  src="/pmg-about-images/customer-focus.png"
                  alt="PMG customer support"
                  className="about-value-image"
                />

              </div>


              <div className="about-value-icon">

                <FaUsers />

              </div>


              <div className="about-value-card-content">

                <span className="about-value-number">
                  03
                </span>


                <h3>
                  Customer Focus
                </h3>


                <div className="about-card-line" />


                <p>

                  We aim to provide accessible printing
                  services and support throughout the
                  ordering process.

                </p>

              </div>

            </article>


          </div>

        </div>

      </section>


      {/* =====================================================
          FOOTER
          ===================================================== */}

      <footer className="about-footer">

        <div className="about-footer-logo">

        <img
      src={pmgLogoBlack}
      alt="PMG Printing House"
      className="about-footer-logo-image"
    />
        </div>


        <p>

          © {new Date().getFullYear()}

          {" "}

          PMG Printing House.

          {" "}

          All rights reserved.

        </p>

      </footer>


    </main>

  );

}