FROM --platform=${TARGETPLATFORM:-linux/amd64} alpine:edge AS build
RUN apk add --no-cache \
    crystal \
    shards \
    gc-dev \
    gc-static \
    pcre2-dev \
    pcre2-static \
    yaml-dev \
    yaml-static \
    openssl-dev \
    openssl-libs-static \
    libxml2-dev \
    libxml2-static \
    zlib-dev \
    zlib-static \
    xz-dev \
    xz-static \
    upx

RUN mkdir -p /app
COPY . /app

WORKDIR /app
RUN shards build --static --release
RUN upx bin/tocry

FROM gcr.io/distroless/static-debian12
COPY --from=build /app/bin/tocry /tocry
ENTRYPOINT ["/tocry", "-b", "0.0.0.0"]
