FROM golang:1.25.6-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main main.go

FROM alpine:3.21

RUN apk add --no-cache ca-certificates

WORKDIR /pb
COPY --from=builder /app/main /pb/pocketbase

EXPOSE 8090
ENTRYPOINT ["/pb/pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data"]
