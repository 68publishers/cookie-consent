# Build, tests, perf and demo in the Playwright image (Dockerfile), the same Node and browsers as in CI.
__RUN := UID=$$(id -u) GID=$$(id -g) docker compose run --rm app
# the tested build (var/build) and 1.6.0 (var/perf-ref) for e2e and visual tests
__PREPARE := npm run build:test && npm run ref &&

.PHONY: build install tests tests.unit tests.e2e tests.visual tests.visual.update lint perf demo shell down

build:
	docker compose build

install: build
	$(__RUN) npm ci

# build, 1.6.0 reference, unit, e2e and visual tests (CC_VISUAL is set in docker-compose.yml)
tests:
	$(__RUN) npm test

tests.unit:
	$(__RUN) npm run test:unit

tests.e2e:
	$(__RUN) sh -c '$(__PREPARE) npx playwright test --project=chromium --project=firefox --project=webkit'

tests.visual:
	$(__RUN) sh -c '$(__PREPARE) npm run test:visual'

# accepts an intended change of the look, commit the changed *-linux.png
tests.visual.update:
	$(__RUN) sh -c '$(__PREPARE) npm run test:visual -- --update-snapshots=all'

lint:
	$(__RUN) npm run eslint

perf:
	$(__RUN) npm run perf -- --compare

demo:
	UID=$$(id -u) GID=$$(id -g) docker compose run --rm --service-ports app npm run demo

shell:
	$(__RUN) bash

down:
	docker compose down --remove-orphans --volumes
