# Build static frontend files
FROM node:26-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production

COPY frontend .

# The API lives behind /api on whatever host serves the page, so the address stays
# relative by default: baked in as localhost it only ever worked on the machine running
# it. The ARG leaves the door open for a build that needs a different address.
# Through npm, not `apk add pnpm`: that pulls a second Node in next to the one this
# image already ships, and installing it fails on the image's own /usr/bin.
ARG VITE_API_BASE_URL=/api
RUN npm install -g pnpm@11 && \
    CI=true pnpm install && \
    VITE_API_BASE_URL=$VITE_API_BASE_URL pnpm build

# Build backend image that also serves frontend (stored in `/app/frontend-dist`)
FROM python:3.14-alpine3.22
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN rm -rf /var/cache/apk/*

COPY backend /app
WORKDIR /app

# -- Install dependencies:
RUN addgroup --system bracket && \
    adduser --system bracket --ingroup bracket && \
    chown -R bracket:bracket /app
USER bracket

RUN uv sync --no-dev --locked

COPY --from=builder /app/dist /app/frontend-dist

EXPOSE 8400

HEALTHCHECK --interval=3s --timeout=5s --retries=10 \
    CMD ["wget", "-O", "/dev/null", "http://0.0.0.0:8400/ping"]

CMD [ \
    "uv", \
    "run", \
    "--no-dev", \
    "--locked", \
    "--", \
    "gunicorn", \
    "-k", \
    "uvicorn.workers.UvicornWorker", \
    "bracket.app:app", \
    "--bind", \
    "0.0.0.0:8400", \
    "--workers", \
    "1" \
]
