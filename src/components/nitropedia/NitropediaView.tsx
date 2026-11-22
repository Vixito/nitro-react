import { ILinkEventTracker, NitroLogger } from '@nitrots/nitro-renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { AddEventLinkTracker, GetConfiguration, OpenUrl, RemoveLinkEventTracker } from '../../api';
import { Base, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';

const NEW_LINE_REGEX = /\n\r|\n|\r/mg;

export const NitropediaView: FC<{}> = props =>
{
    const [ content, setContent ] = useState<string>(null);
    const [ header, setHeader ] = useState<string>('');
    const [ dimensions, setDimensions ] = useState<{ width: number, height: number }>(null);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() =>
    {
        const resolvePageUrl = (subpath: string): string =>
        {
            const cleanSubpath = subpath.replace(/^\/+/, '');
            let base = GetConfiguration<string>('habbopages.url') || '/habbtenpages/';

            // Never attempt to fetch 127.0.0.1 / localhost from a remote or mobile client
            if(/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(base))
            {
                base = base.replace(/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i, window.location.origin);
            }
            else if(base.startsWith('/'))
            {
                base = `${ window.location.origin }${ base }`;
            }

            if(!base.endsWith('/')) base += '/';

            return `${ base }${ cleanSubpath }`;
        };

        const openPage = async (link: string) =>
        {
            try
            {
                const response = await fetch(link, { credentials: 'same-origin' });

                if(!response || !response.ok) return;
        
                const text = await response.text();
                const splitData = text.split(NEW_LINE_REGEX);
                const line = (splitData.shift() || '').split('|');

                setHeader(line[0] || 'Información');

                setDimensions(prevValue =>
                {
                    if(line[1] && (line[1].split(';').length === 2))
                    {
                        return {
                            width: parseInt(line[1].split(';')[0]),
                            height: parseInt(line[1].split(';')[1])
                        }
                    }

                    return null;
                });

                setContent(splitData.join(''));
            }

            catch (error)
            {
                NitroLogger.error(`Failed to fetch ${ link }`);
            }
        }

        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const value = url.split('/');

                if(value.length < 2) return;

                value.shift();

                openPage(resolvePageUrl(value.join('/')));
            },
            eventUrlPrefix: 'habbopages/'
        };

        const habbtenLinkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const value = url.split('/');

                if(value.length < 2) return;

                value.shift();

                openPage(resolvePageUrl(value.join('/')));
            },
            eventUrlPrefix: 'habbtenpages/'
        };

        AddEventLinkTracker(linkTracker);
        AddEventLinkTracker(habbtenLinkTracker);

        return () =>
        {
            RemoveLinkEventTracker(linkTracker);
            RemoveLinkEventTracker(habbtenLinkTracker);
        }
    }, []);

    useEffect(() =>
    {
        const container = elementRef.current;
        if(!container) return;

        const handle = (event: MouseEvent) =>
        {
            const target = event.target as HTMLElement | null;
            const anchor = target ? target.closest('a') : null;
            if(!anchor) return;

            event.preventDefault();

            const rawHref = anchor.getAttribute('href') || anchor.href;
            if(!rawHref || !rawHref.length) return;

            const normalized = rawHref.startsWith('event:') ? rawHref.slice(6) : rawHref;
            OpenUrl(normalized);
        }

        container.addEventListener('click', handle);

        return () =>
        {
            container.removeEventListener('click', handle);
        }
    }, [ content ]);

    if(!content) return null;

    return (
        <NitroCardView uniqueKey="nitropedia" className="nitropedia" theme="primary-slim" style={ dimensions ? { width: dimensions.width, height: dimensions.height } : {} }>
            <NitroCardHeaderView headerText={ header } onCloseClick={ () => setContent(null) }/>
            <NitroCardContentView overflow="auto">
                <Base fullWidth innerRef={ elementRef } className="text-black nitropedia-body" dangerouslySetInnerHTML={ { __html: content } } />
            </NitroCardContentView>
        </NitroCardView>
    );
}
