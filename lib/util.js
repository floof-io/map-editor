export const supportsCompression = "CompressionStream" in self && "DecompressionStream" in self;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function compressString(str) {
    const stream = new CompressionStream("gzip");
    const writer = stream.writable.getWriter();
    writer.write(textEncoder.encode(str));
    writer.close();
    
    return btoa(String.fromCharCode(...new Uint8Array(await new Response(stream.readable).arrayBuffer())));
}

export async function decompressString(base64Str) {
    const stream = new DecompressionStream("gzip");
    const writer = stream.writable.getWriter();
    writer.write(Uint8Array.from(atob(base64Str), (char) => char.charCodeAt(0)));
    writer.close();

    return textDecoder.decode(await new Response(stream.readable).arrayBuffer());
}