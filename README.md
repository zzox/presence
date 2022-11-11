# Simple Signaling and Presence Server

Allows for simple two-per-room matchmaking and SDP and ICE candidate signaling for creating a peer connection between two users. Only works in browsers with webRTC functionality.

## Example

`index.html` has an example where you can create a room and join an available room. After joining a room a RTCPeerConnection with a RTCDataChannel is established and a ping interval is set up to send and receive ping/pong messages every second.

## Basic Flow

1. Alice creates a room, is host
2. Bob joins the room, is "peer"
3. Alice gets alerted that a peer joined, sends an SDP offer
    1. Alice also opens a data channel
4. Bob gets the offer, sends an SDP answer
    1. (They both send ice candidates throughout)
5. Once connected, they can send messages over the data channel
6. Connection is currently determined as established when the data channels open

## TODOs
- [ ] reconnect logic
- [ ] joining named rooms
- [ ] presence updates
