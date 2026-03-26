FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod ./
COPY . .
RUN go build -o kanban .

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/kanban .
COPY public/ public/

# kanban-data is a volume mount — persists tasks.json between restarts
VOLUME ["/app/kanban-data"]

EXPOSE 4444
ENV PORT=4444
CMD ["./kanban"]
