# Floating Bloom

Floating Bloom is a soothing WebGL garden filled with luminous flowers and fireflies. The blossoms gently drift in response to your cursor, creating a calming "flower game" experience in the browser.

## Running locally

```bash
npm install
npm start
```

Then open http://localhost:8080 in your browser.

## Testing the experience

There are no automated tests for this visual demo. To verify things are
working as expected:

1. Start the local server (either with `npm start` or the Docker command
   below).
2. Open http://localhost:8080 in a desktop browser.
3. Move your cursor around the scene and confirm the flowers lean toward
   the pointer, the camera eases with your movement, and the fireflies
   continue to drift.

If the page loads and responds smoothly to pointer movement, the build is
considered healthy.

## Running with Docker

Build the container image and run it using the included Dockerfile:

```bash
docker build -t floating-bloom .
docker run --rm -p 8080:8080 floating-bloom
```

Visit http://localhost:8080 to explore the relaxing scene.

## Publishing to Docker Hub

This repository includes a GitHub Actions workflow that builds the Docker
image and publishes it to Docker Hub. To enable automated publishing:

1. Create a Docker Hub account (if you do not already have one) and generate
   a [personal access token](https://docs.docker.com/docker-hub/access-tokens/).
2. Add the following repository secrets in GitHub:
   - `DOCKERHUB_USERNAME`: your Docker Hub username.
   - `DOCKERHUB_TOKEN`: the access token created in the previous step.
3. Push to the `main` branch or create a tag that starts with `v` (for example,
   `v1.0.0`). The workflow builds the image and publishes it to
   `docker.io/<username>/floating-bloom`. A manual run can also be triggered via
   the "Run workflow" button in the GitHub Actions tab.
