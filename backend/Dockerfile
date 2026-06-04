FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o landnam-backend .

FROM alpine:latest

WORKDIR /pb

COPY --from=builder /app/landnam-backend /pb/landnam-backend

EXPOSE 8091

CMD ["/pb/landnam-backend", "serve", "--http=0.0.0.0:8091"]
