# ESP32 build service image: arduino-cli + a pinned arduino-esp32 core + the Node service.
#   docker build -t solderhub-esp32-build -f esp32-build-service/Dockerfile esp32-build-service
#   docker run --rm -p 8787:8787 -e BUILD_TOKEN=$(openssl rand -hex 24) \
#     --tmpfs /tmp:size=512m --memory=2g --cpus=2 --cap-drop=ALL --security-opt=no-new-privileges --pids-limit=256 \
#     solderhub-esp32-build
# Pin both versions; bump them deliberately and re-run the CI acceptance test.
FROM node:22-bookworm-slim

ARG ARDUINO_CLI_VERSION=1.3.1
ARG ESP32_CORE_VERSION=3.3.0
ENV ESP32_CORE_LABEL=esp32:esp32@${ESP32_CORE_VERSION}

# python3: the core's partition-table generator is a Python script. curl/ca-certificates: install time only.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh \
    | BINDIR=/usr/local/bin sh -s ${ARDUINO_CLI_VERSION}

RUN useradd --create-home --uid 10001 builder
USER builder
ENV HOME=/home/builder \
    ARDUINO_DIRECTORIES_DATA=/home/builder/arduino-data \
    ARDUINO_DIRECTORIES_USER=/home/builder/arduino-user \
    BUILD_CACHE_DIR=/home/builder/build-cache

RUN arduino-cli config init \
 && arduino-cli config add board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json \
 && arduino-cli core update-index \
 && arduino-cli core install esp32:esp32@${ESP32_CORE_VERSION}

COPY --chown=builder:builder compile-shared.mjs server.mjs /app/
# Warm the build cache so the first user compile does not rebuild the core (the cache lives in the image).
RUN mkdir -p /tmp/warm/warm \
 && printf 'void setup(){}\nvoid loop(){}\n' > /tmp/warm/warm/warm.ino \
 && arduino-cli compile --fqbn esp32:esp32:esp32 --build-cache-path "$BUILD_CACHE_DIR" /tmp/warm/warm \
 && arduino-cli compile --fqbn esp32:esp32:esp32c3 --build-cache-path "$BUILD_CACHE_DIR" /tmp/warm/warm \
 && rm -rf /tmp/warm

EXPOSE 8787
USER builder
CMD ["node", "/app/server.mjs"]
