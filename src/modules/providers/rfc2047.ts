/**
 * Decode RFC 2047 encoded words (=?charset?B?base64?=, =?charset?Q?quoted-printable?=)
 * commonly found in MIME message headers (Subject, From, etc.).
 */
export function decodeRfc2047(raw: string): string {
  // Remove whitespace between adjacent encoded words
  let result = raw.replace(
    /(=\?[^?]+\?[BQ]\?[^?]*\?=)\s+(?==\?[^?]+\?[BQ]\?[^?]*\?=)/gi,
    "$1",
  );

  result = result.replace(/=\?[^?]+\?[BQ]\?[^?]*\?=/gi, (match) => {
    try {
      const parts = match.slice(2, -2).split("?");
      const enc = parts[1];
      const data = parts[2];
      if (enc?.toUpperCase() === "B") {
        return Buffer.from(data ?? "", "base64").toString("utf-8");
      }
      if (enc?.toUpperCase() === "Q") {
        const cleaned = (data ?? "").replace(/_/g, " ");
        const hexBytes: number[] = [];
        let j = 0;
        while (j < cleaned.length) {
          if (cleaned[j] === "=" && j + 2 < cleaned.length) {
            hexBytes.push(parseInt(cleaned.slice(j + 1, j + 3), 16));
            j += 3;
          } else {
            hexBytes.push(cleaned.charCodeAt(j));
            j++;
          }
        }
        return Buffer.from(hexBytes).toString("utf-8");
      }
    } catch {
      // leave encoded word as-is on parse failure
    }
    return match;
  });

  return result.trim();
}
