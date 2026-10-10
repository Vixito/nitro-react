const allowedColours: Map<string, string> = new Map();

allowedColours.set('r', 'red');
allowedColours.set('b', 'blue');
allowedColours.set('g', 'green');
allowedColours.set('y', 'yellow');
allowedColours.set('w', 'white');
allowedColours.set('o', 'orange');
allowedColours.set('c', 'cyan');
allowedColours.set('br', 'brown');
allowedColours.set('pr', 'purple');
allowedColours.set('pk', 'pink');

allowedColours.set('red', 'red');
allowedColours.set('blue', 'blue');
allowedColours.set('green', 'green');
allowedColours.set('yellow', 'yellow');
allowedColours.set('white', 'white');
allowedColours.set('orange', 'orange');
allowedColours.set('cyan', 'cyan');
allowedColours.set('brown', 'brown');
allowedColours.set('purple', 'purple');
allowedColours.set('pink', 'pink');

const encodeHTML = (str: string) =>
{
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Whitelist of trusted GIF/image hosting domains to prevent XSS, SSRF, IP grabbers and malicious links
const ALLOWED_GIF_DOMAINS = [
    'giphy.com',
    'media.giphy.com',
    'i.giphy.com',
    'tenor.com',
    'media.tenor.com',
    'c.tenor.com',
    'imgur.com',
    'i.imgur.com',
    'cdn.discordapp.com',
    'media.discordapp.net'
];

export const isSafeGifUrl = (urlStr: string): boolean =>
{
    try
    {
        const parsed = new URL(urlStr);
        if(parsed.protocol !== 'https:') return false;
        if(parsed.username || parsed.password || parsed.port) return false;

        const hostname = parsed.hostname.toLowerCase();
        const isAllowed = ALLOWED_GIF_DOMAINS.some(domain => 
            hostname === domain || hostname.endsWith('.' + domain)
        );

        if(!isAllowed) return false;
        if(/["'<>\\;]/.test(parsed.pathname) || /["'<>\\;]/.test(parsed.search)) return false;

        return true;
    }
    catch
    {
        return false;
    }
};

export const EMOJI_COMMAND_MAP: Record<string, string> = {
    '1': '😀', 'sonrisa': '😀', 'feliz': '😀',
    '2': '😂', 'risa': '😂', 'jaja': '😂', 'lol': '😂',
    '3': '❤️', 'corazon': '❤️', 'love': '❤️',
    '4': '🔥', 'fuego': '🔥', 'fire': '🔥',
    '5': '👍', 'megusta': '👍', 'like': '👍', 'pulgar': '👍',
    '6': '👎', 'nomegusta': '👎', 'dislike': '👎',
    '7': '💀', 'calavera': '💀', 'skull': '💀', 'rip': '💀',
    '8': '👑', 'corona': '👑', 'crown': '👑',
    '9': '⭐', 'estrella': '⭐', 'star': '⭐',
    '10': '💎', 'diamante': '💎', 'diamond': '💎',
    '11': '💩', 'caca': '💩', 'poop': '💩',
    '12': '🎉', 'fiesta': '🎉', 'party': '🎉',
    '13': '😎', 'gafas': '😎', 'cool': '😎',
    '14': '😭', 'llanto': '😭', 'sad': '😭', 'triste': '😭',
    '15': '😡', 'enojado': '😡', 'angry': '😡',
    '16': '👏', 'aplausos': '👏', 'clap': '👏',
    '17': '💯', '100': '💯',
    '18': '👀', 'ojos': '👀', 'eyes': '👀',
    '19': '🍕', 'pizza': '🍕',
    '20': '☕', 'cafe': '☕', 'coffee': '☕'
};

export const RoomChatFormatter = (content: string) =>
{
    let result = '';

    content = encodeHTML(content);

    content = content
        .replace(/(&#60;|&lt;)br\s*\/?(&#62;|&gt;)/gi, '<br />')
        .replace(/(&#60;|&lt;)b(&#62;|&gt;)/gi, '<b>')
        .replace(/(&#60;|&lt;)\/b(&#62;|&gt;)/gi, '</b>')
        .replace(/(&#60;|&lt;)i(&#62;|&gt;)/gi, '<i>')
        .replace(/(&#60;|&lt;)\/i(&#62;|&gt;)/gi, '</i>')
        .replace(/(&#60;|&lt;)u(&#62;|&gt;)/gi, '<u>')
        .replace(/(&#60;|&lt;)\/u(&#62;|&gt;)/gi, '</u>')
        .replace(/\r\n|\n/g, '<br />');

    // Parse [gif]url[/gif] BBCode with strict domain whitelist
    content = content.replace(/\[gif\](https?:\/\/[^\s"'<]+)\[\/gif\]/gi, (match, url) =>
    {
        const cleanUrl = url.trim();
        if(!isSafeGifUrl(cleanUrl)) return '[Enlace GIF no seguro o no permitido]';
        return `<span class="chat-gif-wrapper"><img class="chat-inline-gif" src="${ cleanUrl }" alt="GIF" loading="lazy" /></span>`;
    });

    // Parse :gif url command with strict domain whitelist
    content = content.replace(/(^|\s):gif\s+(https?:\/\/[^\s"'<]+)/gi, (match, prefix, url) =>
    {
        const cleanUrl = url.trim();
        if(!isSafeGifUrl(cleanUrl)) return `${ prefix }[Enlace GIF no seguro o no permitido]`;
        return `${ prefix }<span class="chat-gif-wrapper"><img class="chat-inline-gif" src="${ cleanUrl }" alt="GIF" loading="lazy" /></span>`;
    });

    // Parse explicit :emoji <numero o nombre> command only (preserves literal :) in chat)
    content = content.replace(/(^|\s):emoji\s+([a-zA-Z0-9]+)/gi, (match, prefix, key) =>
    {
        const emoji = EMOJI_COMMAND_MAP[key.toLowerCase()];
        if(emoji) return `${ prefix }${ emoji }`;
        return match;
    });

    if(content.startsWith('@') && content.indexOf('@', 1) > -1)
    {
        let match = null;

        while((match = /@[a-zA-Z]+@/g.exec(content)) !== null)
        {
            const colorTag = match[0].toString();
            const colorName = colorTag.substr(1, colorTag.length - 2);
            const text = content.replace(colorTag, '');

            if(!allowedColours.has(colorName))
            {
                result = text;
            }
            else
            {
                const color = allowedColours.get(colorName);
                result = '<span style="color: ' + color + '">' + text + '</span>';
            }
            break;
        }
    }
    else
    {
        result = content;
    }

    return result;
}
