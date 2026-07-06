export function b64EncodeUnicode(str: string): string {
    return btoa(
        encodeURIComponent(str).replace(
            /%([0-9A-F]{2})/g,
            (_: string, p1: string) => String.fromCharCode(parseInt(p1, 16)),
        ),
    )
}
