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

const EMOTICON_MAP: [RegExp, string][] = [
    [/(^|\s):\)(?=\s|$)/g, '$1😊'],
    [/(^|\s):-\)(?=\s|$)/g, '$1😊'],
    [/(^|\s):D(?=\s|$)/g, '$1😃'],
    [/(^|\s):-D(?=\s|$)/g, '$1😃'],
    [/(^|\s):\((?=\s|$)/g, '$1🙁'],
    [/(^|\s):-\((?=\s|$)/g, '$1🙁'],
    [/(^|\s):[pP](?=\s|$)/g, '$1😛'],
    [/(^|\s):-[pP](?=\s|$)/g, '$1😛'],
    [/(^|\s);[)\/](?=\s|$)/g, '$1😉'],
    [/(^|\s);-\)(?=\s|$)/g, '$1😉'],
    [/(^|\s):[oO](?=\s|$)/g, '$1😮'],
    [/(^|\s):-[oO](?=\s|$)/g, '$1😮'],
    [/(^|\s)&lt;3(?=\s|$)/g, '$1❤️'],
    [/(^|\s)\(heart\)(?=\s|$)/gi, '$1❤️'],
    [/(^|\s)\(skull\)(?=\s|$)/gi, '$1💀'],
    [/(^|\s)\(fire\)(?=\s|$)/gi, '$1🔥'],
    [/(^|\s)\(star\)(?=\s|$)/gi, '$1⭐'],
    [/(^|\s)\(thumbsup\)(?=\s|$)/gi, '$1👍'],
    [/(^|\s)\(thumbsdown\)(?=\s|$)/gi, '$1👎'],
    [/(^|\s)\(poop\)(?=\s|$)/gi, '$1💩'],
    [/(^|\s)\(crown\)(?=\s|$)/gi, '$1👑'],
    [/(^|\s)\(diamond\)(?=\s|$)/gi, '$1💎']
];

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

    // Parse [gif]url[/gif] BBCode
    content = content.replace(/\[gif\](https?:\/\/[^\s"'<]+)\[\/gif\]/gi, (match, url) =>
    {
        const cleanUrl = url.trim();
        return `<span class="chat-gif-wrapper"><img class="chat-inline-gif" src="${ cleanUrl }" alt="GIF" loading="lazy" /></span>`;
    });

    // Parse :gif url command
    content = content.replace(/(^|\s):gif\s+(https?:\/\/[^\s"'<]+)/gi, (match, prefix, url) =>
    {
        const cleanUrl = url.trim();
        return `${ prefix }<span class="chat-gif-wrapper"><img class="chat-inline-gif" src="${ cleanUrl }" alt="GIF" loading="lazy" /></span>`;
    });

    // Parse common emoticons to unicode emojis
    for(const [ regex, emoji ] of EMOTICON_MAP)
    {
        content = content.replace(regex, emoji);
    }

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
