"""Petit relais MQTT sur WebSocket, uniquement pour les tests (deux téléphones simulés).

Usage : python3 tests/mqtt_broker.py 8883
"""
import asyncio
import base64
import hashlib
import sys

GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
subs = {}  # topic -> set(client)


class Client:
    def __init__(self, reader, writer):
        self.r, self.w = reader, writer
        self.buf = b''
        self.topics = set()

    def send_frame(self, payload: bytes):
        head = bytes([0x82])
        n = len(payload)
        if n < 126:
            head += bytes([n])
        elif n < 65536:
            head += bytes([126]) + n.to_bytes(2, 'big')
        else:
            head += bytes([127]) + n.to_bytes(8, 'big')
        self.w.write(head + payload)

    def mqtt(self, first, body=b''):
        n = len(body)
        enc = bytearray()
        while True:
            d = n % 128
            n //= 128
            if n:
                d |= 128
            enc.append(d)
            if not n:
                break
        self.send_frame(bytes([first]) + bytes(enc) + body)


async def read_frame(c):
    h = await c.r.readexactly(2)
    op = h[0] & 15
    masked = h[1] & 128
    n = h[1] & 127
    if n == 126:
        n = int.from_bytes(await c.r.readexactly(2), 'big')
    elif n == 127:
        n = int.from_bytes(await c.r.readexactly(8), 'big')
    mask = await c.r.readexactly(4) if masked else b'\0\0\0\0'
    data = bytearray(await c.r.readexactly(n))
    for i in range(n):
        data[i] ^= mask[i % 4]
    return op, bytes(data)


def handle_packets(c):
    while len(c.buf) >= 2:
        mult, length, i = 1, 0, 1
        while True:
            if i >= len(c.buf):
                return
            d = c.buf[i]
            i += 1
            length += (d & 127) * mult
            mult *= 128
            if not d & 128:
                break
        if len(c.buf) < i + length:
            return
        typ, flags, body = c.buf[0] >> 4, c.buf[0] & 15, c.buf[i:i + length]
        c.buf = c.buf[i + length:]
        if typ == 1:
            c.mqtt(0x20, b'\0\0')
        elif typ == 8:
            pid = body[:2]
            tl = int.from_bytes(body[2:4], 'big')
            topic = body[4:4 + tl].decode()
            c.topics.add(topic)
            subs.setdefault(topic, set()).add(c)
            c.mqtt(0x90, pid + b'\x01')
        elif typ == 3:
            qos = (flags >> 1) & 3
            tl = int.from_bytes(body[:2], 'big')
            topic = body[2:2 + tl].decode()
            o = 2 + tl
            if qos:
                pid = body[o:o + 2]
                o += 2
                c.mqtt(0x40, pid)
            payload = body[o:]
            for other in list(subs.get(topic, ())):
                other.mqtt(0x30, len(topic).to_bytes(2, 'big') + topic.encode() + payload)
        elif typ == 12:
            c.mqtt(0xD0)


async def serve(reader, writer):
    head = await reader.readuntil(b'\r\n\r\n')
    key = ''
    for line in head.decode(errors='ignore').split('\r\n'):
        if line.lower().startswith('sec-websocket-key:'):
            key = line.split(':', 1)[1].strip()
    acc = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
    writer.write(('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                  f'Sec-WebSocket-Accept: {acc}\r\nSec-WebSocket-Protocol: mqtt\r\n\r\n').encode())
    c = Client(reader, writer)
    try:
        while True:
            op, data = await read_frame(c)
            if op == 8:
                break
            if op == 9:
                writer.write(bytes([0x8A, len(data)]) + data)
                continue
            c.buf += data
            handle_packets(c)
            await writer.drain()
    except (asyncio.IncompleteReadError, ConnectionError):
        pass
    finally:
        for t in c.topics:
            subs.get(t, set()).discard(c)
        writer.close()


async def main(port):
    server = await asyncio.start_server(serve, '127.0.0.1', port)
    print(f'relais de test sur ws://127.0.0.1:{port}', flush=True)
    async with server:
        await server.serve_forever()


if __name__ == '__main__':
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 8883))
