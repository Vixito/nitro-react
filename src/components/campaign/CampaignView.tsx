import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { AddEventLinkTracker, RemoveLinkEventTracker } from '../../api';
import { AdventCalendarDay, CalendarView } from './CalendarView';

interface AdventCalendarPayload
{
    campaignName: string;
    title: string;
    subtitle: string;
    totalDays: number;
    currentDay: number;
    isBeforeStart: boolean;
    daysUntilStart: number;
    days: AdventCalendarDay[];
}

export const CampaignView: FC<{}> = () =>
{
    const [ isCalendarOpen, setCalendarOpen ] = useState(false);
    const [ calendarData, setCalendarData ] = useState<AdventCalendarPayload | null>(null);
    const [ openingDay, setOpeningDay ] = useState<number | null>(null);
    const [ statusMessage, setStatusMessage ] = useState<string>('');

    const loadCalendar = useCallback(async () =>
    {
        try
        {
            const res = await fetch('/api/client/calendar', { credentials: 'include' });
            const json = await res.json();
            if(json && json.success)
            {
                setCalendarData(json as AdventCalendarPayload);
            }
        }
        catch
        {
            setStatusMessage('No se pudo cargar el Calendario de Adviento.');
        }
    }, []);

    const openDay = useCallback(async (day: number) =>
    {
        if(openingDay !== null) return;
        setOpeningDay(day);
        setStatusMessage('');
        try
        {
            const res = await fetch('/api/client/calendar/open', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ day })
            });
            const json = await res.json();
            if(json && json.success)
            {
                setStatusMessage(`Enhorabuena, has recibido: ${ json.rewardLabel }`);
                await loadCalendar();
            }
            else if(json?.error)
            {
                setStatusMessage(json.error);
            }
        }
        catch
        {
            setStatusMessage('Error al abrir el regalo. Inténtalo de nuevo.');
        }
        finally
        {
            setOpeningDay(null);
        }
    }, [ loadCalendar, openingDay ]);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const value = url.split('/');

                if(value.length < 2) return;

                switch(value[1])
                {
                    case 'calendar':
                        setStatusMessage('');
                        setCalendarOpen(true);
                        loadCalendar();
                        break;
                }
            },
            eventUrlPrefix: 'openView/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [ loadCalendar ]);

    if(!isCalendarOpen) return null;

    return (
        <CalendarView
            onClose={ () => setCalendarOpen(false) }
            title={ calendarData?.title || 'Calendario de Adviento Navidad 2026' }
            subtitle={ calendarData?.subtitle || 'Del 1 al 25 de diciembre de 2026 en Habbten' }
            currentDay={ calendarData?.currentDay ?? 0 }
            totalDays={ calendarData?.totalDays || 25 }
            days={ calendarData?.days || [] }
            openingDay={ openingDay }
            statusMessage={ statusMessage }
            onOpenDay={ openDay }
        />
    );
};
