// https://stackoverflow.com/a/57688223
export const truncateString = (string = '', maxLength = 256) => 
    string.length > maxLength 
        ? `${string.substring(0, maxLength - 3)}…`
        : string

export const isBlacklisted = (title : string | null, author : string | null, body : string | null, blacklist : string[]) => {
    blacklist.forEach(element => {
        let value = element.trim();
        if(title?.includes(value)) {
            return true;
        }
        if(author?.includes(value)) {
            return true;
        }
        if(body?.includes(value)) {
            return true;
        }
    });
    return false;
}