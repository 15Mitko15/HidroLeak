# GEMINI.md

## Project Name

SAR-HydroLeak

## Hackathon Context

This project is being built for the Cassini Hackathon. The product leverages EU Space Data (Copernicus Sentinel-1, Sentinel-2, and Galileo HAS) to deliver a compelling, demo-ready water infrastructure solution within a 72-hour timeframe.

## One-Sentence Product Summary

A spaceborne, AI-powered predictive maintenance platform that leverages Synthetic Aperture Radar (SAR) to detect subterranean water leaks and micro-subsidence in urban infrastructure.

## Product Vision

Build a predictive maintenance dashboard that is:

- Highly actionable for civil engineering and utility crews.
- Feasible to ship as a 72-hour hackathon MVP (using a pre-processed or mocked region).
- Visually striking in a demo, relying on interactive web GIS maps.
- Technically credible, rooted in the physics of dielectric shifts and SAR interferometry.

## Problem Statement

Municipalities lose an average of 20% to 50% of fully treated freshwater to subterranean pipeline leakages. Standard manual acoustic sensing and localized radar are unscalable, labor-intensive, and susceptible to urban noise. Utilities need a scalable, remote-sensing solution to proactively identify and locate these leaks before catastrophic pipe bursts occur.

## Target Users

- Municipal water utility conglomerates
- Civil engineering contractors
- Smart-city administrative bodies

## Core Use Case

A municipal utility manager logs into the SAR-HydroLeak dashboard, views an interactive map of their city's pipeline network, and sees AI-generated "risk heatmaps" derived from Sentinel-1 SAR backscatter and GLCM texture features. They can click on a high-risk zone to generate a precise Galileo HAS coordinate dispatch report for repair crews.

## Hackathon Goal

Deliver a working web-based MVP that can be demonstrated end-to-end. The submission will include:

- A React/Next.js frontend with an interactive web GIS map (e.g., Mapbox GL JS, Leaflet, or OpenLayers).
- A Python backend/script demonstrating the ML pipeline (Random Forest/GLCM extraction) or serving pre-calculated GeoTIFFs.
- Mocked/Pre-processed SAR telemetry data for a specific target municipality to ensure the demo runs smoothly.
- A clean demo flow showing the transition from "satellite data" to "actionable dispatch report."

## Success Criteria

A solution is successful if it:

- Clearly addresses the non-revenue water problem.
- Visually overlays leak probability heatmaps onto urban map tiles.
- Demonstrates the theoretical integration of Copernicus (Sentinel 1 & 2) and Galileo data.
- Explains the complex SAR data in simple, actionable terms for the end-user.

## Product Scope

### In Scope

- Web GIS dashboard showing pipeline routes and anomaly heatmaps.
- Python logic demonstrating GLCM feature extraction and Random Forest classification (can run locally or be served via a lightweight API).
- Generation of a mock dispatch report featuring Galileo coordinates and AI-summarized insights.
- Integration of Sentinel-2 NDWI/NDMI indices conceptually or visually.

### Out of Scope

- Real-time ingestion and processing of terabytes of live Sentinel-1 GRD data (too slow for a live demo; we will use pre-processed or synthetic datasets).
- Complex authentication or user management.
- Live routing of actual repair trucks.

## Recommended Build Strategy (MVP-First)

1. **Data Prep (Priority):** Pre-process a small sample dataset (or create realistic synthetic GeoTIFF heatmaps) to represent the ML output. Do not attempt live SAR processing in the web app.
2. **UI/Map:** Build the UI using Mapbox/Leaflet early. A good-looking map is 80% of a hackathon GIS pitch.
3. **Backend Integration:** Create a simple Python API (FastAPI) to serve the anomaly data and Galileo coordinates to the frontend.
4. **LLM Polish:** Use Gemini's API to generate plain-English "Damage Assessment Reports" based on the anomaly data for the user UI.

## Technical Direction

- **Frontend:** Next.js (React), Tailwind CSS, React-Map-GL (or Leaflet/OpenLayers).
- **Backend/Data Science:** Python, FastAPI, Rasterio, Scikit-image (for GLCM), Scikit-learn (Random Forest).
- **AI/ML:** Gemini API (to translate technical GLCM/SAR data into human-readable maintenance reports for the dashboard).
- **Geospatial:** GeoJSON for vector data, GeoTIFF for raster overlays.

## Data Requirements

Since live SAR processing is too intensive for a live web demo, the MVP will rely on:

- **Mocked/Sampled GeoTIFFs:** Pre-calculated heatmaps representing the leak probabilities.
- **Mocked Pipeline Network:** A GeoJSON file representing city water mains.
- **Galileo Mocks:** Hardcoded ultra-precise coordinates for the high-risk zones.

## AI Usage (Gemini Integration)

Use Gemini in the application layer to:

- Take the numerical outputs of the Random Forest model (e.g., probability score, texture anomaly type, NDMI index) and generate a natural language "Maintenance Dispatch Summary" that explains _why_ this area is flagged and _what_ the crew should look for.

## UX Principles

- **Map-Centric:** The map is the hero of the application.
- **High Contrast:** Ensure the anomaly heatmaps (red/orange) contrast well against a dark-mode urban map.
- **Data Transparency:** Always include tooltips that mention "Powered by Sentinel-1 SAR" to remind judges of the space connection.

## Development Instructions for Gemini CLI

- Default to creating Python/FastAPI for any data processing and Next.js for the UI.
- When generating map code, assume the use of standard GeoJSON formats.
- Prioritize making the map interactive (zoom, click, popup).
- Create a `data/` folder early and generate realistic mock GeoJSON/GeoTIFF metadata so we can build the UI without waiting for real satellite downloads.
- Explain any complex geospatial library installations (e.g., GDAL, Rasterio) as they can be tricky.

## Milestone Plan (72-Hour Sprint)

### Milestone 1: Data & Infrastructure Shell

Set up Next.js frontend, FastAPI backend, and generate the mock GeoJSON pipeline and GeoTIFF anomaly data.

### Milestone 2: The Map UI

Implement the interactive web map. Overlay the pipeline GeoJSON and the anomaly raster data. Ensure clicks trigger popups.

### Milestone 3: The ML/Python Pipeline Script

Write the actual Python script using `rasterio` and `scikit-image` that _would_ process the Sentinel-1 GRD data. Even if we run it offline for the demo, the code must be present in the repo.

### Milestone 4: Intelligence & Dispatch

Integrate the Gemini API to read the selected anomaly data and output a structured repair report with simulated Galileo HAS coordinates.

### Milestone 5: Polish & Pitch

Refine UI, ensure the demo flow is seamless, and finalize README.
