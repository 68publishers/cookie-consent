# Node and browsers for build, tests, perf and demo; the tag must match @playwright/test (tests/unit/docker.test.mjs)
FROM mcr.microsoft.com/playwright:v1.64.1-noble

# node_modules is a named volume (native packages differ from macOS); it takes the permissions from here
RUN mkdir -p /app/node_modules && chmod 777 /app/node_modules
WORKDIR /app
