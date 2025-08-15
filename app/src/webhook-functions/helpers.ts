// https://stackoverflow.com/a/57688223
export const truncateString = (string = '', maxLength = 256) =>
    string.length > maxLength
        ? `${string.substring(0, maxLength - 3)}…`
        : string

export const isBlacklisted = (title: string | null, author: string | null, body: string | null, blacklist: string[]) => {
    if (blacklist.length == 0) {
        return false;
    }

    var regex = new RegExp(blacklist.join("|"), "i");

    if (title && regex.test(title)) {
        return true;
    }
    if (author && regex.test(author)) {
        return true;
    }
    if (body && regex.test(body)) {
        return true;
    }

    return false;
}