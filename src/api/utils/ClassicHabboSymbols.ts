// Símbolos clásicos de Habbo (fuente Flash Ubuntu + códigos ALT del teclado numérico)

const CP437_LOW = '☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼'; // códigos 1..31
const CP437_HIGH = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00A0'; // códigos 128..255

export interface ClassicHabboSymbolItem
{
    char: string;
    label: string;
    altCode: string;
}

export const GetAltCodeCharacter = (code: number, leadingZero: boolean = false): string =>
{
    if(!Number.isFinite(code) || code <= 0) return '';

    if(leadingZero)
    {
        const byte = code & 0xFF;

        if(byte >= 32 && byte <= 126) return String.fromCharCode(byte);
        if(byte >= 128 && byte <= 255)
        {
            try
            {
                return new TextDecoder('windows-1252').decode(new Uint8Array([ byte ]));
            }
            catch
            {
                return String.fromCharCode(byte);
            }
        }

        return '';
    }

    const byte = code % 256;

    if(byte >= 1 && byte <= 31) return CP437_LOW.charAt(byte - 1);
    if(byte >= 32 && byte <= 126) return String.fromCharCode(byte);
    if(byte === 127) return '⌂';
    if(byte >= 128 && byte <= 255) return CP437_HIGH.charAt(byte - 128);

    return '';
};

export const GetAltCodeForCharacter = (char: string): number =>
{
    const known: Record<string, number> = {
        '†': 134,
        '‡': 135,
        '•': 7,
        '—': 151,
        '‘': 145,
        '›': 155,
        '‹': 139,
        '|': 124
    };

    if(known[char] !== undefined) return known[char];

    const low = CP437_LOW.indexOf(char);

    if(low >= 0) return (low + 1);
    if(char === '⌂') return 127;

    const high = CP437_HIGH.indexOf(char);

    return (high >= 0) ? (high + 128) : -1;
};

// Caracteres de control que algunos navegadores insertan al usar ALT + número (p. ej. \u0007 de ALT+7)
export const StripControlCharacters = (value: string): string => value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '');

// 16 íconos clásicos integrados en la fuente Ubuntu de Habbo + flechas clásicas
export const CLASSIC_HABBO_FONT_SYMBOLS: ClassicHabboSymbolItem[] = [
    { char: '†', label: 'Bomba', altCode: 'ALT + 0134' },
    { char: '¥', label: 'Estrella', altCode: 'ALT + 157' },
    { char: 'ƒ', label: 'Corazón', altCode: 'ALT + 159' },
    { char: '|', label: 'Corazón vacío', altCode: 'ALT + 124' },
    { char: '•', label: 'Pulgar arriba', altCode: 'ALT + 7' },
    { char: '÷', label: 'Pulgar abajo', altCode: 'ALT + 246' },
    { char: 'ª', label: 'Calavera', altCode: 'ALT + 166' },
    { char: 'º', label: 'Rayo', altCode: 'ALT + 167' },
    { char: '—', label: 'Nota musical', altCode: 'ALT + 0151' },
    { char: 'µ', label: 'Café', altCode: 'ALT + 230' },
    { char: '±', label: 'Teléfono', altCode: 'ALT + 241' },
    { char: '¬', label: 'Pez', altCode: 'ALT + 170' },
    { char: '¶', label: 'Bombilla', altCode: 'ALT + 20' },
    { char: '‡', label: 'Prohibido', altCode: 'ALT + 0135' },
    { char: '»', label: 'Trébol', altCode: 'ALT + 175' },
    { char: '‘', label: 'Candado', altCode: 'ALT + 0145' },
    { char: '››', label: 'Flechas derecha', altCode: 'ALT + 0155' },
    { char: '«', label: 'Flechas izquierda', altCode: 'ALT + 174' }
];

export const CLASSIC_HABBO_SYMBOLS: string[] = [
    '★', '☆', '♥', '♡', '♦', '♣', '♠', '☺', '☻', '♂', '♀', '♪', '♫', '☼',
    '►', '◄', '▲', '▼', '↑', '↓', '→', '←', '↔', '↕', '‼', '§', '⌂',
    '✓', '✗', '✿', '❀', '☀', '☁', '☂', '☎', '✉', '✈', '✂', '♞', '♛', '♚', '☯', '☮', '☢',
    '☣', '✪', '✦', '✧', '❖', '❤', '❥', '♩', '♬', '■', '□', '▪', '▫', '◆', '◇', '●',
    '°', '±', '²', '½', '¼', '¡', '¿', '€', '£', '¢', '∞', '≈', '≠', '≤', '≥', '√'
];
