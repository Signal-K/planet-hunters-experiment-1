FROM mcr.microsoft.com/playwright:v1.49.1-jammy

ARG GODOT_VERSION=4.5-stable
ARG GODOT_TEMPLATE_DIR=4.5.stable
ENV GODOT_BIN=/usr/local/bin/godot \
    PROJECT_PATH=/app/scene \
    WEB_BUILD_DIR=/app/scene/build/web \
    E2E_OUTPUT_DIR=/output

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl unzip ca-certificates python3 \
    libgl1-mesa-dri libgl1-mesa-glx libegl1 libgles2 \
    libx11-6 libxcursor1 libxi6 libxrandr2 libxinerama1 libxss1 libxkbcommon0 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    case "$(dpkg --print-architecture)" in \
      amd64) GODOT_ARCH="x86_64" ;; \
      arm64) GODOT_ARCH="arm64" ;; \
      *) GODOT_ARCH="x86_64" ;; \
    esac; \
    curl -fsSL -o /tmp/godot.zip \
      "https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}/Godot_v${GODOT_VERSION}_linux.${GODOT_ARCH}.zip"; \
    unzip -q /tmp/godot.zip -d /tmp/godot; \
    mv "/tmp/godot/Godot_v${GODOT_VERSION}_linux.${GODOT_ARCH}" "$GODOT_BIN"; \
    chmod +x "$GODOT_BIN"; \
    curl -fsSL -o /tmp/templates.tpz \
      "https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}/Godot_v${GODOT_VERSION}_export_templates.tpz"; \
    mkdir -p "/root/.local/share/godot/export_templates/${GODOT_TEMPLATE_DIR}"; \
    unzip -q /tmp/templates.tpz -d /tmp/templates; \
    cp -R /tmp/templates/templates/* "/root/.local/share/godot/export_templates/${GODOT_TEMPLATE_DIR}/"; \
    rm -rf /tmp/godot /tmp/godot.zip /tmp/templates /tmp/templates.tpz

WORKDIR /app
COPY scene/ /app/scene/
COPY scripts/e2e/web_canvas_flow.mjs /app/scripts/e2e/web_canvas_flow.mjs
COPY docker/godot-web-e2e/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p "$E2E_OUTPUT_DIR"

ENTRYPOINT ["/entrypoint.sh"]
