FROM golang:1.21-alpine

RUN apk add --no-cache gcc musl-dev binutils

WORKDIR /build
COPY nakama-modules/ .

RUN go mod download
RUN go build --buildmode=plugin -o tictactoe.so tictactoe.go